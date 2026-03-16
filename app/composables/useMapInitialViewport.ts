type MapRegion = {
  center?: unknown;
  zoom?: unknown;
};

type DatasetMetadataLike = {
  region?: MapRegion;
} | null | undefined;

const DEFAULT_MAP_CENTER: [number, number] = [0, 0];
const DEFAULT_MAP_ZOOM = 2;

function isLatLngCenter(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && value.every((coord) => typeof coord === "number" && Number.isFinite(coord));
}

/**
 * Selects a safe initial viewport from dataset metadata.
 * This is map-library agnostic and can be reused by Leaflet/MapLibre adapters.
 */
export function getInitialMapViewport(metadata: DatasetMetadataLike): {
  center: [number, number];
  zoom: number;
} {
  const center = isLatLngCenter(metadata?.region?.center)
    ? metadata.region.center
    : DEFAULT_MAP_CENTER;

  const zoom = typeof metadata?.region?.zoom === "number" && Number.isFinite(metadata.region.zoom)
    ? metadata.region.zoom
    : DEFAULT_MAP_ZOOM;

  return { center, zoom };
}
