<template>
  <v-card variant="outlined" class="time-series-card">
    <v-card-text class="time-series-card__content">
      <div class="time-series-toolbar">
        <div v-if="showArea" class="time-series-toolbar__group time-series-toolbar__group--metrics">
          <v-tooltip location="top" text="Selected area in square kilometers">
            <template #activator="{ props }">
              <h3
                v-bind="props"
                class="font-weight-light text-center pa-2 time-series-metric"
              >
                {{ selectedAreaInSquareKm }} km<sup>2</sup>
              </h3>
            </template>
          </v-tooltip>
          <v-tooltip location="top" text="Total cell area used in this time series calculation">
            <template #activator="{ props }">
              <h3
                v-bind="props"
                class="font-weight-light text-center pa-2 time-series-metric"
              >
                {{ totalCellArea }} km<sup>2</sup> ({{ numberOfCells }} cells)
              </h3>
            </template>
          </v-tooltip>
        </div>

        <v-form
          v-model="isTemporalRangeValid"
          class="time-series-toolbar__group time-series-toolbar__range"
          @click="enableTemporalRangeEdit"
        >
          <v-text-field
            v-model.number="formTemporalRangeMin"
            class="time-series-range-field"
            label="Min Year"
            :disabled="!isTemporalRangeEditable"
            :min="minYear"
            :max="maxYear - 1"
            type="number"
            :rules="[validateMinYear]"
            @keydown.enter="setTemporalRange"
          >
            <template #append-outer>to</template>
          </v-text-field>
          <v-text-field
            v-model.number="formTemporalRangeMax"
            class="time-series-range-field"
            label="Max Year"
            :disabled="!isTemporalRangeEditable"
            :hint="timeStepsLabel"
            persistent-hint
            :min="minYear + 1"
            :max="maxYear"
            :rules="[validateMaxYear]"
            type="number"
            @keydown.enter="setTemporalRange"
          />
          <div class="time-series-range-buttons">
            <v-btn
              :disabled="!hasTemporalRangeChanges || !isTemporalRangeValid"
              size="x-small"
              color="secondary"
              @click="setTemporalRange"
            >
              Apply
            </v-btn>
            <v-btn size="x-small" color="secondary" @click="resetTemporalRange">
              Reset
            </v-btn>
          </div>
        </v-form>

        <div v-if="showStepControls" class="time-series-toolbar__group time-series-toolbar__group--actions">
          <v-tooltip location="top" text="Go to the first year of the defined temporal range">
            <template #activator="{ props }">
              <v-btn icon v-bind="props" color="accent" @click="gotoFirstYear">
                <v-icon>mdi-skip-previous</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip location="top" text="Previous year">
            <template #activator="{ props }">
              <v-btn icon v-bind="props" color="accent" @click="previousYear">
                <v-icon>mdi-chevron-left</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip location="top" :text="isAnimationPlaying ? 'Pause animation' : 'Animate layers'">
            <template #activator="{ props }">
              <v-btn icon v-bind="props" @click="togglePlay">
                <v-icon color="accent">{{ playIcon }}</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip location="top" text="Next year">
            <template #activator="{ props }">
              <v-btn icon v-bind="props" color="accent" @click="nextYear">
                <v-icon>mdi-chevron-right</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip location="top" text="Go to the last year of the defined temporal range">
            <template #activator="{ props }">
              <v-btn icon v-bind="props" color="accent" @click="gotoLastYear">
                <v-icon>mdi-skip-next</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </div>

        <div v-if="showArea" class="time-series-toolbar__group time-series-toolbar__group--actions">
          <v-tooltip location="top" text="Return to Select Area">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                :to="selectAreaLocation"
                color="accent"
                size="small"
              >
                <v-icon size="small">mdi-map-marker</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </div>

      <div class="time-series-plot-shell">
        <client-only placeholder="Loading...">
          <template v-if="timeSeriesRequestStatus.status !== 'success'">
            <v-alert
              v-for="(message, index) in timeSeriesRequestStatus.messages"
              :key="index"
              :type="message.type"
              class="mb-2"
            >
              {{ message.value }}
            </v-alert>
          </template>
          <Plotly
            ref="plotlyRef"
            class="time-series"
            :data="timeSeriesData"
            :layout="layoutMetadata"
            :options="options"
            @click="updatePlotlyYear"
          />
        </client-only>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, defineAsyncComponent } from "vue";
import _ from "lodash";
import { useRoute } from "vue-router";
import { useDatasetStore } from "@/stores/dataset";

const props = defineProps<{
  yearSelected?: number | null;
  showStepControls?: boolean;
  showArea?: boolean;
  traces?: any[];
  yAxisLabel?: string | null;
}>();

const emit = defineEmits<{
  (e: "year-selected", year: number): void;
  (e: "selected-temporal-range", range: [number, number]): void;
}>();

