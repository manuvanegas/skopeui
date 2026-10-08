import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAppStore,
  createDatasetStore,
} from "@/tests/fixtures/page-fixtures";
import {
  installNuxtTestGlobals,
  mountWithSuspense,
  resetNuxtTestGlobals,
} from "@/tests/fixtures/nuxt-test-helpers";

import DatasetIdPage from "@/pages/dataset/[id]/index.vue";

let routeParams = { id: "paleocar" };
let datasetStore: any;
let appStore: any;
let legacyActions: any;

vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: routeParams,
  }),
}));

vi.mock("@/components/LoadingSpinner.vue", () => ({
  default: {
    name: "LoadingSpinnerStub",
    template: '<div data-test="loading">loading</div>',
  },
}));

vi.mock("@/components/dataset/SubHeader.vue", () => ({
  default: {
    name: "SubHeaderStub",
    template: '<div data-test="subheader"><slot /></div>',
  },
}));

vi.mock("@/components/dataset/Map.client.vue", () => ({
  default: {
    name: "MapStub",
    props: ["displayRaster"],
    template:
      '<div data-test="map" :data-display-raster="String(displayRaster)">map</div>',
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

const layoutStubs = {
  "v-container": { template: "<div><slot /></div>" },
  "v-row": { template: "<div><slot /></div>" },
  "v-col": { template: "<div><slot /></div>" },
  "client-only": { template: "<div><slot /></div>" },
  "v-dialog": { template: "<div><slot /></div>" },
  "v-card": { template: "<div><slot /></div>" },
  "v-card-text": { template: "<div><slot /></div>" },
  "v-card-actions": { template: "<div><slot /></div>" },
  "v-icon": { template: "<i><slot /></i>" },
  "v-btn": {
    props: ["disabled"],
    template: '<button data-test="btn" :disabled="disabled"><slot /></button>',
  },
};

describe("route /dataset/:id", () => {
  beforeEach(() => {
    installNuxtTestGlobals();

    routeParams = { id: "paleocar" };
    datasetStore = createDatasetStore({ hasGeoJson: false });
    appStore = createAppStore();
    legacyActions = {
      initializeDataset: vi.fn(async () => true),
      clearGeoJson: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetNuxtTestGlobals();
  });

  it("[smoke] loads the dataset and shows the selection map without tiles", async () => {
    const wrapper = await mountWithSuspense(DatasetIdPage, {
      global: { stubs: layoutStubs },
    });

    await flushPromises();
    const map = wrapper.findComponent(DatasetIdPage).find('[data-test="map"]');

    expect(legacyActions.initializeDataset).toHaveBeenCalledWith("paleocar");
    expect(map.attributes("data-display-raster")).toBe("false");
  });

  it("[behavior] enables Visualize button only when study area is valid", async () => {
    const wrapper = await mountWithSuspense(DatasetIdPage, {
      global: { stubs: layoutStubs },
    });
    const page = wrapper.findComponent(DatasetIdPage);

    const visualizeButton = page.find('[data-test="btn"]');
    expect(visualizeButton.attributes("disabled")).toBeDefined();

    datasetStore.hasGeoJson = true;
    await nextTick();

    expect(visualizeButton.attributes("disabled")).toBeUndefined();
  });
});
