import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useAnalysisStore } from "@/stores/analysis";
import { useAppStore } from "@/stores/app";
import { useDatasetStore } from "@/stores/dataset";
import { useMessagesStore } from "@/stores/messages";
import { useMetadataStore } from "@/stores/metadata";
import type { Dataset } from "@/types/metadata";
import metadataFixture from "@/tests/fixtures/metadata-1.0.0.json";

describe("migrated pinia stores", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("app store toggles and tracks workflow state", () => {
    const store = useAppStore();

    expect(store.isNavigationVisible).toBe(false);
    expect(store.isFirstVisit).toBe(true);
    expect(store.stepNames).toEqual([
      "index",
      "dataset-id",
      "dataset-id-visualize-variable",
      "dataset-id-analyze-variable",
    ]);

    store.toggleNavigationDrawer();
    expect(store.isNavigationVisible).toBe(true);

    store.setNavigationVisible(false);
    expect(store.isNavigationVisible).toBe(false);

    store.setVisited();
    expect(store.isFirstVisit).toBe(false);
    expect(store.isVisible).toBe(true);
  });

  it("messages store supports info/error and dismiss/clear", () => {
    const store = useMessagesStore();

    store.info("hello");
    store.error("boom");
    expect(store.messages).toEqual([
      { type: "info", message: "hello" },
      { type: "error", message: "boom" },
    ]);

    store.dismiss(0);
    expect(store.messages).toEqual([{ type: "error", message: "boom" }]);

    store.clearMessages();
    expect(store.messages).toEqual([]);
  });

  it("messages store keeps only the messages raised for the page being opened", () => {
    const store = useMessagesStore();

    store.error("from the last page");
    store.info("for the next page", { keepOnNavigation: true });
    store.clearOnNavigation();
    expect(store.messages).toEqual([
      { type: "info", message: "for the next page" },
    ]);

    store.clearOnNavigation();
    expect(store.messages).toEqual([]);
  });

  it("dataset store updates variable, temporal range, metadata, and geojson", () => {
    const store = useDatasetStore();

    store.setVariable("tasmax");
    expect(store.variable.id).toBe("tasmax");

    store.setTemporalRange([1901, 1910]);
    expect(store.temporalRange).toEqual([1901, 1910]);
    expect(store.temporalRangeMin).toBe(1901);
    expect(store.temporalRangeMax).toBe(1910);

    store.setMetadata(metadataFixture.datasets[0] as Dataset);
    expect(store.metadata?.id).toBe("paleocar_v3");

    store.setGeoJson({ type: "FeatureCollection", features: [] });
    expect(store.hasGeoJson).toBe(true);

    store.setGeoJson({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ],
        ],
      },
    });
    expect(Number(store.selectedAreaInSquareKm)).toBeGreaterThan(0);

    store.setGeoJson(null);
    expect(store.hasGeoJson).toBe(false);
    expect(store.selectedAreaInSquareKm).toBe("0.00");
  });

  it("dataset store legacy parity methods update status and derived fields", () => {
    const store = useDatasetStore();

    store.setMetadata(metadataFixture.datasets[0] as Dataset);
    store.setVariable("gdd_cotton_annual");
    store.setGeoJson({ type: "FeatureCollection", features: [] });

    expect(store.minYear).toBe(103);
    expect(store.maxYear).toBe(2000);
    expect(store.variable.title).toBe(
      "Annual (Jan–Dec) Cotton Growing Degree Days",
    );
    expect(store.geoJsonKey).toBe("geojson:paleocar_v3");
    expect(store.defaultApiRequestData.dataset_id).toBe("paleocar_v3");
    expect(store.defaultApiRequestData.variable_id).toBe("gdd_cotton_annual");

    store.setTimeSeriesLoading();
    expect(store.timeSeriesRequestStatus.status).toBe("loading");

    store.setTimeSeries({
      timeSeries: { x: [1, 2, 3], y: [1, 2, 3], options: { name: "Original" } },
      numberOfCells: 2,
      totalCellArea: 2000000,
    });
    expect(store.numberOfCells).toBe(2);
    expect(store.totalCellAreaInSquareKm).toBe("2.00");

    store.setTimeSeriesLoaded();
    expect(store.timeSeriesRequestStatus.status).toBe("success");

    store.clearTimeSeries();
    expect(store.timeSeries.x).toEqual([]);
    expect(store.numberOfCells).toBe(0);
    expect(store.timeSeriesRequestStatus.status).toBe("loading");

    store.setTimeSeriesBadRequest([{ msg: "bad input" }]);
    expect(store.timeSeriesRequestStatus.status).toBe("badrequest");

    store.setTimeSeriesServerError([{ msg: "server error" }]);
    expect(store.timeSeriesRequestStatus.status).toBe("servererror");

    store.setTimeSeriesTimeout();
    expect(store.timeSeriesRequestStatus.status).toBe("timeout");

    store.setTimeSeriesNoArea();
    expect(store.timeSeriesRequestStatus.status).toBe("no-area");
  });

  it("dataset store keeps the points of the selected years, empty ones included", () => {
    const store = useDatasetStore();

    store.setMetadata(metadataFixture.datasets[0] as Dataset);
    store.setTemporalRange([416, 418]);
    store.setTimeSeries({
      timeSeries: {
        x: [415, 416, 417, 418, 419],
        y: [1, 2, null, null, 5],
        options: { name: "Original" },
      },
      numberOfCells: 2,
      totalCellArea: 2000000,
    });

    expect(store.filteredTimeSeries()).toEqual({
      x: [416, 417, 418],
      y: [2, null, null],
      name: "Original",
    });
  });

  it("dataset store preserves already constrained time series without double filtering", () => {
    const store = useDatasetStore();

    store.setMetadata(metadataFixture.datasets[0] as Dataset);
    store.setVariable("ppt_annual");
    store.setTemporalRange([100, 102]);
    store.setTimeSeries({
      timeSeries: {
        x: [100, 101, 102],
        y: [4, 5, 6],
        options: { name: "Original" },
      },
      numberOfCells: 2,
      totalCellArea: 2000000,
    });

    expect(store.filteredTimeSeries()).toEqual({
      x: [100, 101, 102],
      y: [4, 5, 6],
      name: "Original",
    });
  });

  it("metadata store sets collections and finds by id", () => {
    const store = useMetadataStore();
    const all = [
      { id: "paleocar", title: "PaleoCAR" },
      { id: "lbda", title: "LBDA" },
    ];
    const filtered = [{ id: "lbda", title: "LBDA" }];

    store.setAllDatasetMetadata(all);
    store.setFilteredDatasets(filtered);

    expect(store.allDatasetMetadata).toEqual(all);
    expect(store.filteredDatasets).toEqual(filtered);
    expect(store.find("lbda")).toEqual({ id: "lbda", title: "LBDA" });
    expect(store.find("missing")).toBeNull();
  });

  it("metadata store flags an update and filters datasets", () => {
    const store = useMetadataStore();
    const [paleocar] = metadataFixture.datasets as Dataset[];
    const lbda: Dataset = {
      ...paleocar,
      id: "lbda",
      title: "LBDA",
      description: "drought index",
      time: { ...paleocar.time, origin: "0001", end: "2017" },
      variables: [
        {
          ...paleocar.variables[0],
          id: "pmdi",
          title: "PMDI",
          category: "Drought",
          description: "index",
        },
      ],
    };
    store.setAllDatasetMetadata([lbda, paleocar]);

    expect(store.allDatasetMetadata.map((d) => d.id)).toEqual([
      "lbda",
      "paleocar_v3",
    ]);
    expect(store.updateRequired).toBe(false);

    store.setUpdateRequired();
    expect(store.updateRequired).toBe(true);

    store.setFilterCriteria({
      selectedCategories: ["Precipitation"],
      yearStart: 1,
      yearEnd: 2005,
      query: "tree-ring",
    });
    expect(store.filteredDatasets.map((d) => d.id)).toEqual(["paleocar_v3"]);

    store.setFilterCriteria({
      selectedCategories: [],
      yearStart: 2001,
      yearEnd: 2017,
    });
    expect(store.filteredDatasets.map((d) => d.id)).toEqual(["lbda"]);
  });

  it("analysis store updates request/response/loading state", () => {
    const store = useAnalysisStore();

    store.setDefaultRequestData({ dataset_id: "paleocar" });
    expect(store.requestData).toEqual({ dataset_id: "paleocar" });

    store.setResponse({ ok: true });
    expect(store.response).toEqual({ ok: true });

    store.setGeoJson({ type: "FeatureCollection", features: [] });
    expect((store.requestData as any).selected_area).toEqual({
      type: "FeatureCollection",
      features: [],
    });

    store.setRequestData({ dataset_id: "paleocar" });
    expect(store.requestData).toEqual({ dataset_id: "paleocar" });

    store.setResponse({
      summary_stats: [{ name: "Original", stdev: 2, mean: 3, median: 3 }],
      series: [
        {
          time_range: { gte: "0416", lte: "0590" },
          timesteps: ["0416", "0417", "0590"],
          values: [1, null, 3],
          options: { name: "Original" },
        },
      ],
    } as any);
    expect(store.summaryStatistics[0].name).toBe("Original");
    expect(store.timeseries[0].x).toEqual([416, 417, 590]);
    expect(store.timeseries[0].y).toEqual([1, null, 3]);

    store.clear();
    expect(store.timeseries).toEqual([]);
    expect(store.summaryStatistics).toEqual([]);
    expect(store.requestData).toEqual({ dataset_id: "paleocar" });
  });
});
