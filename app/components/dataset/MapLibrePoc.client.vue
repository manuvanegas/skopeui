<template>
  <v-card class="pb-2" height="100%" width="100%" elevation="1" variant="outlined">
    <v-toolbar variant="flat" class="ma-0 pa-0">
      <v-row class="mx-0" align="baseline">
        <v-tooltip location="bottom" text="Area of the selected geometry">
          <template #activator="{ props }">
            <h3
              class="font-weight-light text-center pa-2 my-auto"
              style="background-color: #e4e7ef"
              v-bind="props"
            >
              {{ selectedArea }} km<sup>2</sup>
            </h3>
          </template>
        </v-tooltip>
        <v-spacer></v-spacer>
        <v-alert
          v-if="isSelectArea"
          density="compact"
          variant="tonal"
          icon="mdi-pencil"
          color="secondary"
          class="my-auto"
        >
          Use the draw toolbar on the left to select an area of study.
        </v-alert>
        <v-select
          v-model="selectedBaseLayerId"
          :items="baseLayerOptions"
          item-title="title"
          item-value="value"
          label="Base map"
          density="compact"
          variant="outlined"
          hide-details
          class="mx-2 my-auto basemap-select"
        />
        <v-spacer></v-spacer>
        <input
          v-if="isSelectArea"
          id="loadGeoJsonFile"
          type="file"
          accept=".geojson"
          style="display: none"
          @change="loadGeoJson"
        />
        <v-tooltip v-if="isSelectArea" location="bottom" text="Upload study area from GeoJSON">
          <template #activator="{ props }">
            <v-btn
              size="small"
              color="secondary"
              variant="outlined"
              v-bind="props"
              class="my-auto"
              @click="selectGeoJsonFile"
            >
              <v-icon>mdi-upload</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
        <v-tooltip v-if="isSelectArea" location="bottom" text="Download selected area as GeoJSON">
          <template #activator="{ props }">
            <v-btn
              size="small"
              color="secondary"
              variant="flat"
              v-bind="props"
              class="mx-2 my-auto"
              @click="exportSelectedGeometry"
            >
              <a id="exportSelectedGeometry">
                <v-icon>mdi-download</v-icon>
              </a>
            </v-btn>
          </template>
        </v-tooltip>
      </v-row>
    </v-toolbar>
    <v-card-text class="map">
      <div ref="mapContainer" class="maplibre-map"></div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import maplibregl from "maplibre-gl";
import type { Geoman } from "@geoman-io/maplibre-geoman-free";
import { createGeomanInstance } from "@geoman-io/maplibre-geoman-free";
import circleToPolygon from "circle-to-polygon";
import { bbox as turfBbox } from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";
import {
  LEAFLET_PROVIDERS,
  TILES_ENDPOINT
} from "@/store/modules/constants";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import { getInitialMapViewport } from "@/composables/useMapInitialViewport";
import { useAppStore } from "@/stores/app";
import { useDatasetStore } from "@/stores/dataset";

const props = defineProps({
  step: { type: Number, default: 2000 },
  displayRaster: { type: Boolean, default: true },
  circleToPolygonEdges: { type: Number, default: 32 },
});
const emit = defineEmits(["mapReady", "stepReady"]);

const route = useRoute();
const appStore = useAppStore();
const datasetStore = useDatasetStore();
const legacyActions = useLegacyStoreActions();

const mapContainer = ref<HTMLElement | null>(null);

const stepNames = computed(() => appStore.stepNames);
const metadata = computed(() => datasetStore.metadata as any);
const selectedArea = computed(() => datasetStore.selectedAreaInSquareKm);
const currentStep = computed(() => stepNames.value.findIndex((x: unknown) => x === route.name));
const isSelectArea = computed(() => currentStep.value === 1);
const initialMapViewport = computed(() => getInitialMapViewport(metadata.value));
const initialMapZoom = computed(() => initialMapViewport.value.zoom);
const initialMapCenter = computed(() => initialMapViewport.value.center);

const cogBaseUrl = computed(getCogBaseUrl);

type MapLibreBaseLayer = {
  id: string;
  name: string;
  tiles: string[];
  attribution: string;
  visible: number | boolean | undefined;
};

