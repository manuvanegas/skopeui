import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import Map from "@/components/dataset/Map.client.vue";

const route = { query: {} as Record<string, string> };
vi.mock("vue-router", () => ({ useRoute: () => route }));
vi.mock("@/components/dataset/LeafletMap.client.vue", () => ({
  default: { name: "LeafletStub", template: '<div data-test="leaflet" />' },
}));
vi.mock("@/components/dataset/MapLibre.client.vue", () => ({
  default: { name: "MapLibreStub", template: '<div data-test="maplibre" />' },
}));

function engine() {
  const wrapper = mount(Map);
  if (wrapper.find('[data-test="leaflet"]').exists()) return "leaflet";
  if (wrapper.find('[data-test="maplibre"]').exists()) return "maplibre";
  return "none";
}

function configure(mapEngine: string) {
  vi.stubGlobal("useRuntimeConfig", () => ({ public: { mapEngine } }));
}

describe("Map engine", () => {
  afterEach(() => {
    route.query = {};
    vi.unstubAllGlobals();
  });

  it.each(["maplibre", "leaflet"])("uses the configured engine: %s", (name) => {
    configure(name);
    expect(engine()).toBe(name);
  });

  it("lets ?map_engine=leaflet pick Leaflet", () => {
    configure("maplibre");
    route.query = { map_engine: "leaflet" };
    expect(engine()).toBe("leaflet");
  });
});
