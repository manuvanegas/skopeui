import {
  METADATA_ENDPOINT,
  TIMESERIES_SUBMIT_ENDPOINT,
  TIMESERIES_STATUS_ENDPOINT,
  TIMESERIES_REFINE_ENDPOINT,
} from "../store/modules/constants";
import { extractYear } from "../store/stats";
import {
  datasetsFromMetadata,
  UnsupportedMetadataVersionError,
} from "../utils/metadataResponse";
import { useAnalysisStore } from "../stores/analysis";
import { useDatasetStore } from "../stores/dataset";
import { useMetadataStore } from "../stores/metadata";
import { usePersistenceStorage } from "./usePersistenceStorage";
import _ from "lodash";

async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const responseData = await response
      .json()
      .catch(() => ({ detail: [{ msg: response.statusText }] }));
    const error = new Error(
      `Request failed with status ${response.status}`,
    ) as Error & {
      response?: { status: number; data: unknown; retryAfter?: number };
    };
    error.response = {
      status: response.status,
      data: responseData,
      retryAfter: Number(response.headers.get("Retry-After")) || undefined,
    };
    throw error;
  }

  return response.json();
}

// The API runs a limited number of extractions at once and refuses more with
// 503 and Retry-After. Keep trying for about a minute before giving up. The
// browser can read Retry-After only if the API exposes it; otherwise 5s.
const CAPACITY_RETRY_SECONDS = 5;
const CAPACITY_WAIT_LIMIT_MS = 60_000;

// /analyze statuses that mean the cached extraction can't be used.
const RESUBMIT_STATUSES = [404, 409, 422];