function providerNameToId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function resolveSubdomains(provider: any): string[] {
  if (Array.isArray(provider?.subdomains) && provider.subdomains.length > 0) {
    return provider.subdomains;
  }
  if (typeof provider?.subdomains === "string" && provider.subdomains.length > 0) {
    return provider.subdomains.split("");
  }
  return ["a", "b", "c", "d"];
}

function providerToMapLibreTiles(provider: any): string[] {
  const urlTemplate = String(provider?.url || "").replace(/\{r\}/g, "");
  if (!urlTemplate) return [];

  if (!urlTemplate.includes("{s}")) {
    return [urlTemplate];
  }

  return resolveSubdomains(provider).map((subdomain) =>
    urlTemplate.replace(/\{s\}/g, subdomain)
  );
}

const mapBaseLayers: MapLibreBaseLayer[] = LEAFLET_PROVIDERS.map((provider: any) => ({
  id: providerNameToId(provider.name),
  name: provider.name,
  tiles: providerToMapLibreTiles(provider),
  attribution: provider.attribution,
  visible: provider.visible,
})).filter((provider: MapLibreBaseLayer) => provider.tiles.length > 0);

function getDefaultBaseLayerId(step: number) {
  const matchedByStep = mapBaseLayers.find((provider) => provider.visible === step);
  return (matchedByStep || mapBaseLayers[0])?.id || "";
}

const selectedBaseLayerId = ref(getDefaultBaseLayerId(currentStep.value));
const baseLayerOptions = computed(() =>
  mapBaseLayers.map((provider) => ({ title: provider.name, value: provider.id }))
);

let map: maplibregl.Map | null = null;
let gm: Geoman | null = null;
let ignoreStoreWatch = false;
let syncDrawQueue: Promise<void> = Promise.resolve();
let isMapLoaded = false;
let pendingStudyAreaGeoJson: any = null;

const COG_A = { sourceId: "cog-source-a", layerId: "cog-layer-a" };
const COG_B = { sourceId: "cog-source-b", layerId: "cog-layer-b" };
let cogFront = COG_A;  // currently visible slot
let cogBack  = COG_B;  // currently loading / empty slot
let pendingIdleSwap: (() => void) | null = null;
const FILL_LAYER_ID = "dataset-region-fill";
const STUDY_AREA_SOURCE_ID = "study-area-display";
const STUDY_AREA_FILL_LAYER_ID = "study-area-display-fill";
const STUDY_AREA_LINE_LAYER_ID = "study-area-display-outline";

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] as any[] };
}

function baseSourceId(baseLayerId: string) {
  return `basemap-source-${baseLayerId}`;
}

function baseLayerId(baseLayerId: string) {
  return `basemap-layer-${baseLayerId}`;
}

function applyBaseLayerSelection(baseLayerIdValue: string) {
  if (!map || !isMapLoaded) return;
  for (const provider of mapBaseLayers) {
    const rasterLayerId = baseLayerId(provider.id);
    if (!map.getLayer(rasterLayerId)) continue;
    map.setLayoutProperty(
      rasterLayerId,
      "visibility",
      provider.id === baseLayerIdValue ? "visible" : "none"
    );
  }
}

function baseStyle(): maplibregl.StyleSpecification {
  const activeBaseLayerId = selectedBaseLayerId.value;

  return {
    version: 8,
    sources: mapBaseLayers.reduce((sources: Record<string, maplibregl.SourceSpecification>, provider) => {
      sources[baseSourceId(provider.id)] = {
        type: "raster",
        tiles: provider.tiles,
        tileSize: 256,
        attribution: provider.attribution,
      };
      return sources;
    }, {}),
    layers: mapBaseLayers.map((provider) => ({
      id: baseLayerId(provider.id),
      type: "raster",
      source: baseSourceId(provider.id),
      layout: { visibility: provider.id === activeBaseLayerId ? "visible" : "none" },
    })),
  } as maplibregl.StyleSpecification;
}

function getCogBaseUrl(): string | null {
  if (!props.displayRaster || !route.params.variable) return null;
  const datasetId = route.params.id;
  const varId = route.params.variable;
  return `${TILES_ENDPOINT}/${datasetId}/${varId}`;
}