// Lazy-load PlotlyClient to avoid SSR issues
const Plotly = defineAsyncComponent(() => import("@/components/dataset/PlotlyClient.vue"));

const datasetStore = useDatasetStore();
const route = useRoute();

// Local state
const animationSpeed = ref(2000);
const isAnimationPlaying = ref(false);
const localTemporalRangeMin = ref(1);
const localTemporalRangeMax = ref(new Date().getFullYear());
const isTemporalRangeEditable = ref(false);
const isTemporalRangeValid = ref(false);
const plotlyRef = ref<any>(null);

// Computed
const selectedTemporalRange = computed({
  get() { return datasetStore.temporalRange; },
  set(range: [number, number]) {
    datasetStore.setTemporalRange(range);
    emit("selected-temporal-range", datasetStore.temporalRange);
  },
});

const temporalRangeMin = computed(() => datasetStore.temporalRangeMin);
const temporalRangeMax = computed(() => datasetStore.temporalRangeMax);
const timeSeriesRequestStatus = computed(() => datasetStore.timeSeriesRequestStatus);
const selectedAreaInSquareKm = computed(() => datasetStore.selectedAreaInSquareKm);
const minYear = computed(() => datasetStore.minYear);
const maxYear = computed(() => datasetStore.maxYear);
const variable = computed(() => datasetStore.variable as any);
const totalCellArea = computed(() => datasetStore.totalCellAreaInSquareKm);
const numberOfCells = computed(() => datasetStore.numberOfCells);
const timeSeriesData = computed(() => props.traces);
const hasMultipleTimeSeries = computed(() => props.traces != null && props.traces.length > 1);
const hasTimeSeries = computed(() => props.traces != null && props.traces[0]?.x?.length > 0);
const canHandleTimeSeriesRequest = computed(() => datasetStore.canHandleTimeSeriesRequest);

const formTemporalRangeMin = computed({
  get() { return isTemporalRangeEditable.value ? localTemporalRangeMin.value : selectedTemporalRange.value[0]; },
  set(value: number) { localTemporalRangeMin.value = value; },
});

const formTemporalRangeMax = computed({
  get() { return isTemporalRangeEditable.value ? localTemporalRangeMax.value : selectedTemporalRange.value[1]; },
  set(value: number) { localTemporalRangeMax.value = value; },
});

const hasTemporalRangeChanges = computed(() =>
  localTemporalRangeMin.value !== selectedTemporalRange.value[0] ||
  localTemporalRangeMax.value !== selectedTemporalRange.value[1]
);

const timeStepsLabel = computed(() => {
  const steps = selectedTemporalRange.value[1] - selectedTemporalRange.value[0] + 1;
  return `${steps} time steps`;
});

const xAxisTitle = computed(() =>
  props.yearSelected == null ? "Year" : `<b>Year ${props.yearSelected}</b>`
);

const yAxisTitle = computed(() => {
  const variableName = variable.value.name;
  return !props.yAxisLabel ? variableName : `${props.yAxisLabel}`;
});

const shapes = computed(() => {
  if (!_.isNull(props.yearSelected ?? null)) {
    return [{
      type: "line",
      x0: props.yearSelected,
      x1: props.yearSelected,
      yref: "paper",
      y0: 0,
      y1: 1,
      line: { color: "rgb(255, 140, 0)", width: 3 },
    }];
  }
  return [];
});

const layoutMetadata = computed(() => ({
  autosize: true,
  margin: { b: 60, t: 10, pad: 2 },
  showlegend: hasMultipleTimeSeries.value,
  legend: { x: 1, y: 0.5 },
  xaxis: { title: xAxisTitle.value, linewidth: 3, gridwidth: 3, automargin: true },
  yaxis: { title: yAxisTitle.value, linewidth: 3, gridwidth: 3, automargin: true },
  font: { size: 14 },
  shapes: shapes.value,
}));

const options = computed(() => ({
  displaylogo: false,
  modeBarButtonsToRemove: ["toImage"],
  responsive: true,
}));

const playIcon = computed(() =>
  isAnimationPlaying.value ? "mdi-pause-circle" : "mdi-play-circle"
);

const selectAreaLocation = computed(() => ({
  name: "dataset-id",
  params: { id: (route.params.id ?? "") as string },
}));

function getPlotlyApi() {
  const plotlyInstance = plotlyRef.value as any;
  if (!plotlyInstance) {
    return null;
  }

  if (typeof plotlyInstance.toImage === "function" || typeof plotlyInstance.update === "function") {
    return plotlyInstance;
  }

  if (plotlyInstance.$?.exposed) {
    return plotlyInstance.$.exposed;
  }

  if (plotlyInstance.$?.subTree?.component?.exposed) {
    return plotlyInstance.$.subTree.component.exposed;
  }

  return null;
}

// Methods
function enableTemporalRangeEdit() {
  if (isTemporalRangeEditable.value) return;
  localTemporalRangeMin.value = selectedTemporalRange.value[0];
  localTemporalRangeMax.value = selectedTemporalRange.value[1];
  isTemporalRangeEditable.value = true;
}

