<template>
  <v-container fluid class="fill-height align-start">
    <LoadingSpinner v-if="isLoadingMetadata"></LoadingSpinner>
    <template v-else>
      <v-row no-gutters>
        <v-col>
          <SubHeader :select-variable="true">
            <v-btn color="accent" variant="flat" @click="exportData">
              Download
              <v-icon class="ml-2" size="small">mdi-download</v-icon>
            </v-btn>
          </SubHeader>
        </v-col>
      </v-row>
      <v-row>
        <!-- time series -->
        <v-col class="timeseries-flex" cols="12" lg="8">
          <TimeSeriesPlot
            ref="plot"
            :show-area="true"
            :show-step-controls="false"
            :traces="traces"
            :y-axis-label="yAxisLabel"
            @selected-temporal-range="updateTimeSeries"
          />
        </v-col>
        <!-- analysis form -->
        <v-col cols="12" lg="4" class="stats-form">
          <v-form
            ref="analysisRequestForm"
            v-model="analysisFormValid"
            class="pa-3 bg-grey-lighten-3"
            :class="{ 'mt-10': mdAndDown }"
          >
            <span class="subtitle">Statistics for the Temporal Interval</span>
            <v-data-table
              density="compact"
              :items-per-page="-1"
              :headers="statisticsHeaders"
              hide-default-footer
              :items="summaryStatistics"
            />
            <v-select
              v-model="zonalStatistic"
              class="mt-3"
              :items="zonalStatisticOptions"
              item-color="primary"
              item-title="label"
              item-value="id"
              label="For each time step, summarize selected area as"
              hint="Summary value of all selected pixels at each time step"
              :disabled="!isStudyAreaPolygon"
            />
            <!-- /////////// TRANSFORMATION OPTIONS /////////// -->
            <v-select
              v-model="transformOption"
              :items="transformOptions"
              color="secondary"
              item-color="secondary"
              item-title="label"
              item-value="id"
              label="Select a transformation option"
              :hint="transformHint(transformOption)"
            />
            <template v-if="transformOption !== 'none'">
              <v-row
                v-if="transformOption === 'zscoreFixed'"
                align="baseline"
                justify="start"
                no-gutters
                class="mt-2"
              >
                <v-col class="mr-5">
                  <v-text-field
                    v-model="timeRange.lb.year"
                    density="compact"
                    variant="outlined"
                    label="Year (Lower Bound)"
                    type="number"
                    :rules="[validateMinYear]"
                  />
                </v-col>
                <v-col>
                  <v-text-field
                    v-model="timeRange.ub.year"
                    density="compact"
                    variant="outlined"
                    label="Year (Upper Bound)"
                    type="number"
                    :rules="[validateMaxYear]"
                  />
                </v-col>
              </v-row>
              <v-text-field
                v-if="transformOption === 'zscoreMoving'"
                v-model="zScoreMovingIntervalTimeSteps"
                density="compact"
                label="Transform window"
                variant="outlined"
                class="mt-2"
                suffix="time steps"
                type="number"
              />
            </template>
            <v-select
              v-model="smoothingOption"
              :items="smoothingOptions"
              color="primary"
              item-color="secondary"
              item-title="label"
              item-value="id"
              label="Select a smoothing option"
              :hint="smoothingHint(smoothingOption)"
              class="mt-3"
            />
            <v-text-field
              v-if="hasSmoothingOption"
              v-model="smoothingTimeStep"
              density="compact"
              variant="outlined"
              class="mt-2"
              label="Smoothing window"
              suffix="time steps"
              type="number"
              :rules="[validateSmoothingWidth]"
            />
            <v-row>
              <v-col>
                <v-btn @click="clearTransformedTimeSeries">Clear</v-btn>
              </v-col>
              <v-col align="end">
                <v-btn
                  :disabled="!analysisFormValid"
                  class="font-weight-bold"
                  color="accent"
                  @click="updateTimeSeries"
                  >Update
                </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import TimeSeriesPlot from "@/components/dataset/TimeSeriesPlot.vue";
