import { defineStore } from "pinia";
import { summarize, toISODate } from "@/store/stats";
import type { Dataset, Variable } from "@/types/metadata";
import { timeSpan } from "@/utils/timeAxis";

const DEFAULT_MAX_PROCESSING_TIME = 20000;

const LOADING_STATUS = {
  status: "loading",
  messages: [{ type: "warning", value: "Loading time series data." }],
};
const SUCCESS_STATUS = {
  status: "success",
  messages: [{ type: "info", value: "Success" }],
};
const TIMEOUT_STATUS = {
  status: "timeout",
  messages: [
    {
      type: "error",
      value: "Timeout exceeded, please try again with a smaller study area.",
    },
  ],
};
const NO_STUDY_AREA_STATUS = {
  status: "no-area",
  messages: [
    {
      type: "error",
      value: "Please enter a study area.",
    },
  ],
};

type DatasetVariable = Partial<Variable> & { id: string | null };

/** Where a dataset's study area is kept in the browser. */
export function studyAreaKey(datasetId: string) {
  return `geojson:${datasetId}`;
}

export const useDatasetStore = defineStore("dataset", {
  state: () => ({
    timeSeries: {
      x: [] as number[],
      y: [] as Array<number | null>,
      options: { name: "Original" as string },
    },
    hasData: false,
    metadata: null as Dataset | null,
    variable: { id: null } as DatasetVariable,
    geoJson: null as unknown,
    hasGeoJson: false,
    temporalRange: [1, new Date().getFullYear()] as [number, number],
    temporalRangeMin: 1,
    temporalRangeMax: new Date().getFullYear(),
    timeSeriesRequestStatus: { ...LOADING_STATUS },
    minYear: 1,
    maxYear: new Date().getFullYear(),
    canHandleTimeSeriesRequest: false,
    // The API's area: the selected shape, measured in the dataset's CRS. Both
    // are 0 until a time series comes back.
    areaInSquareKm: 0,
    numberOfCells: 0,
    timeSeriesRequestData: {} as Record<string, unknown>,
    summaryStatistics: {
      name: "Original",
      stdev: "N/A",
      mean: "N/A",
      median: "N/A",
    } as Record<string, unknown>,
    jobIds: {} as Record<string, string>,
  }),
  getters: {
    timeseriesTrace: (state) => {
      if (!state.hasData) return null;
      return {
        x: state.timeSeries.x,
        y: state.timeSeries.y,
        name: state.timeSeries.options?.name || "Original",
      };
    },
    geoJsonKey: (state) => {
      const metadataId = state.metadata?.id;
      return metadataId ? studyAreaKey(metadataId) : "skope:geometry";
    },
    defaultApiRequestData: (state) => {
      const metadata = state.metadata;
      const variable = state.variable;
      const [minYear, maxYear] = state.temporalRange;
      return {
        dataset_id: metadata?.id,
        variable_id: variable?.id,
        selected_area: state.geoJson,
        time_range: {
          gte: toISODate(minYear),
          lte: toISODate(maxYear),
        },
        zonal_statistic: "mean",
        transform: { type: "NoTransform" },
        requested_series_options: [
          {
            name: "Original",
            smoother: { type: "NoSmoother" },
          },
        ],
        max_processing_time: DEFAULT_MAX_PROCESSING_TIME,
      };
    },
  },
  actions: {
    setVariable(variableId: string) {
      const variables = this.metadata?.variables;
      if (variables) {
        const variable = variables.find((v) => v.id === variableId);
        if (variable) this.variable = variable;
      } else {
        this.variable = { id: variableId };
      }
      this.timeSeriesRequestData = this.defaultApiRequestData;
    },
    setTemporalRange(temporalRange: [number, number]) {
      this.temporalRange = temporalRange;
      this.temporalRangeMin = temporalRange[0];
      this.temporalRangeMax = temporalRange[1];
      this.timeSeriesRequestData = this.defaultApiRequestData;
    },
    setMetadata(metadata: Dataset | null) {
      this.metadata = metadata;
      // Without metadata there's no dataset to extract from. The landing page
      // clears it while the page being left can still send a request.
      this.canHandleTimeSeriesRequest =
        !!metadata && this.hasGeoJson && !!this.variable?.id;
      if (metadata?.time) {
        [this.minYear, this.maxYear] = timeSpan(metadata.time);
        this.temporalRange = [this.minYear, this.maxYear];
        this.temporalRangeMin = this.minYear;
        this.temporalRangeMax = this.maxYear;
      }
      this.timeSeriesRequestData = this.defaultApiRequestData;
    },
    setGeoJson(geoJson: unknown) {
      this.geoJson = geoJson;
      this.hasGeoJson = geoJson != null;
      this.canHandleTimeSeriesRequest =
        !!this.metadata && this.hasGeoJson && !!this.variable?.id;
      this.timeSeriesRequestData = this.defaultApiRequestData;
    },
    clearGeoJson() {
      this.geoJson = null;
      this.hasGeoJson = false;
      this.canHandleTimeSeriesRequest = false;
      this.timeSeriesRequestData = this.defaultApiRequestData;
    },
    setJobId(varId: string, jobId: string) {
      this.jobIds[varId] = jobId;
    },
    clearJobIds() {
      this.jobIds = {};
    },
    setTimeSeriesLoading() {
      this.timeSeriesRequestStatus = { ...LOADING_STATUS };
    },
    setTimeSeriesLoaded() {
      this.timeSeriesRequestStatus = { ...SUCCESS_STATUS };
    },
    setTimeSeriesTimeout() {
      this.timeSeriesRequestStatus = { ...TIMEOUT_STATUS };
    },
    setTimeSeriesBadRequest(errorDetails: Array<{ msg: string }>) {
      this.timeSeriesRequestStatus = {
        status: "badrequest",
        type: "error",
        messages: errorDetails.map((detail) => ({
          type: "error",
          value: detail.msg,
        })),
      } as any;
    },
    setTimeSeriesServerError(errorDetails: Array<{ msg: string }>) {
      this.timeSeriesRequestStatus = {
        status: "servererror",
        type: "error",
        messages: errorDetails.map((detail) => ({
          type: "error",
          value: detail.msg,
        })),
      } as any;
    },
    setTimeSeriesNoArea() {
      this.timeSeriesRequestStatus = { ...NO_STUDY_AREA_STATUS };
    },
    setTimeSeries(payload: {
      timeSeries: {
        x: number[];
        y: Array<number | null>;
        options?: { name?: string };
      };
      numberOfCells: number;
      area: number;
    }) {
      this.hasData = true;
      this.timeSeries = {
        ...payload.timeSeries,
        options: payload.timeSeries.options || { name: "Original" },
      };
      this.setAreaSummary(payload.numberOfCells, payload.area);
      const filtered = this.filteredTimeSeries();
      this.summaryStatistics = { ...summarize(filtered), name: "Original" };
    },
    /** The response's cell count and area, in square metres. */
    setAreaSummary(numberOfCells: number, areaInSquareMeters: number) {
      this.numberOfCells = numberOfCells;
      this.areaInSquareKm = areaInSquareMeters / 1e6;
    },
    clearTimeSeries() {
      this.hasData = false;
      // Back to the initial state: no "success" left over from the old data.
      this.timeSeriesRequestStatus = { ...LOADING_STATUS };
      this.timeSeries = { x: [], y: [], options: { name: "Original" } };
      this.setAreaSummary(0, 0);
      this.summaryStatistics = {
        name: "Original",
        stdev: "N/A",
        mean: "N/A",
        median: "N/A",
      };
    },
    // The points whose timestep falls in the selected range. Each x comes from
    // the response's timesteps, so this holds on any axis.
    filteredTimeSeries() {
      const [start, end] = this.temporalRange;
      const { x, y } = this.timeSeries;
      const inRange = x.flatMap((year, i) =>
        year >= start && year <= end ? [i] : [],
      );
      return {
        x: inRange.map((i) => x[i]),
        y: inRange.map((i) => y[i]),
        name: this.timeSeries.options?.name || "Original",
      };
    },
  },
});
