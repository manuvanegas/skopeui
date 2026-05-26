import { defineStore } from "pinia";
import { extractYear, formatStats } from "@/store/stats";

const EMPTY_RESPONSE = {
  area: 0,
  n_cells: 1,
  series: [],
  zonal_statistic: "mean",
  dataset_id: "",
  variable_id: "",
  summary_stats: [],
};

export const useAnalysisStore = defineStore("analysis", {
  state: () => ({
    summaryStatistics: [] as any[],
    response: { ...EMPTY_RESPONSE } as any,
    timeseries: [] as any[],
    requestData: {} as Record<string, unknown>,
    responseError: {} as Record<string, unknown>,
  }),
  getters: {
    derivedTimeseries: (state) => {
      return (state.response?.series || []).map((s: any) => ({
        x: Array.from(
          { length: extractYear(s.time_range.lte) - extractYear(s.time_range.gte) + 1 },
          (_, i) => extractYear(s.time_range.gte) + i
        ),
        y: s.values,
        name: s.options?.name,
      }));
    },
    derivedSummaryStatistics: (state) => formatStats(state.response?.summary_stats || []),
  },
  actions: {
    setDefaultRequestData(requestData: Record<string, unknown>) {
      this.requestData = requestData;
      this.response = { ...EMPTY_RESPONSE };
    },
    setResponse(response: Record<string, unknown>) {
      this.response = response;
      this.timeseries = this.derivedTimeseries;
      this.summaryStatistics = this.derivedSummaryStatistics;
    },
    setRequestData(requestData: Record<string, unknown>) {
      this.requestData = requestData;
    },
    setGeoJson(geoJson: unknown) {
      this.requestData = {
        ...this.requestData,
        selected_area: geoJson,
      };
    },
    setResponseError(error: Record<string, unknown>) {
      this.responseError = error;
    },
  },
});
