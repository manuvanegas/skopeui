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
        <Map :year="yearSelected" :display-raster="true" map-engine="maplibre" />
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
import { useMessagesStore } from "@/stores/messages";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";

definePageMeta({
  layout: "default",
  key: (route: any) => route.fullPath,
});

const route = useRoute();
const appStore = useAppStore();
const datasetStore = useDatasetStore();
const analysisStore = useAnalysisStore();
const messageStore = useMessagesStore();
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

async function updateTimeSeries(data: any) {
  if (!datasetStore.canHandleTimeSeriesRequest) {
    datasetStore.setTimeSeriesNoArea();
    return;
  }
  datasetStore.setTimeSeriesLoading();
  try {
    const varId = route.params.variable as string;
    console.log("Requesting time series with varId:", varId);
    const jobId = datasetStore.jobIds?.[varId];
    // console.log("Requesting time series with data:", data, "and jobId:", jobId);
    const {newJobId, response} = await legacyActions.resolveTimeSeries(jobId, data);
    datasetStore.setJobId(varId, newJobId);
    const originalSeries = response.series[0];
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
      numberOfCells: response.n_cells,
      totalCellArea: response.area,
    });
    datasetStore.setTimeSeriesLoaded();
  } catch (e: any) {
    datasetStore.clearTimeSeries();
    if (e.response) {
      const { status, data: responseData } = e.response;
      const detail = Array.isArray(responseData.detail)
      ? responseData.detail
      : [{ msg: responseData.detail }];
      if (status === 504) datasetStore.setTimeSeriesTimeout();
      else if (status >= 500) datasetStore.setTimeSeriesServerError(detail);
      else if (status >= 400) datasetStore.setTimeSeriesBadRequest(detail);
    } else {
      messageStore.error(e.message || "An unknown error occurred while retrieving analysis results. Please go back to the Select Area and try again.");
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
    yearSelected.value = datasetStore.temporalRangeMin;
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
