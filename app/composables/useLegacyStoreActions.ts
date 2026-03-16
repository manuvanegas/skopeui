import { METADATA_ENDPOINT } from "../store/modules/constants";
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

  return {
    loadAllDatasetMetadata,
    initializeDataset,
    initializeDatasetGeoJson,
    clearGeoJson,
    saveGeoJson,
    loadRequestData,
  };
}
