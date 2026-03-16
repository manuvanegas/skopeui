import { reactive, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDatasetStore,
  datasetMetadataFixture,
} from "@/tests/fixtures/page-fixtures";
import {
  installNuxtTestGlobals,
  mountWithSuspense,
  resetNuxtTestGlobals,
} from "@/tests/fixtures/nuxt-test-helpers";

let datasetStore: any;
let metadataStore: any;
let messagesStore: any;
let legacyActions: any;

vi.mock("@/components/dataset/Search.vue", () => ({
  default: {
    name: "SearchStub",
    template: '<div data-test="search">search</div>',
  },
}));

vi.mock("@/components/dataset/ListItem.vue", () => ({
  default: {
    name: "ListItemStub",
    props: ["title"],
    template: '<div data-test="dataset-item">{{ title }}</div>',
  },
}));

vi.mock("@/stores/dataset", () => ({
  useDatasetStore: () => datasetStore,
}));

vi.mock("@/stores/metadata", () => ({
  useMetadataStore: () => metadataStore,
}));

vi.mock("@/stores/messages", () => ({
  useMessagesStore: () => messagesStore,
}));

vi.mock("@/composables/useLegacyStoreActions", () => ({
  useLegacyStoreActions: () => legacyActions,
}));

import IndexPage from "@/pages/index.vue";

const layoutStubs = {
  "v-container": { template: '<div><slot /></div>' },
  "v-row": { template: '<div><slot /></div>' },
  "v-col": { template: '<div><slot /></div>' },
  "v-tooltip": { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
  "v-btn": { template: '<button><slot /></button>' },
  "v-icon": { template: '<i><slot /></i>' },
  "v-card": { template: '<div><slot /></div>' },
  "v-alert": { template: '<div><slot /></div>' },
};

describe("route /", () => {
  beforeEach(() => {
    installNuxtTestGlobals();

    datasetStore = createDatasetStore();
    metadataStore = reactive({
      filteredDatasets: [{ ...datasetMetadataFixture, absoluteUrl: "/dataset/paleocar" }],
    });
    messagesStore = {
      error: vi.fn(),
    };
    legacyActions = {
      loadAllDatasetMetadata: vi.fn(async () => true),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetNuxtTestGlobals();
  });

  it("[smoke] renders page header and dataset list", async () => {
    const wrapper = await mountWithSuspense(IndexPage, { global: { stubs: layoutStubs } });

    await nextTick();
    const page = wrapper.findComponent(IndexPage);

    expect(page.exists()).toBe(true);
    expect(page.text()).toContain("Select a Dataset");
    expect(page.text()).toContain("PaleoCAR");
    expect(legacyActions.loadAllDatasetMetadata).toHaveBeenCalledTimes(1);
  });

  it("[behavior] shows empty state when filter removes all datasets", async () => {
    const wrapper = await mountWithSuspense(IndexPage, { global: { stubs: layoutStubs } });

    metadataStore.filteredDatasets = [];
    await nextTick();
    const page = wrapper.findComponent(IndexPage);

    expect(page.text()).toContain("No datasets found");
  });
});
