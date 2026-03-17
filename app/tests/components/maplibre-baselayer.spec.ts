import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockLayer = {
  id: string;
  type: string;
  source: string;
  layout?: Record<string, any>;
};

type MockStyle = {
  version: number;
  sources: Record<string, any>;
  layers: MockLayer[];
};

const mocks = vi.hoisted(() => {
  const routeState = {
    name: "dataset-id",
    params: { id: "paleocar" },
  };

  const appStore = {
    stepNames: [
      "index",
      "dataset-id",
      "dataset-id-visualize-variable",
      "dataset-id-analyze-variable",
    ],
  };

  const datasetStore = {
    metadata: {
      id: "paleocar",
      variables: [],
    },
    variable: null,
    temporalRangeMax: 2000,
    selectedAreaInSquareKm: "0.00",
    geoJson: null,
  } as any;

  const legacyActions = {
    initializeDatasetGeoJson: vi.fn(),
    saveGeoJson: vi.fn(),
    clearGeoJson: vi.fn(),
  };

  const geomanInstance = {
    addControls: vi.fn(async () => undefined),
    features: {
      deleteAll: vi.fn(async () => undefined),
      importGeoJson: vi.fn(async () => undefined),
    },
    destroy: vi.fn(),
  };

  const mapInstances: any[] = [];

  class MockMap {
    style: MockStyle;
    eventHandlers: Record<string, Function[]> = {};

    addControl = vi.fn();
    fitBounds = vi.fn();
    remove = vi.fn();
    setLayoutProperty = vi.fn((id: string, property: string, value: string) => {
      const layer = this.style.layers.find((entry) => entry.id === id);
      if (!layer) return;
      layer.layout = layer.layout || {};
      layer.layout[property] = value;
    });

    constructor(options: any) {
      this.style = {
        version: options.style.version,
        sources: { ...options.style.sources },
        layers: options.style.layers.map((layer: any) => ({
          ...layer,
          layout: layer.layout ? { ...layer.layout } : undefined,
        })),
      };
      mapInstances.push(this);
    }

    on(event: string, callback: Function) {
      if (!this.eventHandlers[event]) {
        this.eventHandlers[event] = [];
      }
      this.eventHandlers[event].push(callback);

      if (event === "load") {
        Promise.resolve().then(() => callback());
      }

      return this;
    }

    getLayer(id: string) {
      return this.style.layers.find((layer) => layer.id === id);
    }

    getStyle() {
      return this.style;
    }

    addSource(id: string, source: any) {
      this.style.sources[id] = source;
    }

    getSource(id: string) {
      const source = this.style.sources[id];
      if (!source) return undefined;
      return {
        setData: vi.fn((data: any) => {
          source.data = data;
        }),
      };
    }

    removeSource(id: string) {
      delete this.style.sources[id];
    }

    addLayer(layer: any) {
      this.style.layers.push({ ...layer, layout: layer.layout ? { ...layer.layout } : undefined });
    }

    removeLayer(id: string) {
      this.style.layers = this.style.layers.filter((layer) => layer.id !== id);
    }
  }

  return {
    routeState,
    appStore,
    datasetStore,
    legacyActions,
    geomanInstance,
    mapInstances,
    MockMap,
  };
});

vi.mock("vue-router", () => ({
  useRoute: () => mocks.routeState,
}));

vi.mock("@/stores/app", () => ({
  useAppStore: () => mocks.appStore,
}));

vi.mock("@/stores/dataset", () => ({
  useDatasetStore: () => mocks.datasetStore,
}));

vi.mock("@/composables/useLegacyStoreActions", () => ({
  useLegacyStoreActions: () => mocks.legacyActions,
}));

vi.mock("@/composables/useMapInitialViewport", () => ({
  getInitialMapViewport: () => ({ zoom: 2, center: [0, 0] }),
}));

vi.mock("@/store/modules/constants", () => ({
  LEAFLET_PROVIDERS: [
    {
      name: "CartoDB.Positron",
      url: "https://{s}.example.com/light/{z}/{x}/{y}{r}.png",
      visible: 2,
      attribution: "Carto",
      subdomains: "ab",
    },
    {
      name: "Esri.WorldTopoMap",
      url: "https://example.com/topo/{z}/{y}/{x}",
      visible: 1,
      attribution: "Esri",
    },
  ],
}));

