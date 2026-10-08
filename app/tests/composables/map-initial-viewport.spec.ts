import { describe, expect, it } from "vitest";

import {
  getInitialMapViewport,
  leafletBounds,
  leafletStartView,
} from "@/composables/useMapInitialViewport";

const bbox: [number, number, number, number] = [-115, 31, -102, 43];

describe("getInitialMapViewport", () => {
  it("uses the dataset's map_view when it has one", () => {
    const viewport = getInitialMapViewport({
      bbox,
      map_view: { center: { lon: -108.5, lat: 37 }, zoom: 4 },
    });

    expect(viewport).toEqual({ center: { lon: -108.5, lat: 37 }, zoom: 4 });
  });

  it("fits the bbox when there is no map_view", () => {
    expect(getInitialMapViewport({ bbox, map_view: null })).toEqual({ bbox });
  });

  it("falls back to the whole world without a dataset", () => {
    expect(getInitialMapViewport(null)).toEqual({
      center: { lon: 0, lat: 0 },
      zoom: 2,
    });
  });
});

describe("Leaflet adapters", () => {
  it("swaps a center to Leaflet's latitude-first order", () => {
    expect(
      leafletStartView({ center: { lon: -108.5, lat: 37 }, zoom: 4 }),
    ).toEqual({ center: [37, -108.5], zoom: 4 });
  });

  it("starts a bbox viewport from the default, to be fitted when ready", () => {
    expect(leafletStartView({ bbox })).toEqual({ center: [0, 0], zoom: 2 });
  });

  it("turns a bbox into south-west and north-east corners", () => {
    expect(leafletBounds(bbox)).toEqual([
      [31, -115],
      [43, -102],
    ]);
  });
});
