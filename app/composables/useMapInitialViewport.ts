import type { Dataset } from "@/types/metadata";

/** WGS 84 [west, south, east, north], the order /metadata uses. */
export type Bbox = [number, number, number, number];

type CenterViewport = { center: { lon: number; lat: number }; zoom: number };

export type MapViewport = CenterViewport | { bbox: Bbox };

const DEFAULT_VIEWPORT: CenterViewport = {
  center: { lon: 0, lat: 0 },
  zoom: 2,
};

/**
 * Where a map of the dataset first looks: its map_view when it has one,
 * otherwise its whole bbox (STYLE-011). Map-library agnostic, so Leaflet and
 * MapLibre adapters share it.
 */
export function getInitialMapViewport(
  dataset: Pick<Dataset, "map_view" | "bbox"> | null | undefined,
): MapViewport {
  if (dataset?.map_view) {
    const { center, zoom } = dataset.map_view;
    return { center: { lon: center.lon, lat: center.lat }, zoom };
  }
  if (dataset?.bbox) return { bbox: dataset.bbox };
  return DEFAULT_VIEWPORT;
}

/**
 * Where a Leaflet map starts. Leaflet needs a center and zoom up front, so a
 * bbox viewport starts from the default and is fitted with leafletBounds once
 * the map is ready.
 */
export function leafletStartView(viewport: MapViewport): {
  center: [number, number];
  zoom: number;
} {
  const start = "bbox" in viewport ? DEFAULT_VIEWPORT : viewport;
  return { center: [start.center.lat, start.center.lon], zoom: start.zoom };
}

/** A bbox as Leaflet bounds, [[south, west], [north, east]]. */
export function leafletBounds([west, south, east, north]: Bbox): [
  [number, number],
  [number, number],
] {
  return [
    [south, west],
    [north, east],
  ];
}