function validateMinYear(value: number) {
  if (value < minYear.value) return `Please enter a min year >= ${minYear.value}`;
  if (value >= maxYear.value) return `Please enter a min year < ${maxYear.value}`;
  return true;
}

function validateMaxYear(value: number) {
  if (value <= minYear.value) return `Please enter a max year > ${minYear.value}`;
  if (value > maxYear.value) return `Please enter a max year <= ${maxYear.value}`;
  return true;
}

function updatePlotlyYear(data: any) {
  setYear(data.points[0].x);
}

function setYear(year: number) {
  emit("year-selected", year);
}

function setTemporalRange() {
  if (!hasTemporalRangeChanges.value || !isTemporalRangeValid.value) return;
  selectedTemporalRange.value = [localTemporalRangeMin.value, localTemporalRangeMax.value];
  isTemporalRangeEditable.value = false;
  if (props.yearSelected == null) return;
  if (props.yearSelected < temporalRangeMin.value) setYear(temporalRangeMin.value);
  else if (props.yearSelected > temporalRangeMax.value) setYear(temporalRangeMax.value);
}

function resetTemporalRange() {
  localTemporalRangeMin.value = datasetStore.minYear;
  localTemporalRangeMax.value = datasetStore.maxYear;
  setTemporalRange();
}

function gotoFirstYear() {
  if (variable.value === null) return;
  setYear(temporalRangeMin.value);
}

function gotoLastYear() {
  if (variable.value === null) return;
  setYear(temporalRangeMax.value);
}

function nextYear() {
  if (variable.value === null) return;
  setYear(_.clamp(parseInt(String(props.yearSelected)) + 1, temporalRangeMin.value, temporalRangeMax.value));
}

function previousYear() {
  if (variable.value === null) return;
  setYear(_.clamp((props.yearSelected ?? 0) - 1, temporalRangeMin.value, temporalRangeMax.value));
}

function advanceAnimation() {
  if (!isAnimationPlaying.value) return;
  if ((props.yearSelected ?? 0) >= temporalRangeMax.value) {
    isAnimationPlaying.value = false;
    return;
  }
  nextYear();
}

function togglePlay() {
  isAnimationPlaying.value = !isAnimationPlaying.value;
  if (isAnimationPlaying.value) {
    advanceAnimation();  // kick off first step; map drives the rest via advanceAnimation()
  }
}

async function getTimeSeriesPlotImage() {
  const plotlyApi = getPlotlyApi();
  const svg = await plotlyApi?.toImage({ format: "svg", height: 600, width: 1200 });
  const png = await plotlyApi?.toImage({ format: "png", height: 600, width: 1200 });
  return { png, svg };
}

defineExpose({ getTimeSeriesPlotImage, advanceAnimation });

onMounted(() => {
  localTemporalRangeMin.value = selectedTemporalRange.value[0];
  localTemporalRangeMax.value = selectedTemporalRange.value[1];
});

watch(
  () => [minYear.value, maxYear.value, selectedTemporalRange.value[0], selectedTemporalRange.value[1]],
  ([nextMin, nextMax, selectedMin, selectedMax]) => {
    // Keep the selected range within metadata bounds when datasets/routes change.
    if (selectedMin < nextMin || selectedMax > nextMax || selectedMin > selectedMax) {
      selectedTemporalRange.value = [nextMin, nextMax];
    }

    // Keep form inputs in sync unless the user is actively editing.
    if (!isTemporalRangeEditable.value) {
      localTemporalRangeMin.value = selectedTemporalRange.value[0];
      localTemporalRangeMax.value = selectedTemporalRange.value[1];
    }
  },
  { immediate: true }
);

watch(timeSeriesData, (data) => {
  getPlotlyApi()?.update(data, layoutMetadata.value);
});

watch(layoutMetadata, (layout) => {
  getPlotlyApi()?.update(timeSeriesData.value, layout);
});
</script>
<style>
.time-series-card {
  width: 100%;
  height: 100%;
  min-width: 0;
}

.time-series-card__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.time-series-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}

.time-series-toolbar__group {
  min-width: 0;
}

.time-series-toolbar__group--metrics {
  display: flex;
  flex: 1 1 280px;
  flex-wrap: wrap;
  gap: 8px;
}

.time-series-toolbar__range {
  display: flex;
  flex: 1 1 340px;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
}

.time-series-toolbar__group--actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.time-series-metric {
  background-color: #e4e7ef;
}

.time-series-range-field {
  flex: 1 1 140px;
  min-width: 140px;
  max-width: 180px;
}

.time-series-range-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
}

.time-series-plot-shell {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.time-series {
  flex: 1 1 auto;
  width: 100%;
  min-height: 320px;
}

@media all and (max-width: 960px) {
  .time-series-range-field {
    max-width: none;
  }
}
</style>