vi.mock("maplibre-gl", () => ({
  default: {
    Map: mocks.MockMap,
    NavigationControl: class MockNavigationControl {},
    ScaleControl: class MockScaleControl {},
  },
}));

vi.mock("@geoman-io/maplibre-geoman-free", () => ({
  createGeomanInstance: vi.fn(async () => mocks.geomanInstance),
}));

import MapLibrePoc from "@/components/dataset/MapLibrePoc.client.vue";

const VTooltipStub = defineComponent({
  name: "VTooltipStub",
  template: '<div><slot name="activator" :props="{}" /><slot /></div>',
});

const VSelectStub = defineComponent({
  name: "VSelectStub",
  props: {
    modelValue: { type: String, default: "" },
    items: { type: Array, default: () => [] },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h(
        "select",
        {
          "data-test": "basemap-select",
          value: props.modelValue,
          onChange: (event: Event) => {
            const target = event.target as HTMLSelectElement | null;
            emit("update:modelValue", target?.value ?? "");
          },
        },
        (props.items as any[]).map((item: any) =>
          h("option", { key: item.value, value: item.value }, item.title)
        )
      );
  },
});

const uiStubs = {
  "v-card": { template: '<div><slot /></div>' },
  "v-toolbar": { template: '<div><slot /></div>' },
  "v-row": { template: '<div><slot /></div>' },
  "v-spacer": { template: '<div />' },
  "v-alert": { template: '<div><slot /></div>' },
  "v-text-field": { template: '<input />' },
  "v-btn": { template: '<button><slot /></button>' },
  "v-icon": { template: '<i><slot /></i>' },
  "v-card-text": { template: '<div><slot /></div>' },
  "v-tooltip": VTooltipStub,
  "v-select": VSelectStub,
};

describe("MapLibre basemap selector", () => {
  beforeEach(() => {
    mocks.routeState.name = "dataset-id";
    mocks.routeState.params = { id: "paleocar" };
    mocks.datasetStore.geoJson = null;
    mocks.datasetStore.metadata = { id: "paleocar", variables: [] } as any;

    mocks.mapInstances.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("[behavior] defaults to the step-configured basemap", async () => {
    await mount(MapLibrePoc, {
      global: {
        stubs: uiStubs,
      },
    });

    await flushPromises();
    await nextTick();

    const map = mocks.mapInstances[0];
    const topo = map.getLayer("basemap-layer-esri-worldtopomap");
    const carto = map.getLayer("basemap-layer-cartodb-positron");

    expect(topo.layout?.visibility).toBe("visible");
    expect(carto.layout?.visibility).toBe("none");
  });

  it("[behavior] updates basemap visibility when selection changes", async () => {
    const wrapper = mount(MapLibrePoc, {
      global: {
        stubs: uiStubs,
      },
    });

    await flushPromises();
    await nextTick();

    await wrapper.find('[data-test="basemap-select"]').setValue("cartodb-positron");
    await flushPromises();
    await nextTick();

    const map = mocks.mapInstances[0];

    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      "basemap-layer-cartodb-positron",
      "visibility",
      "visible"
    );
    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      "basemap-layer-esri-worldtopomap",
      "visibility",
      "none"
    );

    const topo = map.getLayer("basemap-layer-esri-worldtopomap");
    const carto = map.getLayer("basemap-layer-cartodb-positron");

    expect(carto.layout?.visibility).toBe("visible");
    expect(topo.layout?.visibility).toBe("none");
  });

  it("[behavior] keeps visualize mode read-only and renders selected area overlay", async () => {
    mocks.routeState.name = "dataset-id-visualize-variable";
    mocks.routeState.params = { id: "paleocar", variable: "tasmax" };
    mocks.datasetStore.geoJson = {
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
    };

    await mount(MapLibrePoc, {
      global: {
        stubs: uiStubs,
      },
    });

    await flushPromises();
    await nextTick();

    const map = mocks.mapInstances[0];

    expect(mocks.geomanInstance.addControls).not.toHaveBeenCalled();
    expect(map.getSource("study-area-display")).toBeDefined();
    expect(map.getLayer("study-area-display-fill")).toBeDefined();
    expect(map.getLayer("study-area-display-outline")).toBeDefined();
  });
});