import SubHeader from "@/components/dataset/SubHeader.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import { toISODate, extractYear } from "@/store/stats";
import {
  buildReadme,
  DEFAULT_CENTERED_SMOOTHING_WIDTH,
  SMOOTHING_OPTIONS,
  TRANSFORM_OPTIONS,
} from "@/store/modules/constants";
import { useAnalysisStore } from "@/stores/analysis";
import { useDatasetStore } from "@/stores/dataset";
import { useMessagesStore } from "@/stores/messages";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import _ from "lodash";
import JSZip from "jszip";
import Papa from "papaparse";

definePageMeta({ layout: "default" });

const route = useRoute();
const { mdAndDown } = useDisplay();
const analysisStore = useAnalysisStore();
const datasetStore = useDatasetStore();
const messageStore = useMessagesStore();
const legacyActions = useLegacyStoreActions();
const { $download } = useNuxtApp() as any;

const plot = ref<any>(null);
const zScoreMovingIntervalTimeSteps = ref(25);
const analysisFormValid = ref(true);
const zonalStatistic = ref("mean");
const yAxisLabel = ref<string | null>(null);
const smoothingOption = ref("none");
const smoothingTimeStep = ref(DEFAULT_CENTERED_SMOOTHING_WIDTH);
const transformOption = ref("none");
const timeRange = ref({ lb: { year: 1500, month: 1 }, ub: { year: 1800, month: 1 } });

const zonalStatisticOptions = [
  { label: "Mean of its pixels", id: "mean" },
  { label: "Median of its pixels", id: "median" },
];
const statisticsHeaders = [
  { title: "Series", align: "start", key: "name" },
  { title: "Mean", key: "mean" },
  { title: "Median", key: "median" },
  { title: "Standard Deviation", key: "stdev" },
];
const transformOptions = TRANSFORM_OPTIONS;
const smoothingOptions = SMOOTHING_OPTIONS;

// Proxy that forwards property reads/writes to the composition API refs,
// compatible with the analyzeVue interface expected by SMOOTHING_OPTIONS /
// TRANSFORM_OPTIONS toRequestData / fromRequestData functions.
const analyzeVue: any = {
  get smoothingOption() { return smoothingOption.value; },
  set smoothingOption(v) { smoothingOption.value = v; },
  get smoothingTimeStep() { return smoothingTimeStep.value; },
  set smoothingTimeStep(v) { smoothingTimeStep.value = v; },
  get transformOption() { return transformOption.value; },
  set transformOption(v) { transformOption.value = v; },
  get timeRange() { return timeRange.value; },
  set timeRange(v) { timeRange.value = v; },
  // snake_case alias used in some fromRequestData implementations
  get time_range() { return timeRange.value; },
  set time_range(v) { timeRange.value = v; },
  get zScoreMovingIntervalTimeSteps() { return zScoreMovingIntervalTimeSteps.value; },
  set zScoreMovingIntervalTimeSteps(v) { zScoreMovingIntervalTimeSteps.value = v; },
};

const metadata = computed(() => datasetStore.metadata);
const isLoadingMetadata = computed(() => metadata.value == null);
const temporalRange = computed(() => datasetStore.temporalRange);
const minYear = computed(() => datasetStore.minYear);
const maxYear = computed(() => datasetStore.maxYear);
const studyAreaGeoJson = computed(() => datasetStore.geoJson);
const hasSmoothingOption = computed(() => smoothingOption.value !== "none");
const hasTransformOption = computed(() => transformOption.value !== "none");
const isStudyAreaPolygon = computed(() => {
  const geojson = studyAreaGeoJson.value as any;
  if (!geojson) return false;
  const polygons = ["Polygon", "MultiPolygon"];
  switch (geojson.type) {
    case "Polygon":
    case "MultiPolygon":
      return true;
    case "Feature":
      return polygons.includes(geojson.geometry.type);
    case "FeatureCollection":
      for (const feature of geojson.features) {
        if (polygons.includes(feature.geometry.type)) return true;
      }
      return false;
    default:
      return false;
  }
});
const summaryStatistics = computed(() => {
  if (analysisStore.summaryStatistics.length === 0) {
    return [datasetStore.summaryStatistics];
  }
  return analysisStore.summaryStatistics;
});
const traces = computed(() => {
  const timeseries = analysisStore.timeseries;
  const transformed = timeseries.map((ts: any) => ({ ...ts, type: "scatter" }));
  if (transformed.length > 0) return transformed;
  return [{ ...datasetStore.filteredTimeSeries(), type: "scatter", name: "Original" }];
});
const smoothingFunction = computed(() => {
  const option = smoothingOptions.find((x: any) => x.id === smoothingOption.value) as any;
  return option?.toRequestData(analyzeVue);
});
const transformRequestData = computed(() => {
  const option = transformOptions.find((x: any) => x.id === transformOption.value) as any;
  return option?.toRequestData(analyzeVue);
});
const requestedSeriesOptions = computed(() => {
  const series: any[] = [
    { name: hasTransformOption.value ? "Transformed" : "Original", smoother: { type: "NoSmoother" } },
  ];
  if (hasSmoothingOption.value) {
    series.push({ name: "Smoothed", smoother: smoothingFunction.value });
  }
  return series;
});

