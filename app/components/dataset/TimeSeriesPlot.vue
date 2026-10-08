<template>
  <v-card variant="outlined" class="time-series-card">
    <PanelHeader>
      <AreaReadout v-if="showArea" />
      <v-form
        v-model="isTemporalRangeValid"
        class="time-series-range"
        @click="enableTemporalRangeEdit"
      >
        <v-text-field
          v-model.number="formTemporalRangeMin"
          class="time-series-range-field"
          label="From"
          density="compact"
          variant="outlined"
          hide-details="auto"
          :disabled="!isTemporalRangeEditable"
          :min="minStep"
          :max="maxStep - 1"
          type="number"
          :rules="[validateMinStep]"
          @keydown.enter="setTemporalRange"
        />
        <v-text-field
          v-model.number="formTemporalRangeMax"
          class="time-series-range-field"
          label="To"
          density="compact"
          variant="outlined"
          hide-details="auto"
          :disabled="!isTemporalRangeEditable"
          :min="minStep + 1"
          :max="maxStep"
          :rules="[validateMaxStep]"
          type="number"
          @keydown.enter="setTemporalRange"
        />
        <v-btn
          :disabled="!hasTemporalRangeChanges || !isTemporalRangeValid"
          size="small"
          color="secondary"
          @click="setTemporalRange"
        >
          Apply
        </v-btn>
        <v-btn size="small" color="secondary" @click="resetTemporalRange">
          Reset
        </v-btn>
        <span class="time-series-range-steps">{{ timeStepsLabel }}</span>
      </v-form>
    </PanelHeader>

    <div
      class="time-series-plot-shell"
      :class="{ 'time-series-plot-shell--last': !showStepControls }"
    >
      <div
        v-if="timeSeriesRequestStatus.status === 'loading'"
        class="timeseries-loading-overlay"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          size="52"
          width="4"
        />
        <p class="loading-message mt-4">{{ loadingMessage }}</p>
      </div>
      <client-only placeholder="Loading...">
        <template
          v-if="
            timeSeriesRequestStatus.status !== 'success' &&
            timeSeriesRequestStatus.status !== 'loading'
          "
        >
          <v-alert
            v-for="(message, index) in timeSeriesRequestStatus.messages.filter(
              (m) => m.type !== 'error',
            )"
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
          @click="updatePlotlyStep"
        />
      </client-only>
    </div>

    <!-- The current timestep sits between the buttons that change it, centred
         under the plot; the x-axis title already says "Timestep". -->
    <div v-if="showStepControls" class="time-series-step-controls">
      <v-tooltip
        location="top"
        text="Go to the first timestep of the defined temporal range"
      >
        <template #activator="{ props }">
          <v-btn
            icon
            size="small"
            v-bind="props"
            color="accent"
            @click="gotoFirstStep"
          >
            <v-icon>mdi-skip-previous</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip location="top" text="Previous timestep">
        <template #activator="{ props }">
          <v-btn
            icon
            size="small"
            v-bind="props"
            color="accent"
            @click="previousStep"
          >
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <!-- Changes with these buttons, or by clicking the plot. -->
      <span
        class="time-series-current-step"
        :style="{ minWidth: currentStepWidth }"
        title="Current timestep"
        data-test="current-step"
      >
        {{ stepSelected }}
      </span>
      <v-tooltip location="top" text="Next timestep">
        <template #activator="{ props }">
          <v-btn
            icon
            size="small"
            v-bind="props"
            color="accent"
            @click="nextStep"
          >
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip
        location="top"
        text="Go to the last timestep of the defined temporal range"
      >
        <template #activator="{ props }">
          <v-btn
            icon
            size="small"
            v-bind="props"
            color="accent"
            @click="gotoLastStep"
          >
            <v-icon>mdi-skip-next</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  defineAsyncComponent,
} from "vue";
import _ from "lodash";
import AreaReadout from "@/components/dataset/AreaReadout.vue";
import PanelHeader from "@/components/dataset/PanelHeader.vue";
import { useDatasetStore } from "@/stores/dataset";
import { axisYears, stepAlongAxis } from "@/utils/timeAxis";

const props = defineProps<{
  stepSelected?: number | null;
  showStepControls?: boolean;
  /** Show the API's area and cell count (analyze; visualize shows it on the map). */
  showArea?: boolean;
  traces?: any[];
  yAxisLabel?: string | null;
}>();

const emit = defineEmits<{
  (e: "step-selected", step: number): void;
  (e: "selected-temporal-range", range: [number, number]): void;
}>();

// Lazy-load PlotlyClient to avoid SSR issues
const Plotly = defineAsyncComponent(
  () => import("@/components/dataset/PlotlyClient.vue"),
);

const datasetStore = useDatasetStore();

