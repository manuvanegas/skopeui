<template>
  <v-container fluid class="fill-height align-start">
    <LoadingSpinner v-if="isLoadingMetadata" />
    <template v-else>
    <v-row no-gutters>
      <v-col class="pa-0 ma-0">
        <SubHeader :select-variable="true">
          <v-btn
            :disabled="!hasValidStudyArea"
            :to="analyzeLocation"
            color="accent"
            variant="flat"
          >
            Analyze Data
            <v-icon class="ml-2" size="small"> mdi-chevron-right </v-icon>
          </v-btn>
        </SubHeader>
      </v-col>
    </v-row>
    <v-row class="pa-0 mb-6" no-gutters>
      <!-- 2 column layout with map and time series-->
      <v-col
        class="d-flex map-flex pa-0 mb-3"
        lg="6"
        md="12"
        sm="12"
        align-self="stretch"
      >
        <Map :year="yearSelected" :display-raster="false" map-engine="maplibre" />
      </v-col>
      <!-- time series plot -->
      <v-col
        class="d-flex map-flex pa-0"
        lg="6"
        md="12"
        sm="12"
        align-self="stretch"
      >
        <TimeSeriesPlot
          :show-area="true"
          :show-step-controls="true"
          :traces="traces"
          :year-selected="yearSelected"
          @year-selected="setYear"
        />
      </v-col>
    </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import Map from "@/components/dataset/Map.client.vue";
import TimeSeriesPlot from "@/components/dataset/TimeSeriesPlot.vue";
import SubHeader from "@/components/dataset/SubHeader.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import _ from "lodash";
import { extractYear } from "@/store/stats";
import { useAppStore } from "@/stores/app";
import { useDatasetStore } from "@/stores/dataset";
import { useAnalysisStore } from "@/stores/analysis";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";

definePageMeta({
  layout: "default",
  key: (route: any) => route.fullPath,
});

const route = useRoute();
const appStore = useAppStore();
const datasetStore = useDatasetStore();
const analysisStore = useAnalysisStore();
const legacyActions = useLegacyStoreActions();

const yearSelected = ref(1500);
let stopTimeSeriesWatch: (() => void) | null = null;

const hasValidStudyArea = computed(() => datasetStore.hasGeoJson);
const analyzeLocation = computed(() => ({
  name: "dataset-id-analyze-variable",
  params: { id: route.params.id, variable: route.params.variable },
}));
const isLoadingMetadata = computed(() => datasetStore.metadata == null);
const traces = computed(() => [{ ...datasetStore.filteredTimeSeries(), type: "scatter" }]);

function setYear(year: number) {
  yearSelected.value = year;
}

async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const responseData = await response
      .json()
      .catch(() => ({ detail: [{ msg: response.statusText }] }));
    const error: any = new Error(`Request failed with status ${response.status}`);
    error.response = { status: response.status, data: responseData };
    throw error;
  }
  return response.json();
}

async function updateTimeSeries(data: any) {
  if (!datasetStore.canHandleTimeSeriesRequest) {
    datasetStore.setTimeSeriesNoArea();
    return;
  }
  datasetStore.setTimeSeriesLoading();
  try {
    const jobId = await legacyActions.submitTimeSeriesRequest(data);
    const resultsBundle = await legacyActions.pollTimeSeriesStatus(jobId);
    analysisStore.setJobId(jobId);
    const originalSeries = resultsBundle.result.series[0];
    const timeSeries = {
      x: _.range(
        extractYear(originalSeries.time_range.gte),
        extractYear(originalSeries.time_range.lte) + 1
      ),
      y: originalSeries.values,
      options: originalSeries.options,
    };
    datasetStore.setTimeSeries({
      timeSeries,
      numberOfCells: resultsBundle.result.n_cells,
      totalCellArea: resultsBundle.result.area,
    });
    datasetStore.setTimeSeriesLoaded();
  } catch (e: any) {

    console.error("updateTimeSeries caught:", e); 

    datasetStore.clearTimeSeries();
    if (e.response) {
      const { status, data: responseData } = e.response;
      const detail = Array.isArray(responseData.detail)
      ? responseData.detail
      : [{ msg: responseData.detail }];
      if (status === 504) datasetStore.setTimeSeriesTimeout();
      else if (status >= 500) datasetStore.setTimeSeriesServerError(detail || []);
      else if (status >= 400) datasetStore.setTimeSeriesBadRequest(detail || []);
    } else {
      datasetStore.setTimeSeriesTimeout();
    }
  }
}

async function loadTimeSeries() {
  if (datasetStore.canHandleTimeSeriesRequest) {
    await updateTimeSeries(datasetStore.timeSeriesRequestData);
  }
}

await useAsyncData(
  `visualize-${route.params.id}-${route.params.variable}`,
  async () => {
    await legacyActions.initializeDataset(
      route.params.id as string,
      route.params.variable as string
    );
    return true;
  },
  { server: false }
);

onMounted(() => {
  legacyActions.initializeDatasetGeoJson();
  stopTimeSeriesWatch = watch(
    () => datasetStore.timeSeriesRequestData,
    async (data) => {
      if (data) {
        await updateTimeSeries(data);
      } else {
        await loadTimeSeries();
      }
    },
    { immediate: true }
  );
  yearSelected.value = datasetStore.temporalRangeMin;
  appStore.setVisited();
});

onUnmounted(() => {
  stopTimeSeriesWatch?.();
});
</script>

<style scoped>
.map-flex {
  height: calc(85vh - 96px);
}

@media all and (max-width: 960px) {
  .map-flex {
    height: 450px;
  }
}

@media all and (max-width: 600px) {
  .map-flex {
    height: 450px;
  }
}
</style>
