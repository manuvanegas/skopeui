<template>
  <v-card
    class="pb-2"
    height="100%"
    width="100%"
    elevation="1"
    variant="outlined"
  >
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
        <v-spacer />
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
        <v-spacer />
        <input
          v-if="isSelectArea"
          id="loadGeoJsonFile"
          type="file"
          accept=".geojson"
          style="display: none"
          @change="loadGeoJson"
        >
        <v-tooltip
          v-if="isSelectArea"
          location="bottom"
          text="Upload study area from GeoJSON"
        >
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
        <v-tooltip
          v-if="isSelectArea"
          location="bottom"
          text="Download selected area as GeoJSON"
        >
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
      <div ref="mapContainer" class="maplibre-map" />
      <div v-if="isStepLoading" class="map-step-loading">
        <v-progress-circular
          indeterminate
          color="primary"
          size="48"
          width="4"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import maplibregl from "maplibre-gl";
import { SkopeColorbar, type ColorbarOptions } from "@/utils/SkopeColorbar";
import type { Geoman } from "@geoman-io/maplibre-geoman-free";
import { createGeomanInstance } from "@geoman-io/maplibre-geoman-free";
import circleToPolygon from "circle-to-polygon";
import { bbox as turfBbox } from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import "@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css";
import { LEAFLET_PROVIDERS, TILES_ENDPOINT } from "@/store/modules/constants";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import {
  getInitialMapViewport,
  type Bbox,
} from "@/composables/useMapInitialViewport";
import { useAppStore } from "@/stores/app";
import { useDatasetStore } from "@/stores/dataset";
import { useMessagesStore } from "@/stores/messages";

let colorbar: SkopeColorbar | null = null;

const props = defineProps({
  step: { type: Number, default: 2000 },
  displayRaster: { type: Boolean, default: true },
  circleToPolygonEdges: { type: Number, default: 32 },
});
const emit = defineEmits(["mapReady", "stepReady"]);

const route = useRoute();
const appStore = useAppStore();
const datasetStore = useDatasetStore();
const messageStore = useMessagesStore();
const legacyActions = useLegacyStoreActions();

const mapContainer = ref<HTMLElement | null>(null);
const isStepLoading = ref(false);

const stepNames = computed(() => appStore.stepNames);
const metadata = computed(() => datasetStore.metadata);
const selectedArea = computed(() => datasetStore.selectedAreaInSquareKm);
const currentStep = computed(() =>
  stepNames.value.findIndex((x: unknown) => x === route.name),
);
const isSelectArea = computed(() => currentStep.value === 1);

const cogBaseUrl = computed(getCogBaseUrl);
const legendVisible = computed(() => props.displayRaster && !!cogBaseUrl.value);
// The legend draws the variable's display entry as served, so it shows the
// same range and palette the API used for the tiles (DISP-004).
const legendOptions = computed((): ColorbarOptions | null => {
  const variable = datasetStore.variable;
  const display = variable?.display;
  if (!display?.range || display.colors.length < 2) return null;
  return {
    colors: display.colors,
    range: display.range,
    ticks: display.ticks,
    units: variable.unit,
  };
});
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
  if (
    typeof provider?.subdomains === "string" &&
    provider.subdomains.length > 0
  ) {
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
    urlTemplate.replace(/\{s\}/g, subdomain),
  );
}

const mapBaseLayers: MapLibreBaseLayer[] = LEAFLET_PROVIDERS.map(
  (provider: any) => ({
    id: providerNameToId(provider.name),
    name: provider.name,
    tiles: providerToMapLibreTiles(provider),
    attribution: provider.attribution,
    visible: provider.visible,
  }),
).filter((provider: MapLibreBaseLayer) => provider.tiles.length > 0);

function getDefaultBaseLayerId(step: number) {
  const matchedByStep = mapBaseLayers.find(
    (provider) => provider.visible === step,
  );
  return (matchedByStep || mapBaseLayers[0])?.id || "";
}

const selectedBaseLayerId = ref(getDefaultBaseLayerId(currentStep.value));
const baseLayerOptions = computed(() =>
  mapBaseLayers.map((provider) => ({
    title: provider.name,
    value: provider.id,
  })),
);

const STEP_DISPLAY_DURATION_MS = 1000;

