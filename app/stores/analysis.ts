import { defineStore } from "pinia";
import { formatStats } from "@/store/stats";
import { yearOfTimestep } from "@/utils/timeAxis";

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
    response: { ...EMPTY_RESPONSE } as any,
    requestData: {} as Record<string, unknown>,
  }),
  // Derived from the response, so they can't outlive it.
  getters: {
    timeseries: (state) => {
      return (state.response?.series || []).map((s: any) => ({
        x: s.timesteps.map(yearOfTimestep),
        y: s.values,
        name: s.options?.name,
      }));
    },
    summaryStatistics: (state) =>
      formatStats(state.response?.summary_stats || []),
  },
  actions: {
    setDefaultRequestData(requestData: Record<string, unknown>) {
      this.requestData = requestData;
      this.response = { ...EMPTY_RESPONSE };
    },
    setResponse(response: Record<string, unknown>) {
      this.response = response;
    },
    /** Drops the last response, e.g. when the study area changes. */
    clear() {
      this.response = { ...EMPTY_RESPONSE };
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
  },
});
