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
        <v-text-field
          v-if="isVisualize"
          v-model="opacity"
          min="0"
          max="100"
          type="number"
          label="Opacity"
          hint="0-100"
          append-inner-icon="mdi-plus"
          prepend-inner-icon="mdi-minus"
          class="shrink mt-8"
          :rules="opacityRules"
          @click:append-inner="increaseOpacity"
          @click:prepend-inner="decreaseOpacity"
        />
        <v-spacer></v-spacer>
        <input
          id="loadGeoJsonFile"
          type="file"
          accept=".geojson"
          style="display: none"
          @change="loadGeoJson"
        />
        <v-tooltip location="bottom" text="Upload study area from GeoJSON">
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
        <v-tooltip location="bottom" text="Download selected area as GeoJSON">
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
import fillTemplate from "es6-dynamic-template";
import queryString from "query-string";
import _ from "lodash";
import { bbox as turfBbox } from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";
import { LEAFLET_PROVIDERS, SKOPE_WMS_ENDPOINT } from "@/store/modules/constants";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import { getInitialMapViewport } from "@/composables/useMapInitialViewport";
import { useAppStore } from "@/stores/app";
import { useDatasetStore } from "@/stores/dataset";

const props = defineProps({
  year: { type: Number, default: 2000 },
  displayRaster: { type: Boolean, default: true },
  circleToPolygonEdges: { type: Number, default: 32 },
});
const emit = defineEmits(["mapReady"]);

const route = useRoute();
const appStore = useAppStore();
const datasetStore = useDatasetStore();
const legacyActions = useLegacyStoreActions();

const mapContainer = ref<HTMLElement | null>(null);
const opacity = ref(50);
const opacityRules = [
  (v: any) =>
    (v != null && v >= 0 && v <= 100) || "Please enter an opacity between 0 and 100.",
];

const stepNames = computed(() => appStore.stepNames);
const metadata = computed(() => datasetStore.metadata as any);
const selectedArea = computed(() => datasetStore.selectedAreaInSquareKm);
const currentStep = computed(() => stepNames.value.findIndex((x: unknown) => x === route.name));
const isSelectArea = computed(() => currentStep.value === 1);
const isVisualize = computed(() => currentStep.value === 2);
const layerOpacity = computed(() => opacity.value / 100.0);
const variables = computed(() => metadata.value?.variables || []);
const variable = computed(() => datasetStore.variable as any);
const initialMapViewport = computed(() => getInitialMapViewport(metadata.value));
const initialMapZoom = computed(() => initialMapViewport.value.zoom);
const initialMapCenter = computed(() => initialMapViewport.value.center);

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
})).filter((provider) => provider.tiles.length > 0);

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

function decreaseOpacity() {
  opacity.value = _.clamp(opacity.value - 10, 0, 100);
}

function increaseOpacity() {
  opacity.value = _.clamp(opacity.value + 10, 0, 100);
}

function fillTemplateYear(templateString: string) {
  if (!templateString) return "";
  const year = (props.year || datasetStore.temporalRangeMax).toString();
  return fillTemplate(templateString, { year: year.padStart(4, "0") });
}

function baseSourceId(baseLayerId: string) {
  return `basemap-source-${baseLayerId}`;
}

function baseLayerId(baseLayerId: string) {
  return `basemap-layer-${baseLayerId}`;
}

function applyBaseLayerSelection(baseLayerIdValue: string) {
  if (!map) return;
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
  if (!map || !metadata.value?.region?.extents) return;

  const sourceId = "dataset-region";
  const lineLayerId = "dataset-region-outline";
  const fillLayerId = "dataset-region-fill";

  if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
  if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  map.addSource(sourceId, {
    type: "geojson",
    data: mapExtentPolygon(metadata.value.region.extents),
  });

  map.addLayer({
    id: fillLayerId,
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

function wmsTileUrl(layerName: string) {
  return `${SKOPE_WMS_ENDPOINT}${queryString.stringify({
    service: "WMS",
    request: "GetMap",
    version: "1.1.1",
    layers: layerName,
    styles: "",
    format: "image/png",
    transparent: true,
    width: 256,
    height: 256,
    srs: "EPSG:3857",
    bbox: "{bbox-epsg-3857}",
  })}`;
}

function refreshRasterLayers() {
  if (!map || !props.displayRaster) return;

  const existingLayerIds = map
    .getStyle()
    .layers?.map((layer: any) => layer.id)
    .filter((id: string) => id.startsWith("skope-raster-layer-")) || [];

  for (const layerId of existingLayerIds) {
    map.removeLayer(layerId);
  }

  const existingSourceIds = Object.keys(map.getStyle().sources || {}).filter((id) =>
    id.startsWith("skope-raster-source-")
  );

  for (const sourceId of existingSourceIds) {
    map.removeSource(sourceId);
  }

  for (const v of variables.value) {
    const layerName = fillTemplateYear(v.wmsLayer || "");
    if (!layerName) continue;

    const sourceId = `skope-raster-source-${v.id}`;
    const layerId = `skope-raster-layer-${v.id}`;

    map.addSource(sourceId, {
      type: "raster",
      tiles: [wmsTileUrl(layerName)],
      tileSize: 256,
    });

    map.addLayer({
      id: layerId,
      type: "raster",
      source: sourceId,
      paint: { "raster-opacity": layerOpacity.value },
      layout: { visibility: v.visible ? "visible" : "none" },
    });
  }
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

    gm = await createGeomanInstance(map as any, {});
    await gm.addControls();

    addMetadataExtentLayer();
    refreshRasterLayers();
    legacyActions.initializeDatasetGeoJson();
    await syncDrawFromStore(datasetStore.geoJson);

    (map as any).on("gm:create", handleGmCreate);
    (map as any).on("gm:editend", handleGmEditEnd);
    (map as any).on("gm:remove", handleGmRemove);

    emit("mapReady", true);
  });
});

watch(
  () => datasetStore.geoJson,
  (geoJson: any) => {
    if (ignoreStoreWatch) return;
    void syncDrawFromStore(geoJson);
  },
  { deep: true }
);

watch([variables, () => props.year, layerOpacity], () => {
  refreshRasterLayers();
});

watch(
  () => variable.value?.id,
  () => {
    refreshRasterLayers();
  }
);

watch(
  () => metadata.value?.region?.extents,
  () => {
    addMetadataExtentLayer();
  }
);

watch(
  () => currentStep.value,
  (step) => {
    selectedBaseLayerId.value = getDefaultBaseLayerId(step);
  }
);

watch(
  () => selectedBaseLayerId.value,
  (baseLayerIdValue) => {
    applyBaseLayerSelection(baseLayerIdValue);
  }
);

onUnmounted(() => {
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
