import { flushPromises } from "@vue/test-utils";
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
    template: '<div data-test="map">map</div>',
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

    expect(page.findComponent({ name: "MapStub" }).exists()).toBe(true);
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
});