let map: maplibregl.Map | null = null;
let gm: Geoman | null = null;
let ignoreStoreWatch = false;
let syncDrawQueue: Promise<void> = Promise.resolve();
let isMapLoaded = false;
let pendingStudyAreaGeoJson: any = null;
let stepDisplayTimeout: ReturnType<typeof setTimeout> | null = null;

const COG_A = { sourceId: "cog-source-a", layerId: "cog-layer-a" };
const COG_B = { sourceId: "cog-source-b", layerId: "cog-layer-b" };
let cogFront = COG_A; // currently visible slot
let cogBack = COG_B; // currently loading / empty slot
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
      provider.id === baseLayerIdValue ? "visible" : "none",
    );
  }
}

function baseStyle(): maplibregl.StyleSpecification {
  const activeBaseLayerId = selectedBaseLayerId.value;

  return {
    version: 8,
    sources: mapBaseLayers.reduce(
      (sources: Record<string, maplibregl.SourceSpecification>, provider) => {
        sources[baseSourceId(provider.id)] = {
          type: "raster",
          tiles: provider.tiles,
          tileSize: 256,
          attribution: provider.attribution,
        };
        return sources;
      },
      {},
    ),
    layers: mapBaseLayers.map((provider) => ({
      id: baseLayerId(provider.id),
      type: "raster",
      source: baseSourceId(provider.id),
      layout: {
        visibility: provider.id === activeBaseLayerId ? "visible" : "none",
      },
    })),
  } as maplibregl.StyleSpecification;
}

function getCogBaseUrl(): string | null {
  if (!props.displayRaster || !route.params.variable) return null;
  const datasetId = route.params.id;
  const varId = route.params.variable;
  return `${TILES_ENDPOINT}/${datasetId}/${varId}`;
}

// The API colours tiles from the variable's display entry, so the URL carries
// no colormap or rescale.
function getCogFullUrl(baseUrl: string, step: number) {
  const urlStep = step.toString().padStart(4, "0"); // TODO: Add flexibility for different time resolutions
  return `${baseUrl}/${urlStep}/{z}/{x}/{y}`;
}

// Tiles are only requested inside the dataset's bbox, [west, south, east, north].
function getCogBounds(): number[] | undefined {
  return metadata.value?.bbox;
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
    {
      id: slot.layerId,
      type: "raster",
      source: slot.sourceId,
      paint: { "raster-opacity": opacity },
    },
    FILL_LAYER_ID,
  );
}

function removeCogSlot(slot: typeof COG_A) {
  if (!map) return;
  if (map.getLayer(slot.layerId)) map.removeLayer(slot.layerId);
  if (map.getSource(slot.sourceId)) map.removeSource(slot.sourceId);
}

function cancelPendingSwap() {
  if (stepDisplayTimeout) {
    clearTimeout(stepDisplayTimeout);
    stepDisplayTimeout = null;
  }
  if (pendingIdleSwap) {
    map?.off("idle", pendingIdleSwap);
    pendingIdleSwap = null;
    removeCogSlot(cogBack); // discard the back buffer that was loading
  }
}

function addCogRasterLayer(step: number) {
  if (!map || !isMapLoaded || !cogBaseUrl.value) return;
  cancelPendingSwap();
  removeCogSlot(cogFront);
  removeCogSlot(cogBack);
  cogFront = COG_A;
  cogBack = COG_B;
  addCogSlot(cogFront, step, 0.7);
}

function removeCogRasterLayer() {
  if (!map || !isMapLoaded) return;
  cancelPendingSwap();
  removeCogSlot(cogFront);
  removeCogSlot(cogBack);
  isStepLoading.value = false;
}

function updateRasterLayer(step: number) {
  if (!map || !isMapLoaded || !cogBaseUrl.value) return;
  if (!map.getSource(cogFront.sourceId)) {
    addCogRasterLayer(step);
    return;
  }

  cancelPendingSwap();
  addCogSlot(cogBack, step, 0); // load invisibly
  isStepLoading.value = true;

  pendingIdleSwap = () => {
    if (!map || !isMapLoaded) return;
    if (!map.getSource(cogBack.sourceId)) return; // guard: swap was cancelled
    map.setPaintProperty(cogBack.layerId, "raster-opacity", 0.7);
    removeCogSlot(cogFront);
    [cogFront, cogBack] = [cogBack, cogFront]; // swap references
    pendingIdleSwap = null;
    isStepLoading.value = false;
    stepDisplayTimeout = setTimeout(() => {
      stepDisplayTimeout = null;
      emit("stepReady");
    }, STEP_DISPLAY_DURATION_MS);
  };
  map.once("idle", pendingIdleSwap);
}

