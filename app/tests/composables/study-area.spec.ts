import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import { useAnalysisStore } from "@/stores/analysis";
import { useDatasetStore } from "@/stores/dataset";

const area = {
  type: "Feature",
  properties: {},
  geometry: { type: "Point", coordinates: [-108.5, 37] },
};

function withResults() {
  const dataset = useDatasetStore();
  const analysis = useAnalysisStore();
  dataset.setJobId("ppt_annual", "old-job");
  dataset.setTimeSeries({
    timeSeries: { x: [103], y: [1] },
    numberOfCells: 1,
    totalCellArea: 0,
  });
  dataset.setTimeSeriesLoaded();
  analysis.setResponse({
    summary_stats: [{ name: "Original", mean: 1, median: 1, stdev: 0 }],
    series: [
      { timesteps: ["0103"], values: [1], options: { name: "Original" } },
    ],
  });
  return { dataset, analysis };
}

describe("changing the study area", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("drops the old area's plots, statistics and extractions", () => {
    const { dataset, analysis } = withResults();

    useLegacyStoreActions().saveGeoJson(area);

    expect(dataset.jobIds).toEqual({});
    expect(dataset.hasData).toBe(false);
    expect(dataset.timeSeriesRequestStatus.status).not.toBe("success");
    expect(analysis.timeseries).toEqual([]);
    expect(analysis.summaryStatistics).toEqual([]);
  });

  it("drops them when the area is cleared too", () => {
    const { dataset, analysis } = withResults();

    useLegacyStoreActions().clearGeoJson();

    expect(dataset.jobIds).toEqual({});
    expect(dataset.hasData).toBe(false);
    expect(analysis.timeseries).toEqual([]);
  });
});