function getCogFullUrl(baseUrl, step) {
  if (datasetStore.variable.min == null || datasetStore.variable.max == null){
    console.warn(`Variable ${datasetStore.variable?.id} is missing min/max — falling back to rescale 0,100`)
  } 
  const min = datasetStore.variable?.min ?? 0;
  const max = datasetStore.variable?.max * 0.9 ?? 100;
  const urlStep = step.toString().padStart(4, "0"); // TODO: Add flexibility for different time resolutions
  return `${baseUrl}/${urlStep}/{z}/{x}/{y}?colormap=rain&rescale=${min},${max}`; // TODO: Add colormap flexibility
}

function getCogBounds(): number[] | undefined {
  const extents = metadata.value?.region?.extents;
  const nw = extents?.[0];
  const se = extents?.[1];
  if (Array.isArray(nw) && Array.isArray(se)) {
    const [north, west] = nw;
    const [south, east] = se;
    return [west, south, east, north];
  }
  return undefined;
}

function addCogSlot(slot: typeof COG_A, step: number, opacity: number) {
  if (!map || !isMapLoaded || !cogBaseUrl.value) return;
  const url = getCogFullUrl(cogBaseUrl.value, step);
  const bounds = getCogBounds();
  map.addSource(slot.sourceId, {
    type: "raster",
    tiles: [url],
    tileSize: 128,
    ...(bounds && { bounds }),
  });
  map.addLayer(
    { id: slot.layerId, type: "raster", source: slot.sourceId,
      paint: { "raster-opacity": opacity } },
    FILL_LAYER_ID,
  );
}

function removeCogSlot(slot: typeof COG_A) {
  if (!map) return;
  if (map.getLayer(slot.layerId))   map.removeLayer(slot.layerId);
  if (map.getSource(slot.sourceId)) map.removeSource(slot.sourceId);
}

function cancelPendingSwap() {
  if (pendingIdleSwap) {
    map?.off("idle", pendingIdleSwap);
    pendingIdleSwap = null;
    removeCogSlot(cogBack);  // discard the back buffer that was loading
  }
}

function addCogRasterLayer(step: number) {
  if (!map || !isMapLoaded || !cogBaseUrl.value) return;
  cancelPendingSwap();
  removeCogSlot(cogFront);
  removeCogSlot(cogBack);
  cogFront = COG_A;
  cogBack  = COG_B;
  addCogSlot(cogFront, step, 0.7);
}

function removeCogRasterLayer() {
  if (!map || !isMapLoaded) return;
  cancelPendingSwap();
  removeCogSlot(cogFront);
  removeCogSlot(cogBack);
}

function updateRasterLayer(step: number) {
  if (!map || !isMapLoaded || !cogBaseUrl.value) return;
  if (!map.getSource(cogFront.sourceId)) {
    addCogRasterLayer(step);
    return;
  }

  cancelPendingSwap();
  addCogSlot(cogBack, step, 0);  // load invisibly

  pendingIdleSwap = () => {
    if (!map || !isMapLoaded) return;
    if (!map.getSource(cogBack.sourceId)) return;  // guard: swap was cancelled
    map.setPaintProperty(cogBack.layerId, "raster-opacity", 0.7);
    removeCogSlot(cogFront);
    [cogFront, cogBack] = [cogBack, cogFront];      // swap references
    pendingIdleSwap = null;
    emit("stepReady");
  };
  map.once("idle", pendingIdleSwap);
}

function mapExtentPolygon(extents: any): any {
  const sw = extents?.[0];
  const ne = extents?.[1];
  if (!Array.isArray(sw) || !Array.isArray(ne)) {
    return { type: "FeatureCollection", features: [] };
  }
  const [south, west] = sw;
  const [north, east] = ne;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
      },
    ],
  };
}

function normalizeGeoJson(geoJson: any): any {
  if (!geoJson) return null;
  if (geoJson.type === "FeatureCollection") return geoJson;
  if (geoJson.type === "Feature") return { type: "FeatureCollection", features: [geoJson] };
  if (geoJson.type && geoJson.coordinates) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: geoJson,
        },
      ],
    };
  }
  return null;
}

function normalizeGeoJsonForImport(geoJson: any): any {
  const featureCollection = normalizeGeoJson(geoJson);
  if (!featureCollection) return null;

  return {
    ...featureCollection,
    features: featureCollection.features.map((feature: any) => convertCircleToPolygon(feature)),
  };
}