function mapExtentPolygon([west, south, east, north]: Bbox): any {
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
  if (geoJson.type === "Feature")
    return { type: "FeatureCollection", features: [geoJson] };
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
    features: featureCollection.features.map((feature: any) =>
      convertCircleToPolygon(feature),
    ),
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
      { padding: 30, duration: 0 },
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

  if (
    !map.getLayer(STUDY_AREA_LINE_LAYER_ID) ||
    !map.getLayer(STUDY_AREA_FILL_LAYER_ID)
  ) {
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
  const source = map.getSource(STUDY_AREA_SOURCE_ID) as
    | maplibregl.GeoJSONSource
    | undefined;
  if (!source) return;

  const featureCollection =
    normalizeGeoJsonForImport(geoJson) || emptyFeatureCollection();
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
  if (!map || !isMapLoaded || !metadata.value?.bbox) return;

  const sourceId = "dataset-region";
  const lineLayerId = "dataset-region-outline";

  if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
  if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  map.addSource(sourceId, {
    type: "geojson",
    data: mapExtentPolygon(metadata.value.bbox),
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

  const convertedArea =
    "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gJ));
  const button = document.getElementById("exportSelectedGeometry");
  if (!button) return;

  button.setAttribute("href", "data:" + convertedArea);
  button.setAttribute("download", `${metadata.value?.id}.geojson`);
}

onMounted(() => {
  if (!mapContainer.value) return;

  const viewport = getInitialMapViewport(metadata.value);
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: baseStyle(),
    minZoom: 2,
    ...("bbox" in viewport
      ? { bounds: viewport.bbox, fitBoundsOptions: { padding: 20 } }
      : {
          center: [viewport.center.lon, viewport.center.lat],
          zoom: viewport.zoom,
        }),
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

    if (props.displayRaster) {
      if (legendOptions.value == null) {
        console.error(
          `Variable '${datasetStore.variable?.id}' has no continuous display range and colours (got ${JSON.stringify(datasetStore.variable?.display)}). Colorbar will not be shown.`,
        );
        messageStore.error(
          "The legend for this variable is missing or invalid, so it can't be displayed.",
        );
      } else {
        colorbar = new SkopeColorbar(legendOptions.value);
        map.addControl(colorbar, "bottom-left");
      }
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
  { deep: true },
);

watch(
  () => metadata.value?.bbox,
  () => {
    addMetadataExtentLayer();
  },
);

watch(
  () => currentStep.value,
  (step: number) => {
    selectedBaseLayerId.value = getDefaultBaseLayerId(step);
  },
);

watch(
  () => selectedBaseLayerId.value,
  (baseLayerIdValue: string) => {
    applyBaseLayerSelection(baseLayerIdValue);
  },
);

watch(
  () => props.step,
  (step: number) => {
    updateRasterLayer(step);
  },
);

watch(legendOptions, (options) => {
  if (options) colorbar?.update(options);
});

watch(legendVisible, (visible) => {
  if (visible) {
    colorbar?.show();
  } else {
    colorbar?.hide();
  }
});

watch(cogBaseUrl, (url) => {
  removeCogRasterLayer();
  if (url) {
    addCogRasterLayer(props.step);
  }
});

onUnmounted(() => {
  isMapLoaded = false;
  pendingStudyAreaGeoJson = null;
  if (stepDisplayTimeout) {
    clearTimeout(stepDisplayTimeout);
    stepDisplayTimeout = null;
  }
  if (pendingIdleSwap && map) {
    map.off("idle", pendingIdleSwap);
    pendingIdleSwap = null;
  }
  if (gm) {
    gm.destroy();
    gm = null;
  }
  if (colorbar && map) {
    map.removeControl(colorbar);
    colorbar = null;
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
  overflow: visible;
}

.maplibre-map {
  height: 100%;
  width: 100%;
}

.map-step-loading {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.25);
  pointer-events: none;
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

:deep(.skope-colorbar) {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 4px;
  padding: 6px 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  font-size: 11px;
}

:deep(.skope-colorbar__units) {
  text-align: center;
  font-weight: 600;
  margin-bottom: 2px;
  font-size: 11px;
}
</style>