// Local state
const localTemporalRangeMin = ref(1);
const localTemporalRangeMax = ref(new Date().getFullYear());
const isTemporalRangeEditable = ref(false);
const isTemporalRangeValid = ref(false);
const plotlyRef = ref<any>(null);

const PROGRESSIVE_MESSAGES = [
  { delay: 8_000, text: "Still working..." },
  { delay: 16_000, text: "Hang tight, almost there..." },
  {
    delay: 24_000,
    text: "This is taking longer than usual, but we'll get there...",
  },
];

const loadingMessage = ref("");
let progressiveTimers: ReturnType<typeof setTimeout>[] = [];

function startProgressiveMessages() {
  clearProgressiveMessages();
  progressiveTimers = PROGRESSIVE_MESSAGES.map(({ delay, text }) =>
    setTimeout(() => {
      loadingMessage.value = text;
    }, delay),
  );
}

function clearProgressiveMessages() {
  progressiveTimers.forEach(clearTimeout);
  progressiveTimers = [];
  loadingMessage.value = "";
}

// Computed
const selectedTemporalRange = computed({
  get() {
    return datasetStore.temporalRange;
  },
  set(range: [number, number]) {
    datasetStore.setTemporalRange(range);
    emit("selected-temporal-range", datasetStore.temporalRange);
  },
});

const temporalRangeMin = computed(() => datasetStore.temporalRangeMin);
const temporalRangeMax = computed(() => datasetStore.temporalRangeMax);
const timeSeriesRequestStatus = computed(
  () => datasetStore.timeSeriesRequestStatus,
);
const axis = computed(() =>
  datasetStore.metadata ? axisYears(datasetStore.metadata.time) : [],
);
// As wide as the longest timestep on the axis (a year now; a date such as
// 2000-01-01 once finer axes are read), so the buttons don't shift as it
// changes.
const currentStepWidth = computed(() => {
  const longest = Math.max(1, ...axis.value.map((step) => `${step}`.length));
  return `${longest + 0.5}ch`;
});
const minStep = computed(() => datasetStore.minYear);
const maxStep = computed(() => datasetStore.maxYear);
const variable = computed(() => datasetStore.variable as any);
const timeSeriesData = computed(() => props.traces);
const hasMultipleTimeSeries = computed(
  () => props.traces != null && props.traces.length > 1,
);
const hasTimeSeries = computed(
  () => props.traces != null && props.traces[0]?.x?.length > 0,
);
const canHandleTimeSeriesRequest = computed(
  () => datasetStore.canHandleTimeSeriesRequest,
);

const formTemporalRangeMin = computed({
  get() {
    return isTemporalRangeEditable.value
      ? localTemporalRangeMin.value
      : selectedTemporalRange.value[0];
  },
  set(value: number) {
    localTemporalRangeMin.value = value;
  },
});

const formTemporalRangeMax = computed({
  get() {
    return isTemporalRangeEditable.value
      ? localTemporalRangeMax.value
      : selectedTemporalRange.value[1];
  },
  set(value: number) {
    localTemporalRangeMax.value = value;
  },
});

const hasTemporalRangeChanges = computed(
  () =>
    localTemporalRangeMin.value !== selectedTemporalRange.value[0] ||
    localTemporalRangeMax.value !== selectedTemporalRange.value[1],
);

const timeStepsLabel = computed(() => {
  const steps =
    selectedTemporalRange.value[1] - selectedTemporalRange.value[0] + 1;
  return `${steps} time steps`;
});

const yAxisTitle = computed(() => {
  if (props.yAxisLabel) return props.yAxisLabel;
  const { title, unit } = variable.value;
  return unit ? `${title} (${unit})` : title;
});

const shapes = computed(() => {
  if (!_.isNull(props.stepSelected ?? null)) {
    return [
      {
        type: "line",
        x0: props.stepSelected,
        x1: props.stepSelected,
        yref: "paper",
        y0: 0,
        y1: 1,
        line: { color: "rgb(255, 140, 0)", width: 3 },
      },
    ];
  }
  return [];
});

const layoutMetadata = computed(() => ({
  autosize: true,
  margin: { b: 60, t: 10, pad: 2 },
  showlegend: hasMultipleTimeSeries.value,
  legend: { x: 1, y: 0.5 },
  xaxis: {
    title: "Timestep",
    linewidth: 3,
    gridwidth: 3,
    automargin: true,
  },
  yaxis: {
    title: yAxisTitle.value,
    linewidth: 3,
    gridwidth: 3,
    automargin: true,
  },
  font: { size: 14 },
  shapes: shapes.value,
}));

const options = computed(() => ({
  displaylogo: false,
  modeBarButtonsToRemove: ["toImage"],
  responsive: true,
}));

