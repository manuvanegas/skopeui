<template>
  <v-card variant="outlined" height="100%" width="100%">
    <v-card-text style="height: 90%">
      <v-toolbar variant="flat" class="py-0 my-0">
        <v-row align="baseline" justify="space-between">
          <!-- area -->
          <v-col v-if="showArea" cols="auto" class="d-flex">
            <v-tooltip location="top" text="Selected area in square kilometers">
              <template #activator="{ props }">
                <h3
                  v-bind="props"
                  class="font-weight-light text-center pa-2"
                  style="background-color: #e4e7ef"
                >
                  {{ selectedAreaInSquareKm }} km<sup>2</sup>
                </h3>
              </template>
            </v-tooltip>
            <v-divider vertical class="mx-2"></v-divider>
            <v-tooltip location="top" text="Total cell area used in this time series calculation">
              <template #activator="{ props }">
                <h3
                  v-bind="props"
                  class="font-weight-light text-center pa-2"
                  style="background-color: #e4e7ef"
                >
                  {{ totalCellArea }} km<sup>2</sup> ({{ numberOfCells }}
                  cells)
                </h3>
              </template>
            </v-tooltip>
          </v-col>
          <!-- temporal range input -->
          <v-form v-model="isTemporalRangeValid">
            <v-col
              class="d-flex flex-row"
              cols="auto"
              @click="enableTemporalRangeEdit"
            >
              <!-- temporal range -->
              <v-text-field
                v-model.number="formTemporalRangeMin"
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
                :disabled="!isTemporalRangeEditable"
                class="mx-2"
                label="Max Year"
                :hint="timeStepsLabel"
                persistent-hint
                :min="minYear + 1"
                :max="maxYear"
                :rules="[validateMaxYear]"
                type="number"
                @keydown.enter="setTemporalRange"
              >
              </v-text-field>
              <div class="d-flex flex-column mt-n2">
                <v-btn
                  :disabled="!hasTemporalRangeChanges || !isTemporalRangeValid"
                  size="x-small"
                  color="secondary"
                  @click="setTemporalRange"
                  >Apply</v-btn
                >
                <v-btn size="x-small" color="secondary" @click="resetTemporalRange"
                  >Reset</v-btn
                >
              </div>
            </v-col>
          </v-form>
          <!-- step controls -->
          <v-col v-if="showStepControls" align="right">
            <v-tooltip location="top" text="Go to the first year of the defined temporal range">
              <template #activator="{ props }">
                <v-btn
                  icon
                  v-bind="props"
                  color="accent"
                  @click="gotoFirstYear"
                >
                  <v-icon>mdi-skip-previous</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip location="top" text="Previous year">
              <template #activator="{ props }">
                <v-btn
                  icon
                  v-bind="props"
                  color="accent"
                  @click="previousYear"
                >
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
                <v-btn
                  icon
                  v-bind="props"
                  color="accent"
                  @click="nextYear"
                >
                  <v-icon>mdi-chevron-right</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip location="top" text="Go to the last year of the defined temporal range">
              <template #activator="{ props }">
                <v-btn
                  icon
                  v-bind="props"
                  color="accent"
                  @click="gotoLastYear"
                >
                  <v-icon>mdi-skip-next</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </v-col>
          <v-col v-if="showArea" cols="auto" align="right">
            <v-tooltip location="top" text="Return to Select Area">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  :to="selectAreaLocation"
                  class="mb-4 mx-3"
                  color="accent"
                  size="small"
                >
                  <v-icon size="small">mdi-map-marker</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </v-col>
        </v-row>
      </v-toolbar>
      <!-- time series plot -->
      <client-only placeholder="Loading...">
        <template v-if="timeSeriesRequestStatus.status !== 'success'">
          <v-alert
            v-for="(message, index) in timeSeriesRequestStatus.messages"
            :key="index"
            :type="message.type"
          >
            {{ message.value }}
          </v-alert>
        </template>
        <Plotly
          ref="plot"
          class="time-series"
          :data="timeSeriesData"
          :layout="layoutMetadata"
          :options="options"
          @click="updatePlotlyYear"
        />
      </client-only>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
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
  margin: { b: 60, t: 10, pad: 2 },
  showlegend: hasMultipleTimeSeries.value,
  legend: { x: 1, y: 0.5 },
  xaxis: { title: xAxisTitle.value, linewidth: 3, gridwidth: 3, automargin: true },
  yaxis: { title: yAxisTitle.value, linewidth: 3, gridwidth: 3, automargin: true },
  font: { size: 14 },
  shapes: shapes.value,
}));

const options = computed(() => ({
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

function togglePlay() {
  isAnimationPlaying.value = !isAnimationPlaying.value;
  if (isAnimationPlaying.value) {
    const interval = setInterval(() => {
      if (isAnimationPlaying.value && (props.yearSelected ?? 0) < temporalRangeMax.value) {
        nextYear();
      } else {
        isAnimationPlaying.value = false;
        clearInterval(interval);
      }
    }, animationSpeed.value);
  }
}

async function getTimeSeriesPlotImage() {
  const svg = await plotlyRef.value?.toImage({ format: "svg", height: 600, width: 1200 });
  const png = await plotlyRef.value?.toImage({ format: "png", height: 600, width: 1200 });
  return { png, svg };
}

defineExpose({ getTimeSeriesPlotImage });

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
  plotlyRef.value?.update(data, layoutMetadata.value);
});

watch(layoutMetadata, (layout) => {
  plotlyRef.value?.update(timeSeriesData.value, layout);
});
</script>
<style>
.time-series {
  height: 100%;
}
</style>
