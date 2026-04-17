import { defineStore } from "pinia";
import { summarize, toISODate } from "@/store/stats";
import area from "@turf/area";

const DEFAULT_MAX_PROCESSING_TIME = 10000;

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

function selectedAreaInSquareKmFromGeoJson(geoJson: unknown): string {
  if (!geoJson) return "0.00";
  try {
    const squareMeters = area(geoJson as any);
    if (!Number.isFinite(squareMeters) || squareMeters <= 0) return "0.00";
    return (squareMeters / 1e6).toFixed(2);
  } catch {
    return "0.00";
  }
}

type DatasetVariable = { id: string | null } & Record<string, unknown>;

export const useDatasetStore = defineStore("dataset", {
  state: () => ({
    timeSeries: {
      x: [] as number[],
      y: [] as Array<number | null>,
      options: { name: "Original" as string },
    },
    hasData: false,
    metadata: null as unknown,
    variable: { id: null } as DatasetVariable,
    geoJson: null as unknown,
    hasGeoJson: false,
    temporalRange: [1, new Date().getFullYear()] as [number, number],
    temporalRangeMin: 1,
    temporalRangeMax: new Date().getFullYear(),
    timeSeriesRequestStatus: { ...LOADING_STATUS },
    selectedAreaInSquareKm: "0.00",
    minYear: 1,
    maxYear: new Date().getFullYear(),
    canHandleTimeSeriesRequest: false,
    totalCellAreaInSquareKm: "0.00",
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
    geoJsonKey: (state) => {
      const metadataId = (state.metadata as any)?.id;
      return metadataId ? `geojson:${metadataId}` : "skope:geometry";
    },
    defaultApiRequestData: (state) => {
      const metadata = state.metadata as any;
      const variable = state.variable as any;
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
      const metadata = this.metadata as any;
      if (metadata?.variables) {
        for (const variable of metadata.variables) {
          variable.visible = variable.id === variableId;
          if (variable.visible) {
            this.variable = variable;
          }
        }
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
    setMetadata(metadata: unknown) {
      this.metadata = metadata;
      const m = metadata as any;
      if (m?.timespan?.period) {
        this.minYear = parseInt(m.timespan.period.gte || "1", 10);
        this.maxYear = parseInt(m.timespan.period.lte || `${new Date().getFullYear()}`, 10);
        this.temporalRange = [this.minYear, this.maxYear];
        this.temporalRangeMin = this.minYear;
        this.temporalRangeMax = this.maxYear;
      }
      this.timeSeriesRequestData = this.defaultApiRequestData;
    },
    setGeoJson(geoJson: unknown) {
      this.geoJson = geoJson;
      this.hasGeoJson = geoJson != null;
      this.selectedAreaInSquareKm = selectedAreaInSquareKmFromGeoJson(geoJson);
      this.canHandleTimeSeriesRequest = !!this.metadata && this.hasGeoJson && !!this.variable?.id;
      this.timeSeriesRequestData = this.defaultApiRequestData;
    },
    clearGeoJson() {
      this.geoJson = null;
      this.hasGeoJson = false;
      this.canHandleTimeSeriesRequest = false;
      this.selectedAreaInSquareKm = "0.00";
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
        messages: errorDetails.map((detail) => ({ type: "error", value: detail.msg })),
      } as any;
    },
    setTimeSeriesServerError(errorDetails: Array<{ msg: string }>) {
      this.timeSeriesRequestStatus = {
        status: "servererror",
        type: "error",
        messages: errorDetails.map((detail) => ({ type: "error", value: detail.msg })),
      } as any;
    },
    setTimeSeriesNoArea() {
      this.timeSeriesRequestStatus = { ...NO_STUDY_AREA_STATUS };
    },
    setTimeSeries(payload: {
      timeSeries: { x: number[]; y: Array<number | null>; options?: { name?: string } };
      numberOfCells: number;
      totalCellArea: number;
    }) {
      this.hasData = true;
      this.timeSeries = {
        ...payload.timeSeries,
        options: payload.timeSeries.options || { name: "Original" },
      };
      this.numberOfCells = payload.numberOfCells;
      this.totalCellAreaInSquareKm = (payload.totalCellArea / 1e6).toFixed(2);
      const filtered = this.filteredTimeSeries();
      this.summaryStatistics = { ...summarize(filtered), name: "Original" };
    },
    clearTimeSeries() {
      this.hasData = false;
      this.timeSeries = { x: [], y: [], options: { name: "Original" } };
      this.numberOfCells = 0;
      this.totalCellAreaInSquareKm = "0.00";
      this.summaryStatistics = {
        name: "Original",
        stdev: "N/A",
        mean: "N/A",
        median: "N/A",
      };
    },
    filteredTimeSeries() {
      const [start, end] = this.temporalRange;
      const min = this.minYear;
      if (this.timeSeries.x.length === 0) {
        return { x: [], y: [] };
      }

      const selectedRangeLength = end - start + 1;
      if (this.timeSeries.x.length === selectedRangeLength) {
        return {
          x: this.timeSeries.x,
          y: this.timeSeries.y,
          name: this.timeSeries.options?.name || "Original",
        };
      }

      const minOffset = start - min;
      const maxOffset = end - min + 1;
      return {
        x: this.timeSeries.x.slice(minOffset, maxOffset),
        y: this.timeSeries.y.slice(minOffset, maxOffset),
        name: this.timeSeries.options?.name || "Original",
      };
    },
  },
});
