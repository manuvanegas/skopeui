import {
  METADATA_ENDPOINT,
  TIMESERIES_SUBMIT_ENDPOINT,
  TIMESERIES_STATUS_ENDPOINT,
  TIMESERIES_REFINE_ENDPOINT,
} from "../store/modules/constants"; 
import { extractYear } from "../store/stats";
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
    const error = new Error(`Request failed with status ${response.status}`) as Error & {
      response?: { status: number; data: unknown };
    };
    error.response = {
      status: response.status,
      data: responseData,
    };
    throw error;
  }

  return response.json();
}

export function useLegacyStoreActions() {
  const metadataStore = useMetadataStore();
  const datasetStore = useDatasetStore();
  const analysisStore = useAnalysisStore();
  const persistenceStorage = usePersistenceStorage();

  async function loadAllDatasetMetadata() {
    if (!metadataStore.shouldRefresh) {
      return;
    }
    const allDatasetMetadata = await requestJson(METADATA_ENDPOINT);
    metadataStore.setAllDatasetMetadata(allDatasetMetadata as any[]);
    metadataStore.setLastRefreshed();
  }

  async function initializeDataset(
    metadataId: string,
    variableId?: string | null
  ) {
    await loadAllDatasetMetadata();

    if (metadataId === (datasetStore.metadata as any)?.id) {
      return;
    }

    const datasetMetadata = metadataStore.find(metadataId);
    if (datasetMetadata == null) {
      if (typeof window !== "undefined") {
        alert(
          "Please try again later, we were unable to locate dataset metadata for " +
            metadataId
        );
      }
      return;
    }

    datasetStore.setMetadata(datasetMetadata);

    const incomingVariableId =
      variableId == null ? (datasetMetadata as any).variables?.[0]?.id : variableId;

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

  function clearGeoJson() {
    persistenceStorage.remove(datasetStore.geoJsonKey);
    datasetStore.clearGeoJson();
  }

  function saveGeoJson(geoJson: unknown) {
    persistenceStorage.set(datasetStore.geoJsonKey, geoJson);
    datasetStore.setGeoJson(geoJson);
    datasetStore.clearJobIds();
    datasetStore.clearTimeSeries();

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
    const result = await requestJson(TIMESERIES_SUBMIT_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(requestData),
    });
    return result.job_id as string;
  }

  async function pollTimeSeriesStatus(jobId: string) {
    const statusUrl = `${TIMESERIES_STATUS_ENDPOINT}/${jobId}`;
    let result = await requestJson(`${statusUrl}`);
    const timeoutSeconds = 60;
    const deadline = Date.now() + timeoutSeconds * 1000;

    while (result.status !== "SUCCESS" && result.status !== "FAILED" && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      result = await requestJson(`${statusUrl}`);
    }

    if (result.status === "SUCCESS") {
      return result;
    }
    if (result.status === "FAILED") {
      const error = new Error(`Request failed with status ${result.status}`) as Error & {
        response?: { status: number; data: unknown };
      };
      const failMsg: string = result.error ?? result.detail ?? "Analysis job failed";
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
      data: { detail: [{ msg: "Request timed out after waiting for " + timeoutSeconds + " seconds" }] },
    };
    throw error;
  }

  async function refineTimeSeriesAnalysis(jobId: string, requestData: Record<string, any>) {
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

  async function resolveTimeSeries(existingJobId: string | undefined, requestData: Record<string, any>) {
    if (existingJobId) {
      try {
        const response = await refineTimeSeriesAnalysis(existingJobId, requestData);
        return {newJobId: existingJobId, response: response};
      } catch (error: any) {
        if (error.response?.status !== 404 && error.response?.status !== 422) {
          throw error;
        }
      }
    }
    // if no existing job or error status is 404 or 422 (job if not found or invalid), submit a new request
    const newJobId = await submitTimeSeriesRequest(requestData);
    const response = await pollTimeSeriesStatus(newJobId);
    const result = response.result;
    return {newJobId, response: result};
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