export function useLegacyStoreActions() {
  const metadataStore = useMetadataStore();
  const datasetStore = useDatasetStore();
  const analysisStore = useAnalysisStore();
  const persistenceStorage = usePersistenceStorage();

  // Fetched on every page change, not cached, so a UI left open across an API
  // deploy notices a changed schema version on its next navigation (CUT-001).
  async function loadAllDatasetMetadata() {
    const response = await requestJson(METADATA_ENDPOINT);
    try {
      metadataStore.setAllDatasetMetadata(datasetsFromMetadata(response));
    } catch (error) {
      if (error instanceof UnsupportedMetadataVersionError) {
        metadataStore.setUpdateRequired();
      }
      throw error;
    }
  }

  async function initializeDataset(
    metadataId: string,
    variableId?: string | null,
  ) {
    // Already loaded (moving between its steps): don't wait for the metadata
    // request, which can sit behind a running extraction and held up the next
    // page. Still send it, so a changed API is noticed (CUT-001); a version
    // mismatch flags the update screen, and other failures can wait for the
    // next page.
    if (metadataId === (datasetStore.metadata as any)?.id) {
      loadAllDatasetMetadata().catch(() => undefined);
      return;
    }

    await loadAllDatasetMetadata();

    const datasetMetadata = metadataStore.find(metadataId);
    if (datasetMetadata == null) {
      if (typeof window !== "undefined") {
        alert(
          "Please try again later, we were unable to locate dataset metadata for " +
            metadataId,
        );
      }
      return;
    }

    datasetStore.setMetadata(datasetMetadata);

    // The variables arrive sorted by `order`, so the first is the fallback.
    const incomingVariableId =
      variableId ??
      datasetMetadata.default_variable ??
      datasetMetadata.variables[0]?.id;

    if (incomingVariableId != null) {
      datasetStore.setVariable(incomingVariableId);
    }

    if (typeof window !== "undefined") {
      initializeDatasetGeoJson();
    }
  }

  function initializeDatasetGeoJson() {
    if (datasetStore.hasGeoJson) {
      return;
    }
    const geoJson = persistenceStorage.get(datasetStore.geoJsonKey) || null;
    datasetStore.setGeoJson(geoJson);
  }

  // Results for one study area must not survive a change of area: drop the
  // plots, the statistics and the cached extractions.
  function clearResults() {
    datasetStore.clearJobIds();
    datasetStore.clearTimeSeries();
    analysisStore.clear();
  }

  function clearGeoJson() {
    persistenceStorage.remove(datasetStore.geoJsonKey);
    datasetStore.clearGeoJson();
    clearResults();
  }

  function saveGeoJson(geoJson: unknown) {
    persistenceStorage.set(datasetStore.geoJsonKey, geoJson);
    datasetStore.setGeoJson(geoJson);
    clearResults();

    if (!_.isEmpty(analysisStore.requestData)) {
      analysisStore.setGeoJson(geoJson);
    }
  }

  function loadRequestData(requestData: Record<string, any>) {
    datasetStore.setTemporalRange([
      extractYear(requestData.time_range.gte),
      extractYear(requestData.time_range.lte),
    ]);
    datasetStore.setGeoJson(requestData.selected_area);
    analysisStore.setRequestData(requestData);
  }

  async function submitTimeSeriesRequest(requestData: Record<string, any>) {
    const deadline = Date.now() + CAPACITY_WAIT_LIMIT_MS;
    for (;;) {
      try {
        const result = await requestJson(TIMESERIES_SUBMIT_ENDPOINT, {
          method: "POST",
          body: JSON.stringify(requestData),
        });
        return result.job_id as string;
      } catch (error: any) {
        const waitMs =
          (error.response?.retryAfter ?? CAPACITY_RETRY_SECONDS) * 1000;
        if (error.response?.status !== 503 || Date.now() + waitMs > deadline) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  async function pollTimeSeriesStatus(jobId: string) {
    const statusUrl = `${TIMESERIES_STATUS_ENDPOINT}/${jobId}`;
    let result = await requestJson(`${statusUrl}`);
    const timeoutSeconds = 60;
    const deadline = Date.now() + timeoutSeconds * 1000;

    while (
      result.status !== "SUCCESS" &&
      result.status !== "FAILED" &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      result = await requestJson(`${statusUrl}`);
    }

    if (result.status === "SUCCESS") {
      return result;
    }
    if (result.status === "FAILED") {
      const error = new Error(
        `Request failed with status ${result.status}`,
      ) as Error & {
        response?: { status: number; data: unknown };
      };
      const failMsg: string =
        result.error ?? result.detail ?? "Analysis job failed";
      error.response = {
        status: 500,
        data: { detail: [{ msg: failMsg }] },
      };
      throw error;
    }
    // implicit else: deadline exceeded
    const error = new Error("Request timed out") as Error & {
      response?: { status: number; data: unknown };
    };
    error.response = {
      status: 504,
      data: {
        detail: [
          {
            msg:
              "Request timed out after waiting for " +
              timeoutSeconds +
              " seconds",
          },
        ],
      },
    };
    throw error;
  }

  async function refineTimeSeriesAnalysis(
    jobId: string,
    requestData: Record<string, any>,
  ) {
    const requestPayload = {
      extraction_id: jobId,
      zonal_statistic: requestData.zonal_statistic,
      transform: requestData.transform,
      requested_series_options: requestData.requested_series_options,
      time_range: requestData.time_range,
    };
    return await requestJson(TIMESERIES_REFINE_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(requestPayload),
    });
  }

  async function resolveTimeSeries(
    existingJobId: string | undefined,
    requestData: Record<string, any>,
  ) {
    if (existingJobId) {
      try {
        const response = await refineTimeSeriesAnalysis(
          existingJobId,
          requestData,
        );
        return { newJobId: existingJobId, response: response };
      } catch (error: any) {
        const status = error.response?.status;
        if (!RESUBMIT_STATUSES.includes(status)) {
          throw error;
        }
        // Incomplete: usually still running, started by the page just left.
        // Wait for it; a second extraction is refused while one runs (503).
        if (status === 409) {
          try {
            await pollTimeSeriesStatus(existingJobId);
            const response = await refineTimeSeriesAnalysis(
              existingJobId,
              requestData,
            );
            return { newJobId: existingJobId, response: response };
          } catch (pollError: any) {
            // Only a failed extraction is worth submitting again.
            if (pollError.response?.status !== 500) throw pollError;
          }
        }
      }
    }
    // No usable extraction: none yet, expired (404), failed (409) or
    // unusable (422). Clients may resubmit stale jobs (skope-api ADR 0005).
    const newJobId = await submitTimeSeriesRequest(requestData);
    // Known from submission on, so another page can wait for this extraction
    // instead of starting its own.
    if (requestData.variable_id) {
      datasetStore.setJobId(requestData.variable_id, newJobId);
    }
    const response = await pollTimeSeriesStatus(newJobId);
    const result = response.result;
    return { newJobId, response: result };
  }

  return {
    loadAllDatasetMetadata,
    initializeDataset,
    initializeDatasetGeoJson,
    clearGeoJson,
    saveGeoJson,
    loadRequestData,
    resolveTimeSeries,
  };
}
