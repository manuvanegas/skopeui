import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createGeomanInstance } from "@geoman-io/maplibre-geoman-free";
import MapLibre from "@/components/dataset/MapLibre.client.vue";
import metadataFixture from "@/tests/fixtures/metadata-1.0.0.json";
import { SkopeColorbar } from "@/utils/SkopeColorbar";

const ppt = metadataFixture.datasets[0].variables[0];

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
    numberOfCells: 0,
    areaInSquareKm: 0,
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

    addControl = vi.fn((control: any) => control?.onAdd?.(this));
    fitBounds = vi.fn();
    remove = vi.fn();
    setLayoutProperty = vi.fn((id: string, property: string, value: string) => {
      const layer = this.style.layers.find((entry) => entry.id === id);
      if (!layer) return;
      layer.layout = layer.layout || {};
      layer.layout[property] = value;
    });

    constructor(readonly options: any) {
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
      this.style.layers.push({
        ...layer,
        layout: layer.layout ? { ...layer.layout } : undefined,
      });
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

vi.mock("@/stores/messages", () => ({
  useMessagesStore: () => ({
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
    clearMessages: vi.fn(),
  }),
}));

vi.mock("@/composables/useLegacyStoreActions", () => ({
  useLegacyStoreActions: () => mocks.legacyActions,
}));

vi.mock("@/store/modules/constants", () => ({
  TILES_ENDPOINT: "https://test.example.com/tiles",
  DEFAULT_BASEMAP: "Esri.WorldTopoMap",
  LEAFLET_PROVIDERS: [
    {
      name: "CartoDB.Positron",
      url: "https://{s}.example.com/light/{z}/{x}/{y}{r}.png",
      attribution: "Carto",
      subdomains: "ab",
    },
    {
      name: "Esri.WorldTopoMap",
      url: "https://example.com/topo/{z}/{y}/{x}",
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

const VTooltipStub = defineComponent({
  name: "VTooltipStub",
  template: '<div><slot name="activator" :props="{}" /><slot /></div>',
});

const VListItemStub = defineComponent({
  name: "VListItemStub",
  props: { title: { type: String, default: "" } },
  emits: ["click"],
  setup(props, { emit }) {
    return () => h("div", { onClick: () => emit("click") }, props.title);
  },
});

const uiStubs = {
  "v-card": { template: "<div><slot /></div>" },
  "v-toolbar": { template: "<div><slot /></div>" },
  "v-row": { template: "<div><slot /></div>" },
  "v-spacer": { template: "<div />" },
  "v-text-field": { template: "<input />" },
  "v-btn": { template: "<button><slot /></button>" },
  "v-icon": { template: "<i><slot /></i>" },
  "v-card-text": { template: "<div><slot /></div>" },
  "v-tooltip": VTooltipStub,
  "v-menu": VTooltipStub,
  "v-list": { template: "<div><slot /></div>" },
  "v-list-subheader": { template: "<div><slot /></div>" },
  "v-list-item": VListItemStub,
};

describe("MapLibre basemap selector", () => {
  beforeEach(() => {
    mocks.routeState.name = "dataset-id";
    mocks.routeState.params = { id: "paleocar" };
    mocks.datasetStore.geoJson = null;
    mocks.datasetStore.metadata = { id: "paleocar", variables: [] } as any;
    mocks.datasetStore.variable = null;

    mocks.mapInstances.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("[behavior] starts on the default basemap", async () => {
    await mount(MapLibre, {
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

  it("[behavior] starts on the default basemap on visualize too", async () => {
    mocks.routeState.name = "dataset-id-visualize-variable";
    mocks.routeState.params = { id: "paleocar", variable: "ppt_annual" };

    mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();

    const map = mocks.mapInstances[0];
    expect(
      map.getLayer("basemap-layer-esri-worldtopomap").layout?.visibility,
    ).toBe("visible");
    expect(
      map.getLayer("basemap-layer-cartodb-positron").layout?.visibility,
    ).toBe("none");
  });

  it("[behavior] updates basemap visibility when selection changes", async () => {
    const wrapper = mount(MapLibre, {
      global: {
        stubs: uiStubs,
      },
    });

    await flushPromises();
    await nextTick();

    const map = mocks.mapInstances[0];
    // The basemap menu is teleported into its own MapLibre control.
    const control = map.addControl.mock.results
      .map((result: any) => result.value)
      .find((el: any) => el?.querySelector?.('[data-test="basemap-button"]'));
    const carto = [
      ...control.querySelectorAll('[data-test="basemap-option"]'),
    ].find((el: any) => el.textContent === "CartoDB.Positron");
    carto.click();
    await flushPromises();
    await nextTick();

    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      "basemap-layer-cartodb-positron",
      "visibility",
      "visible",
    );
    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      "basemap-layer-esri-worldtopomap",
      "visibility",
      "none",
    );

    expect(
      map.getLayer("basemap-layer-cartodb-positron").layout?.visibility,
    ).toBe("visible");
    expect(
      map.getLayer("basemap-layer-esri-worldtopomap").layout?.visibility,
    ).toBe("none");
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

    await mount(MapLibre, {
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

  it("[behavior] leaves colouring to the API in tile requests", async () => {
    mocks.routeState.name = "dataset-id-visualize-variable";
    mocks.routeState.params = { id: "paleocar", variable: "ppt_annual" };
    mocks.datasetStore.variable = ppt;

    await mount(MapLibre, {
      global: { stubs: uiStubs },
      props: { step: 1500 },
    });
    await flushPromises();
    await nextTick();

    const source = mocks.mapInstances[0].getStyle().sources["cog-source-a"];
    expect(source.tiles[0]).toBe(
      "https://test.example.com/tiles/paleocar/ppt_annual/1500/{z}/{x}/{y}",
    );
  });

  it("[behavior] draws the legend from the display entry unchanged", async () => {
    mocks.routeState.name = "dataset-id-visualize-variable";
    mocks.routeState.params = { id: "paleocar", variable: "ppt_annual" };
    mocks.datasetStore.variable = ppt;

    await mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();
    await nextTick();

    const colorbar = mocks.mapInstances[0].addControl.mock.calls
      .map(([control]: any[]) => control)
      .find((control: any) => control instanceof SkopeColorbar);
    expect(colorbar._options).toEqual({
      colors: ppt.display.colors,
      range: [0, 1807.5],
      ticks: 5,
      units: "mm",
    });
  });

  it("[behavior] opens on the dataset's map_view", async () => {
    mocks.datasetStore.metadata = {
      id: "paleocar",
      variables: [],
      bbox: [-115, 31, -102, 43],
      map_view: { center: { lon: -108.5, lat: 37 }, zoom: 4 },
    };

    mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();

    const { options } = mocks.mapInstances[0];
    expect(options.center).toEqual([-108.5, 37]);
    expect(options.zoom).toBe(4);
    expect(options.bounds).toBeUndefined();
  });

  it("[behavior] fits the dataset's bbox without a map_view", async () => {
    mocks.datasetStore.metadata = {
      id: "paleocar",
      variables: [],
      bbox: [-115, 31, -102, 43],
      map_view: null,
    };

    mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();

    const { options } = mocks.mapInstances[0];
    expect(options.bounds).toEqual([-115, 31, -102, 43]);
    expect(options.center).toBeUndefined();
  });

  it("[behavior] outlines the bbox and requests tiles only inside it", async () => {
    mocks.routeState.name = "dataset-id-visualize-variable";
    mocks.routeState.params = { id: "paleocar", variable: "tasmax" };
    mocks.datasetStore.metadata = {
      id: "paleocar",
      variables: [],
      bbox: [-115, 31, -102, 43],
      map_view: null,
    };

    mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();
    await nextTick();

    const { sources } = mocks.mapInstances[0].getStyle();
    expect(sources["cog-source-a"].bounds).toEqual([-115, 31, -102, 43]);
    expect(
      sources["dataset-region"].data.features[0].geometry.coordinates,
    ).toEqual([
      [
        [-115, 31],
        [-102, 31],
        [-102, 43],
        [-115, 43],
        [-115, 31],
      ],
    ]);
  });

  it("[behavior] requests tiles by the timestep's key", async () => {
    mocks.routeState.name = "dataset-id-visualize-variable";
    mocks.routeState.params = { id: "paleocar", variable: "ppt_annual" };
    mocks.datasetStore.variable = ppt;

    await mount(MapLibre, {
      global: { stubs: uiStubs },
      props: { step: 590 },
    });
    await flushPromises();
    await nextTick();

    const source = mocks.mapInstances[0].getStyle().sources["cog-source-a"];
    expect(source.tiles[0]).toContain("/ppt_annual/0590/{z}/{x}/{y}");
  });

  it("[behavior] draws a point study area and doesn't zoom all the way in", async () => {
    mocks.routeState.name = "dataset-id-visualize-variable";
    mocks.routeState.params = { id: "paleocar", variable: "ppt_annual" };
    mocks.datasetStore.geoJson = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-108.5, 37] },
    };

    mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();
    await nextTick();

    const map = mocks.mapInstances[0];
    const point = map.getLayer("study-area-display-point");
    expect(point.type).toBe("circle");
    expect(point.filter).toEqual(["==", ["geometry-type"], "Point"]);
    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [-108.5, 37],
        [-108.5, 37],
      ],
      expect.objectContaining({ maxZoom: 10 }),
    );
  });

  it("[behavior] offers only the four study-area drawing tools", async () => {
    mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();

    const [, options] = vi.mocked(createGeomanInstance).mock.calls[0];
    const { draw, edit, helper } = (options as any).controls;
    expect(
      Object.keys(draw).filter((mode) => draw[mode].uiEnabled === false),
    ).toEqual(["circle_marker", "text_marker", "ellipse", "line"]);
    expect(draw.marker.title).toBe("Point: Click the map to place the point.");
    expect(edit.cut).toEqual({ uiEnabled: false });
    expect(edit.delete.title).toBe("Delete: Click the shape to remove it.");
    expect(edit.change.title).toBe(
      "Change: Drag a corner to change the shape.",
    );
    expect(helper.snapping).toEqual({ uiEnabled: false, active: true });
    expect(helper.zoom_to_features.title).toBe("Zoom to shape");
  });

  it("[behavior] explains the active drawing tool next to the pointer", async () => {
    const wrapper = mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();
    const handlers = mocks.mapInstances[0].eventHandlers;
    const cursorHint = () => wrapper.find('[data-test="draw-cursor-hint"]');
    const callout = () => wrapper.find('[data-test="draw-callout"]');
    expect(callout().text()).toMatch(/Choose a shape/);
    const [moved] = handlers.mousemove;
    moved({ point: { x: 120, y: 80 } });
    await nextTick();
    expect(cursorHint().exists()).toBe(false);

    const [toggled] = handlers["gm:globaldrawmodetoggled"];
    toggled({ enabled: true, shape: "circle" });
    await nextTick();
    expect(cursorHint().text()).toBe(
      "Click the center, then click again to set the radius.",
    );
    expect(cursorHint().attributes("style")).toContain("left: 120px");
    // The header's callout stays while a tool is active.
    expect(callout().text()).toMatch(/Choose a shape/);

    const [left] = handlers.mouseout;
    left();
    await nextTick();
    expect(cursorHint().exists()).toBe(false);

    moved({ point: { x: 10, y: 10 } });
    toggled({ enabled: false, shape: "circle" });
    await nextTick();
    expect(cursorHint().exists()).toBe(false);
    expect(callout().text()).toMatch(/Choose a shape/);
  });

  it("[behavior] explains the edit tools once there's a shape", async () => {
    mocks.datasetStore.geoJson = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-108.5, 37] },
    } as any;
    const wrapper = mount(MapLibre, { global: { stubs: uiStubs } });
    await flushPromises();
    const handlers = mocks.mapInstances[0].eventHandlers;
    const callout = () => wrapper.find('[data-test="draw-callout"]');
    const cursorHint = () => wrapper.find('[data-test="draw-cursor-hint"]');
    expect(callout().text()).toMatch(/Draw a new shape to replace this one/);

    handlers.mousemove[0]({ point: { x: 120, y: 80 } });
    // geoman calls the change mode "edit" in its events.
    const [changeToggled] = handlers["gm:globaleditmodetoggled"];
    const [rotateToggled] = handlers["gm:globalrotatemodetoggled"];
    changeToggled({ enabled: true });
    await nextTick();
    expect(cursorHint().text()).toBe("Drag a corner to change the shape.");
    expect(callout().text()).toMatch(/Draw a new shape to replace this one/);

    // Switching tools may report the new one before the old one ends.
    rotateToggled({ enabled: true });
    changeToggled({ enabled: false });
    await nextTick();
    expect(cursorHint().text()).toBe("Drag a corner to rotate the shape.");

    rotateToggled({ enabled: false });
    await nextTick();
    expect(cursorHint().exists()).toBe(false);
    expect(callout().exists()).toBe(true);
  });

  it("[behavior] offers the GeoJSON download only once there's a shape", async () => {
    const downloadDisabled = async () => {
      const wrapper = mount(MapLibre, { global: { stubs: uiStubs } });
      await flushPromises();
      return wrapper
        .findAll("button")
        .find((b) => b.text() === "Download GeoJSON")!
        .attributes("disabled");
    };
    expect(await downloadDisabled()).toBeDefined();

    mocks.datasetStore.geoJson = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-108.5, 37] },
    } as any;
    expect(await downloadDisabled()).toBeUndefined();
  });

  it("[behavior] zooms to a point shape without zooming all the way in", async () => {
    vi.useFakeTimers();
    mocks.datasetStore.geoJson = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [-108.5, 37] },
    } as any;
    mount(MapLibre, { global: { stubs: uiStubs } });
    await vi.runAllTimersAsync();
    const map = mocks.mapInstances[0];
    map.fitBounds.mockClear();

    const [zoomed] = map.eventHandlers["gm:globalzoom_to_featuresmodetoggled"];
    zoomed({ enabled: true });
    vi.runAllTimers();
    vi.useRealTimers();

    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [-108.5, 37],
        [-108.5, 37],
      ],
      expect.objectContaining({ maxZoom: 10 }),
    );
  });
});