function getPlotlyApi() {
  const plotlyInstance = plotlyRef.value as any;
  if (!plotlyInstance) {
    return null;
  }

  if (
    typeof plotlyInstance.toImage === "function" ||
    typeof plotlyInstance.update === "function"
  ) {
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

function validateMinStep(value: number) {
  if (value < minStep.value)
    return `Please enter a min step >= ${minStep.value}`;
  if (value >= maxStep.value)
    return `Please enter a min step < ${maxStep.value}`;
  return true;
}

function validateMaxStep(value: number) {
  if (value <= minStep.value)
    return `Please enter a max step > ${minStep.value}`;
  if (value > maxStep.value)
    return `Please enter a max step <= ${maxStep.value}`;
  return true;
}

function updatePlotlyStep(data: any) {
  setStep(data.points[0].x);
}

function setStep(step: number) {
  emit("step-selected", step);
}

function setTemporalRange() {
  if (!hasTemporalRangeChanges.value || !isTemporalRangeValid.value) return;
  selectedTemporalRange.value = [
    localTemporalRangeMin.value,
    localTemporalRangeMax.value,
  ];
  isTemporalRangeEditable.value = false;
  if (props.stepSelected == null) return;
  if (props.stepSelected < temporalRangeMin.value)
    setStep(temporalRangeMin.value);
  else if (props.stepSelected > temporalRangeMax.value)
    setStep(temporalRangeMax.value);
}

function resetTemporalRange() {
  localTemporalRangeMin.value = datasetStore.minYear;
  localTemporalRangeMax.value = datasetStore.maxYear;
  setTemporalRange();
}

function gotoFirstStep() {
  if (variable.value === null) return;
  setStep(temporalRangeMin.value);
}

function gotoLastStep() {
  if (variable.value === null) return;
  setStep(temporalRangeMax.value);
}

function stepBy(delta: number) {
  if (variable.value === null || props.stepSelected == null) return;
  setStep(
    stepAlongAxis(axis.value, props.stepSelected, delta, [
      temporalRangeMin.value,
      temporalRangeMax.value,
    ]),
  );
}

function nextStep() {
  stepBy(1);
}

function previousStep() {
  stepBy(-1);
}

async function getTimeSeriesPlotImage() {
  const plotlyApi = getPlotlyApi();
  const svg = await plotlyApi?.toImage({
    format: "svg",
    height: 600,
    width: 1200,
  });
  const png = await plotlyApi?.toImage({
    format: "png",
    height: 600,
    width: 1200,
  });
  return { png, svg };
}

// Watch the status object, not its `status` string: every request sets a new
// object, so a first request (loading -> loading) restarts the messages too.
watch(
  timeSeriesRequestStatus,
  ({ status }) => {
    if (status === "loading") startProgressiveMessages();
    else clearProgressiveMessages();
  },
  { immediate: true },
);

onUnmounted(() => {
  clearProgressiveMessages();
});

defineExpose({ getTimeSeriesPlotImage });

onMounted(() => {
  localTemporalRangeMin.value = selectedTemporalRange.value[0];
  localTemporalRangeMax.value = selectedTemporalRange.value[1];
});

watch(
  () => [
    minStep.value,
    maxStep.value,
    selectedTemporalRange.value[0],
    selectedTemporalRange.value[1],
  ],
  ([nextMin, nextMax, selectedMin, selectedMax]) => {
    // Keep the selected range within metadata bounds when datasets/routes change.
    if (
      selectedMin < nextMin ||
      selectedMax > nextMax ||
      selectedMin > selectedMax
    ) {
      selectedTemporalRange.value = [nextMin, nextMax];
    }

    // Keep form inputs in sync unless the user is actively editing.
    if (!isTemporalRangeEditable.value) {
      localTemporalRangeMin.value = selectedTemporalRange.value[0];
      localTemporalRangeMax.value = selectedTemporalRange.value[1];
    }
  },
  { immediate: true },
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
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
}

.time-series-range {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* A fixed width, so the range's row is sized from its contents and doesn't
   wrap while there's room. */
.time-series-range-field {
  flex: 0 0 120px;
  width: 120px;
}

.time-series-range-steps {
  font-size: 0.875rem;
  color: #596d7b;
  white-space: nowrap;
}

.time-series-plot-shell {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  padding: 16px 16px 0;
}

.time-series-plot-shell--last {
  padding-bottom: 16px;
}

/* Its bottom padding matches the map card's, so the buttons end level with
   the map. */
.time-series-step-controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px 16px;
}

.time-series-current-step {
  font-size: 1.125rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.timeseries-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.loading-message {
  font-size: 13px;
  color: #596d7b;
}

.time-series {
  flex: 1 1 auto;
  width: 100%;
  min-height: 320px;
}
</style>