function transformHint(transform: string) {
  switch (transform) {
    case "zscoreFixed":   return "Displays Z-score transformed values relative to a fixed interval selected by the user";
    case "zscoreMoving":  return "Displays Z-score transformed values relative to a moving window of a size (N time steps) selected by the user";
    case "zscoreSelected": return "Displays Z-score transformed values using the selected interval";
    default:              return "Modeled values are graphed without any transformation";
  }
}

function smoothingHint(smooth: string) {
  switch (smooth) {
    case "centeredAverage": return `Plots the ${zonalStatistic.value} of the current years and the previous and successive (N-1)/2 years where N = odd window width`;
    case "trailingAverage": return `Plots the ${zonalStatistic.value} of the current year and the N-1 preceding years where N = window width`;
    default: return "No smoothing the summary values for a given year are graphed";
  }
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

async function retrieveAnalysis(data: any) {
  if (Object.values(data).some((v) => v == undefined)) return;
  datasetStore.setGeoJson(data.selected_area);
  datasetStore.setTemporalRange([
    extractYear(data.time_range.gte),
    extractYear(data.time_range.lte),
  ]);
  analysisStore.setWaitingForResponse(true);
  try {
    const baselineMissingMessage = "Baseline time series data missing. Please go back to the Select Area page to load the data first.";
    const jobId = analysisStore.jobId;
    let response;
    if (jobId) {
      response = await legacyActions.refineTimeSeriesAnalysis(jobId, data);
    } else{
      throw new Error(baselineMissingMessage);
    }
    analysisStore.setResponse(response);
  } catch (e: any) {
    if (e.response) {
      const { status, data: responseData } = e.response;
      const detail = Array.isArray(responseData.detail)
      ? responseData.detail
      : [{ msg: responseData.detail }];
      if (status === 404 || status === 422) {
        messageStore.error(baselineMissingMessage);
      } else if (status === 504) {
        messageStore.error("The analysis request timed out. Please try adjusting the parameters to reduce the size of the request, or try again later when the server load is lower.");
      }
      else if (status >= 500) {
        messageStore.error("An error occurred on the server while processing the analysis request. Please try again later.");
      }
    } else {
      messageStore.error(e.message || "An unknown error occurred while retrieving analysis results.");
    }
  } finally {
    analysisStore.setWaitingForResponse(false);
  }
}

function initializeRequestData() {
  const incoming: any = { ...datasetStore.defaultApiRequestData };
  const existing = analysisStore.requestData as any;
  if (existing?.transform) incoming.transform = existing.transform;
  if (existing?.zonal_statistic) incoming.zonal_statistic = existing.zonal_statistic;
  if (existing?.requested_series_options) incoming.requested_series_options = existing.requested_series_options;
  analysisStore.setDefaultRequestData(incoming);
  return incoming;
}

function loadTransformOption(transform: any) {
  if (!transform) return;
  const option = transformOptions.find((x: any) => x.type === transform.type) as any;
  if (option) option.fromRequestData(analyzeVue, transform);
}

function loadSmoothingOption(requestedSeriesOptions: any[]) {
  const smoothed = requestedSeriesOptions?.find((x: any) => x.name === "Smoothed");
  if (smoothed) {
    const option = smoothingOptions.find((x: any) => x.method === smoothed.smoother.method) as any;
    if (option) option.fromRequestData(analyzeVue, smoothed.smoother);
  }
}

async function initializeFormData(requestData: any) {
  if (!requestData) return;
  zonalStatistic.value = requestData.zonal_statistic ?? zonalStatistic.value;
  loadSmoothingOption(requestData.requested_series_options ?? []);
  loadTransformOption(requestData.transform);
}

function clearTransformedTimeSeries() {
  smoothingOption.value = "none";
  transformOption.value = "none";
  analysisStore.setDefaultRequestData(datasetStore.defaultApiRequestData);
}

function tracesAsArrayOfObjects() {
  const rows: any[] = [];
  for (const trace of traces.value) {
    for (let i = 0; i < trace.x.length; i++) {
      rows.push({ name: trace.name, x: trace.x[i], y: trace.y[i] });
    }
  }
  return rows;
}

async function exportData() {
  const stats = summaryStatistics.value.map((s: any) =>
    _.mapValues(s, (v: any) => { const f = parseFloat(v); return _.isNaN(f) ? v : f; })
  );
  const plotImages = await plot.value?.getTimeSeriesPlotImage();
  const png = await fetch(plotImages.png);
  const svg = await fetch(plotImages.svg);
  const geoJson = studyAreaGeoJson.value;
  const requestData = analysisStore.requestData as any;
  const zip = new JSZip();
  zip.file("skope-request.json", JSON.stringify(requestData));
  zip.file("summary-statistics.json", JSON.stringify(stats));
  zip.file("time-series.json", JSON.stringify(traces.value));
  zip.file("time-series.csv", Papa.unparse(tracesAsArrayOfObjects()));
  zip.file("plot.png", await png.blob());
  zip.file("plot.svg", await svg.blob());
  zip.file("study-area.geojson", JSON.stringify(geoJson));
  zip.file("README.md", buildReadme(requestData));
  const content = await zip.generateAsync({ type: "blob" });
  $download.saveAs(content, `${requestData.dataset_id}_${requestData.variable_id}.zip`);
}

async function updateTimeSeries() {
  if (!analysisFormValid.value || analysisStore.waitingForResponse) return;
  const requestData = {
    ...datasetStore.defaultApiRequestData,
    zonal_statistic: zonalStatistic.value,
    transform: transformRequestData.value,
    time_range: {
      gte: toISODate(temporalRange.value[0]),
      lte: toISODate(temporalRange.value[1]),
    },
    requested_series_options: requestedSeriesOptions.value,
  };
  analysisStore.setRequestData(requestData);
}

function validateMinYear(year: number) {
  if (year < minYear.value) return `Please enter a min year > ${minYear.value}`;
  if (year > maxYear.value) return `Please enter a min year <= ${maxYear.value}`;
  return true;
}

function validateMaxYear(year: number) {
  if (year < minYear.value) return `Please enter a max year > ${minYear.value}`;
  if (year > maxYear.value) return `Please enter a max year <= ${maxYear.value}`;
  return true;
}

function validateSmoothingWidth(windowSize: number) {
  if (smoothingOption.value === "trailingAverage") return true;
  if (windowSize % 2 === 0) return "Please enter an odd window size";
  return true;
}

watch(() => analysisStore.requestData, async (data) => {
  if (!data) return;
  await initializeFormData(data);
  await retrieveAnalysis(data as any);
  if (hasTransformOption.value) {
    yAxisLabel.value = (transformOptions.find((x: any) => x.id === transformOption.value) as any)?.label ?? null;
  } else {
    yAxisLabel.value = "";
  }
});

await useAsyncData(
  `analyze-${route.params.id}-${route.params.variable}`,
  async () => {
    await legacyActions.initializeDataset(
      route.params.id as string,
      route.params.variable as string
    );
    timeRange.value.lb.year = datasetStore.minYear;
    timeRange.value.ub.year = datasetStore.maxYear;
    return true;
  },
  { server: false }
);

onMounted(async () => {
  legacyActions.initializeDatasetGeoJson();
  analysisStore.setGeoJson(datasetStore.geoJson as any);
  const requestData = initializeRequestData();
  await initializeFormData(requestData);
});
</script>

<style scoped>
.timeseries-flex {
  height: calc(85vh - 96px);
}

.subtitle {
  color: #596d7b;
  font-size: 1.5rem;
}
</style>