function convertCircleToPolygon(feature: any): any {
  if (!feature?.geometry || feature.geometry.type !== "Circle") return feature;

  const [lon, lat] = feature.geometry.coordinates || [0, 0];
  const radiusKm = (feature.geometry.radius || 1000) / 1000;

  try {
    const polygon = circleToPolygon([lon, lat], radiusKm, {
      numberOfEdges: props.circleToPolygonEdges,
    });
    return {
      ...feature,
      geometry: polygon.geometry,
      properties: {
        ...feature.properties,
        originalShape: "circle",
      },
    };
  } catch {
    return feature;
  }
}

function fitToGeoJson(geoJson: any) {
  if (!map || !geoJson) return;
  try {
    const [minX, minY, maxX, maxY] = turfBbox(geoJson as any);
    map.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: 30, duration: 0 }
    );
  } catch {
    // Ignore invalid geometries during exploratory migration.
  }
}

function ensureStudyAreaDisplayLayer() {
  if (!map) return;

  if (!map.getSource(STUDY_AREA_SOURCE_ID)) {
    map.addSource(STUDY_AREA_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection() as any,
    });
  }

  if (!map.getLayer(STUDY_AREA_FILL_LAYER_ID)) {
    map.addLayer({
      id: STUDY_AREA_FILL_LAYER_ID,
      type: "fill",
      source: STUDY_AREA_SOURCE_ID,
      paint: {
        "fill-color": "#facc15",
        "fill-opacity": 0.08,
      },
    });
  }

  if (!map.getLayer(STUDY_AREA_LINE_LAYER_ID)) {
    map.addLayer({
      id: STUDY_AREA_LINE_LAYER_ID,
      type: "line",
      source: STUDY_AREA_SOURCE_ID,
      paint: {
        "line-color": "#111827",
        "line-width": 2,
      },
    });
  }
}

function bringStudyAreaDisplayToFront() {
  if (!map || typeof (map as any).moveLayer !== "function") {
    return;
  }

  if (!map.getLayer(STUDY_AREA_LINE_LAYER_ID) || !map.getLayer(STUDY_AREA_FILL_LAYER_ID)) {
    return;
  }

  map.moveLayer(STUDY_AREA_FILL_LAYER_ID);
  map.moveLayer(STUDY_AREA_LINE_LAYER_ID);
}

function updateStudyAreaDisplay(geoJson: any) {
  if (!map || !isMapLoaded) {
    pendingStudyAreaGeoJson = geoJson;
    return;
  }

  ensureStudyAreaDisplayLayer();
  const source = map.getSource(STUDY_AREA_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;

  const featureCollection = normalizeGeoJsonForImport(geoJson) || emptyFeatureCollection();
  source.setData(featureCollection as any);
  bringStudyAreaDisplayToFront();

  if (featureCollection.features.length > 0) {
    fitToGeoJson(featureCollection);
  }
}

function syncDrawFromStore(geoJson: any) {
  if (!gm) return Promise.resolve();

  const geoJsonToSync = geoJson;
  syncDrawQueue = syncDrawQueue
    .catch(() => undefined)
    .then(async () => {
      if (!gm) return;

      ignoreStoreWatch = true;
      try {
        await gm.features.deleteAll();

        const featureCollection = normalizeGeoJsonForImport(geoJsonToSync);
        if (featureCollection && featureCollection.features.length > 0) {
          await gm.features.importGeoJson(featureCollection);
          fitToGeoJson(featureCollection);
        }
      } finally {
        ignoreStoreWatch = false;
      }
    });

  return syncDrawQueue;
}

function handleGmCreate(event: any) {
  if (ignoreStoreWatch) return;

  const geoJson = event.feature?.getGeoJson?.();
  if (!geoJson) return;

  const normalizedFeature = convertCircleToPolygon(geoJson);
  legacyActions.saveGeoJson(normalizedFeature);
  fitToGeoJson(normalizedFeature);
}

function handleGmEditEnd(event: any) {
  if (ignoreStoreWatch) return;

  const geoJson = event.feature?.getGeoJson?.();
  if (!geoJson) return;

  const normalizedFeature = convertCircleToPolygon(geoJson);
  legacyActions.saveGeoJson(normalizedFeature);
}

function handleGmRemove() {
  if (ignoreStoreWatch) return;
  legacyActions.clearGeoJson();
}

function addMetadataExtentLayer() {
  if (!map || !isMapLoaded || !metadata.value?.region?.extents) return;

  const sourceId = "dataset-region";
  const lineLayerId = "dataset-region-outline";

  if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
  if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  map.addSource(sourceId, {
    type: "geojson",
    data: mapExtentPolygon(metadata.value.region.extents),
  });

  map.addLayer({
    id: FILL_LAYER_ID,
    type: "fill",
    source: sourceId,
    paint: { "fill-color": "#f0f4ff", "fill-opacity": 0.05 },
  });

  map.addLayer({
    id: lineLayerId,
    type: "line",
    source: sourceId,
    paint: { "line-color": "#4c6ef5", "line-width": 2 },
  });
}

function loadGeoJson(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  file.text().then((text) => {
    try {
      const geoJsonData = JSON.parse(text);
      legacyActions.saveGeoJson(geoJsonData);
    } catch {
      alert("Sorry, we couldn't import this GeoJSON file.");
    }
  });
}

function selectGeoJsonFile() {
  document.getElementById("loadGeoJsonFile")?.click();
}

function exportSelectedGeometry() {
  const gJ = datasetStore.geoJson as any;
  if (!gJ) return;

  const convertedArea = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gJ));
  const button = document.getElementById("exportSelectedGeometry");
  if (!button) return;

  button.setAttribute("href", "data:" + convertedArea);
  button.setAttribute("download", `${metadata.value?.id}.geojson`);
}

