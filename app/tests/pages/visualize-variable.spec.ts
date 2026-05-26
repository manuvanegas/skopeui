import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAppStore,
  createDatasetStore,
  timeSeriesResponseFixture,
} from "@/tests/fixtures/page-fixtures";
import {
  installNuxtTestGlobals,
  mountWithSuspense,
  resetNuxtTestGlobals,
} from "@/tests/fixtures/nuxt-test-helpers";

let routeParams = { id: "paleocar", variable: "tasmax" };
let datasetStore: any;
let appStore: any;
let legacyActions: any;

vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: routeParams,
    fullPath: `/dataset/${routeParams.id}/visualize/${routeParams.variable}`,
  }),
}));

vi.mock("@/components/dataset/Map.client.vue", () => ({
  default: {
    name: "MapStub",
    props: ["mapEngine", "displayRaster"],
    template: '<div data-test="map" :data-map-engine="mapEngine" :data-display-raster="String(displayRaster)">map</div>',
  },
}));

vi.mock("@/components/dataset/TimeSeriesPlot.vue", () => ({
  default: {
    name: "TimeSeriesPlotStub",
    template: '<div data-test="timeseries">timeseries</div>',
  },
}));

vi.mock("@/components/dataset/SubHeader.vue", () => ({
  default: {
    name: "SubHeaderStub",
    template: '<div data-test="subheader"><slot /></div>',
  },
}));

vi.mock("@/components/LoadingSpinner.vue", () => ({
  default: {
    name: "LoadingSpinnerStub",
    template: '<div data-test="loading">loading</div>',
  },
}));

vi.mock("@/stores/dataset", () => ({
  useDatasetStore: () => datasetStore,
}));

vi.mock("@/stores/app", () => ({
  useAppStore: () => appStore,
}));

vi.mock("@/composables/useLegacyStoreActions", () => ({
  useLegacyStoreActions: () => legacyActions,
}));

import VisualizePage from "@/pages/dataset/[id]/visualize/[variable].vue";

const layoutStubs = {
  "v-container": { template: '<div><slot /></div>' },
  "v-row": { template: '<div><slot /></div>' },
  "v-col": { template: '<div><slot /></div>' },
  "v-btn": { template: '<button><slot /></button>' },
  "v-icon": { template: '<i><slot /></i>' },
};

describe("route /dataset/:id/visualize/:variable", () => {
  beforeEach(() => {
    installNuxtTestGlobals();

    datasetStore = createDatasetStore({ hasGeoJson: true });
    appStore = createAppStore();
    legacyActions = {
      initializeDataset: vi.fn(async () => true),
      initializeDatasetGeoJson: vi.fn(),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => timeSeriesResponseFixture,
      }))
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetNuxtTestGlobals();
  });

  it("[smoke] renders map and timeseries panel", async () => {
    const wrapper = await mountWithSuspense(VisualizePage, { global: { stubs: layoutStubs } });

    await flushPromises();
    const page = wrapper.findComponent(VisualizePage);
    const map = page.find('[data-test="map"]');

    expect(page.findComponent({ name: "MapStub" }).exists()).toBe(true);
    expect(map.attributes("data-map-engine")).toBe("maplibre");
    expect(map.attributes("data-display-raster")).toBe("true");
    expect(page.findComponent({ name: "TimeSeriesPlotStub" }).exists()).toBe(true);
  });

  it("[behavior] loads time-series data on mount", async () => {
    await mountWithSuspense(VisualizePage, { global: { stubs: layoutStubs } });

    await flushPromises();

    expect(datasetStore.setTimeSeriesLoading).toHaveBeenCalled();
    expect(datasetStore.setTimeSeries).toHaveBeenCalled();
    expect(datasetStore.setTimeSeriesLoaded).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
    expect(appStore.setVisited).toHaveBeenCalled();
  });

  it("[behavior] re-requests time-series when temporal/request constraints change", async () => {
    await mountWithSuspense(VisualizePage, { global: { stubs: layoutStubs } });

    await flushPromises();
    const initialFetchCalls = (global.fetch as any).mock.calls.length;

    datasetStore.timeSeriesRequestData = {
      dataset_id: "paleocar",
      variable_id: "tasmax",
      selected_area: { type: "FeatureCollection", features: [] },
      time_range: { gte: "0002-01-01", lte: "0003-01-01" },
      zonal_statistic: "mean",
      transform: { type: "NoTransform" },
      requested_series_options: [{ name: "Original", smoother: { type: "NoSmoother" } }],
    };

    await nextTick();
    await flushPromises();

    expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialFetchCalls);
  });
});
