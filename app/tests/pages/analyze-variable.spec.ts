import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAnalysisStore,
  createDatasetStore,
  timeSeriesResponseFixture,
} from "@/tests/fixtures/page-fixtures";
import {
  installNuxtTestGlobals,
  mountWithSuspense,
  resetNuxtTestGlobals,
} from "@/tests/fixtures/nuxt-test-helpers";

let routeParams = { id: "paleocar", variable: "tasmax" };
let analysisStore: any;
let datasetStore: any;
let legacyActions: any;

vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: routeParams,
  }),
}));

vi.mock("vuetify", () => ({
  useDisplay: () => ({ mdAndDown: false }),
}));

vi.mock("@/components/dataset/TimeSeriesPlot.vue", () => ({
  default: {
    name: "TimeSeriesPlotStub",
    template: '<div data-test="timeseries">timeseries</div>',
    methods: {
      getTimeSeriesPlotImage: async () => ({ png: "data:image/png", svg: "data:image/svg+xml" }),
    },
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

vi.mock("@/stores/analysis", () => ({
  useAnalysisStore: () => analysisStore,
}));

vi.mock("@/stores/dataset", () => ({
  useDatasetStore: () => datasetStore,
}));

vi.mock("@/composables/useLegacyStoreActions", () => ({
  useLegacyStoreActions: () => legacyActions,
}));

import AnalyzePage from "@/pages/dataset/[id]/analyze/[variable].vue";

const layoutStubs = {
  "v-container": { template: '<div><slot /></div>' },
  "v-row": { template: '<div><slot /></div>' },
  "v-col": { template: '<div><slot /></div>' },
  "v-form": {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: '<form data-test="analysis-form"><slot /></form>',
  },
  "v-data-table": { template: '<div data-test="stats-table"></div>' },
  "v-select": { template: '<div data-test="select"></div>' },
  "v-text-field": { template: '<input data-test="input" />' },
  "v-icon": { template: '<i><slot /></i>' },
  "v-btn": {
    template: '<button data-test="action-btn" @click="$emit(\'click\')"><slot /></button>',
  },
};

describe("route /dataset/:id/analyze/:variable", () => {
  beforeEach(() => {
    installNuxtTestGlobals({
      nuxtApp: {
        $download: {
          saveAs: vi.fn(),
        },
      },
    });

    datasetStore = createDatasetStore({
      hasGeoJson: true,
      geoJson: { type: "FeatureCollection", features: [] },
    });
    analysisStore = createAnalysisStore();
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

  it("[smoke] renders analysis form and timeseries plot", async () => {
    const wrapper = await mountWithSuspense(AnalyzePage, { global: { stubs: layoutStubs } });

    await flushPromises();
    const page = wrapper.findComponent(AnalyzePage);

    expect(page.find('[data-test="analysis-form"]').exists()).toBe(true);
    expect(page.findComponent({ name: "TimeSeriesPlotStub" }).exists()).toBe(true);
  });

  it("[behavior] submits updated request data when Update is clicked", async () => {
    const wrapper = await mountWithSuspense(AnalyzePage, { global: { stubs: layoutStubs } });
    const page = wrapper.findComponent(AnalyzePage);

    await flushPromises();

    const updateButton = page
      .findAll('[data-test="action-btn"]')
      .find((button) => button.text().includes("Update"));

    expect(updateButton).toBeDefined();
    await updateButton!.trigger("click");
    await flushPromises();

    expect(analysisStore.setRequestData).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
  });
});