onMounted(() => {
  if (!mapContainer.value) return;

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: baseStyle(),
    center: [initialMapCenter.value[1], initialMapCenter.value[0]],
    zoom: initialMapZoom.value,
    minZoom: 2,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-right");

  map.on("load", async () => {
    if (!map) return;
    isMapLoaded = true;

    addMetadataExtentLayer();
    legacyActions.initializeDatasetGeoJson();

    addCogRasterLayer(props.step);

    if (isSelectArea.value) {
      gm = await createGeomanInstance(map as any, {});
      await gm.addControls();
      await syncDrawFromStore(datasetStore.geoJson);

      (map as any).on("gm:create", handleGmCreate);
      (map as any).on("gm:editend", handleGmEditEnd);
      (map as any).on("gm:remove", handleGmRemove);
    } else {
      updateStudyAreaDisplay(pendingStudyAreaGeoJson ?? datasetStore.geoJson);
      pendingStudyAreaGeoJson = null;
    }

    emit("mapReady", true);
  });
});

watch(
  () => datasetStore.geoJson,
  (geoJson: any) => {
    if (ignoreStoreWatch) return;
    if (isSelectArea.value) {
      void syncDrawFromStore(geoJson);
      return;
    }
    updateStudyAreaDisplay(geoJson);
  },
  { deep: true }
);

watch(
  () => metadata.value?.region?.extents,
  () => {
    addMetadataExtentLayer();
  }
);

watch(
  () => currentStep.value,
  (step: number) => {
    selectedBaseLayerId.value = getDefaultBaseLayerId(step);
  }
);

watch(
  () => selectedBaseLayerId.value,
  (baseLayerIdValue: string) => {
    applyBaseLayerSelection(baseLayerIdValue);
  }
);

watch(
  () => props.step,
  (step: number) => {
    updateRasterLayer(step);
  }
)

watch(
  cogBaseUrl,
  (url) => {
    removeCogRasterLayer();
    if (url) {
      addCogRasterLayer(props.step);
    }
  }
)

onUnmounted(() => {
  isMapLoaded = false;
  pendingStudyAreaGeoJson = null;
  if (pendingIdleSwap && map) {
    map.off("idle", pendingIdleSwap);
    pendingIdleSwap = null;
  }
  if (gm) {
    gm.destroy();
    gm = null;
  }
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
#exportSelectedGeometry {
  text-decoration: none;
  color: inherit;
}

.map {
  height: calc(95% - 48px);
  position: relative;
  z-index: 1;
}

.maplibre-map {
  height: 100%;
  width: 100%;
}

.basemap-select {
  max-width: 220px;
  min-width: 180px;
}

:deep(.maplibregl-ctrl-group) {
  margin-top: 8px;
}

:deep(.mapboxgl-ctrl-draw-btn) {
  min-width: 28px;
}
</style>
