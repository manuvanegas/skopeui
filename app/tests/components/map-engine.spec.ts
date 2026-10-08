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
  return wrapper.find('[data-test="leaflet"]').exists()
    ? "leaflet"
    : "maplibre";
}

describe("Map engine", () => {
  afterEach(() => {
    route.query = {};
    vi.unstubAllGlobals();
  });

  it("uses the configured engine", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: { mapEngine: "maplibre" },
    }));
    expect(engine()).toBe("maplibre");
  });

  it("lets ?map_engine=leaflet pick Leaflet", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      public: { mapEngine: "maplibre" },
    }));
    route.query = { map_engine: "leaflet" };
    expect(engine()).toBe("leaflet");
  });
});
