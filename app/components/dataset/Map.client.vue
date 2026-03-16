<template>
  <v-card class="pb-2" height="100%" width="100%" elevation="1" variant="outlined">
    <v-toolbar variant="flat" class="ma-0 pa-0">
      <v-row class="mx-0" align="baseline">
        <!-- selected area -->
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
        <!-- set opacity -->
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
        <!-- upload geojson -->
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
        <!-- export geojson -->
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
    <!-- map -->
    <v-card-text class="map">
      <client-only placeholder="Loading map, please wait...">
        <l-map ref="layerMap" class="leaflet-map" :min-zoom="2" @ready="mapReady">
          <l-tile-layer
            v-for="provider of leafletProviders"
            :key="provider.name"
            :url="provider.url"
            :name="provider.name"
            :attribution="provider.attribution"
            :visible="isVisible(provider)"
            layer-type="base"
          />
          <l-rectangle
            v-if="metadata?.region"
            :bounds="metadata.region.extents"
            :style="metadata.region.style"
            :fill-opacity="defaultDatasetOpacity"
          />
          <l-control-layers
            v-if="showMapControls"
            :sort-layers="false"
            position="topright"
          />
          <template v-if="displayRaster">
            <l-wms-tile-layer
              v-for="v of variables"
              ref="wmsLayers"
              :key="v.id"
              :base-url="skopeWmsUrl"
              :layers="fillTemplateYear(v.wmsLayer)"
              :name="v.name"
              :crs="defaultCrs"
              :transparent="true"
              :opacity="layerOpacity"
              layer-type="overlay"
              :visible="v.visible"
              version="1.3.0"
              format="image/png"
            />
          </template>
          <l-control-scale position="bottomright" />
        </l-map>
      </client-only>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, shallowRef } from "vue";
import { useRoute } from "vue-router";
import {
  LEAFLET_PROVIDERS,
  SKOPE_WMS_ENDPOINT,
} from "@/store/modules/constants";
import circleToPolygon from "circle-to-polygon";
import queryString from "query-string";
import fillTemplate from "es6-dynamic-template";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import { useAppStore } from "@/stores/app";
import { useDatasetStore } from "@/stores/dataset";
import _ from "lodash";

const props = defineProps({
  year: { type: Number, default: 2000 },
  displayRaster: { type: Boolean, default: true },
  circleToPolygonEdges: { type: Number, default: 32 },
});
const emit = defineEmits(["mapReady"]);

// Leaflet is provided by plugins/leaflet.client.ts (client-only).
// Captured once at setup; undefined on SSR but all leaflet code is client-side only.
const L: any = import.meta.client ? (useNuxtApp() as any).$L : null;

const route = useRoute();
const appStore = useAppStore();
const datasetStore = useDatasetStore();
const legacyActions = useLegacyStoreActions();

// Reactive UI state
const isMapReady = ref(false);
const opacity = ref(50);
const opacityRules = [
  (v: any) => (v != null && v >= 0 && v <= 100) || "Please enter an opacity between 0 and 100.",
];
const defaultDatasetOpacity = 0.0;
const defaultBoundsPadding: [number, number] = [3, 3];
const legendImage = shallowRef<HTMLImageElement | null>(null);
const legendControl = shallowRef<any>(null);
const legendPosition = "bottomleft";
const wmsLayers = ref<any[]>([]);

// Non-reactive mutable Leaflet state (plain variables – deliberately not reactive
// so Vue does not instrument Leaflet objects).
let leafletMap: any = null;
let drawnItems: any = null;
let drawControlFull: any = null;
let drawControlEditOnly: any = null;
let stopGeoJsonWatch: (() => void) | null = null;

// Computeds
const stepNames = computed(() => appStore.stepNames);
const metadata = computed(() => datasetStore.metadata);
const selectedArea = computed(() => datasetStore.selectedAreaInSquareKm);
const currentStep = computed(() => stepNames.value.findIndex((x) => x === route.name));
const showMapControls = computed(() => currentStep.value >= 1);
const layerOpacity = computed(() => opacity.value / 100.0);
const skopeWmsUrl = SKOPE_WMS_ENDPOINT;
const leafletProviders = LEAFLET_PROVIDERS;
const defaultCrs = computed(() => L?.CRS?.EPSG4326 || "");
const isSelectArea = computed(() => currentStep.value === 1);
const isVisualize = computed(() => currentStep.value === 2);
const variable = computed(() => datasetStore.variable);
const variables = computed(() => (metadata.value as any)?.variables || []);
const wmsLayer = computed(() => fillTemplateYear((variable.value as any)?.wmsLayer || ""));
const areaStyle = computed(() => ({
  fill: !isVisualize.value,
  fillColor: "yellow",
  fillOpacity: 0.1,
  stroke: true,
  weight: 3,
  opacity: 1,
  color: isVisualize.value ? "black" : "yellow",
}));

function isVisible(provider: any) {
  return currentStep.value === provider.visible;
}

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

function isSkopeLayer(leafletLayer: any) {
  return (leafletLayer.options.layers || "").startsWith("SKOPE");
}

function setLegendImage(htmlElement: HTMLImageElement) {
  legendImage.value = htmlElement;
}

function generateWmsLegendUrl() {
  const query = {
    REQUEST: "GetLegendGraphic",
    VERSION: "1.0.0",
    FORMAT: "image/png",
    LAYER: wmsLayer.value,
    ENV: `opacity:${layerOpacity.value}`,
    LEGEND_OPTIONS: "layout:vertical;dx:10",
  };
  return skopeWmsUrl + queryString.stringify(query);
}

function updateWmsLayer() {
  if (variable.value !== null && wmsLayers.value?.length) {
    for (const wmsLayerRef of wmsLayers.value) {
      if (wmsLayerRef.name === (variable.value as any).name) {
        // @vue-leaflet/vue-leaflet exposes leafletObject; fall back to mapObject for compat
        const wmsLayerObj = wmsLayerRef.leafletObject ?? wmsLayerRef.mapObject;
        wmsLayerObj?.setParams({ layers: wmsLayer.value }, false);
      }
    }
  }
}

function updateWmsLegend() {
  if (!isMapReady.value || !leafletMap) return;
  const wmsLegendUrl = generateWmsLegendUrl();
  if (_.isNil(legendControl.value) && currentStep.value === 2) {
    const legend = L.control({ position: legendPosition });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control-wms-legend");
      const legendImg = L.DomUtil.create("img", "wms-legend", div);
      legendImg.src = wmsLegendUrl;
      setLegendImage(legendImg);
      return div;
    };
    legend.addTo(leafletMap);
    legendControl.value = legend;
  }
  if (legendImage.value !== null) {
    legendImage.value.src = wmsLegendUrl;
  }
}

function addDrawToolbar(map: any) {
  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  drawControlFull = new L.Control.Draw({
    position: "topleft",
    draw: {
      polyline: false,
      circlemarker: false,
      rectangle: { shapeOptions: { color: "yellow" }, metric: ["km"] },
      circle: { shapeOptions: { color: "yellow" }, metric: ["km"] },
      polygon: {
        shapeOptions: { color: "yellow" },
        metric: ["km"],
        showArea: true,
        showLength: true,
      },
    },
    edit: { featureGroup: drawnItems },
  });
  drawControlEditOnly = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: false,
  });
  const drawControlButtons = L.drawLocal.draw.toolbar.buttons;
  drawControlButtons.marker = "Select a point";
  drawControlButtons.polygon = "Select a polygon area";
  drawControlButtons.circle = "Select a circular area";
  drawControlButtons.rectangle = "Select a rectangular area";
  const editControlButtons = L.drawLocal.edit.toolbar.buttons;
  editControlButtons.edit = "Edit spatial selection";
  editControlButtons.editDisabled = "No spatial selection to edit";
  editControlButtons.remove = "Clear spatial selection";
  editControlButtons.removeDisabled = "No spatial selection to remove";
  map.addControl(drawControlFull);
}

function disableEditOnly(map: any) {
  if (!map) return;
  map.removeControl(drawControlEditOnly);
  drawControlFull.addTo(map);
}

function enableEditOnly(map: any) {
  if (!map) return;
  map.removeControl(drawControlFull);
  drawControlEditOnly.addTo(map);
}

function toLeafletLayer(geoJsonData: any) {
  return L.geoJSON(geoJsonData, {
    pointToLayer: (_feature: any, latlng: any) => {
      if (_feature.properties.radius) {
        return new L.Circle(latlng, _feature.properties.radius);
      }
      return new L.Marker(latlng);
    },
    style: areaStyle.value,
  });
}

function renderSelectedArea(geoJsonData: any, map?: any) {
  const resolvedMap = map || leafletMap;
  const geoJsonLayer = toLeafletLayer(geoJsonData);
  geoJsonLayer.eachLayer((l: any) => drawnItems.addLayer(l));
  enableEditOnly(resolvedMap);
  let padding = [...defaultBoundsPadding] as [number, number];
  if (geoJsonLayer instanceof L.Marker) {
    padding = padding.map((x) => x * 15) as [number, number];
  }
  resolvedMap.fitBounds(geoJsonLayer.getBounds(), { padding });
}

function saveGeometry(layer: any) {
  const geoJsonData = layer.toGeoJSON();
  if (layer instanceof L.Circle) {
    geoJsonData.properties.radius = layer.getRadius();
    geoJsonData.geometry = circleToPolygon(
      geoJsonData.geometry.coordinates,
      layer.getRadius(),
      props.circleToPolygonEdges
    );
  }
  legacyActions.saveGeoJson(geoJsonData);
}

function registerToolbarHandlers(map: any) {
  map.on(L.Draw.Event.EDITED, (layerGroup: any) => {
    layerGroup.layers.eachLayer((layer: any) => saveGeometry(layer));
  });
  map.on(L.Draw.Event.CREATED, (event: any) => {
    saveGeometry(event.layer);
    enableEditOnly(map);
  });
  map.on(L.Draw.Event.DELETED, () => {
    legacyActions.clearGeoJson();
    if (drawnItems.getLayers().length === 0) disableEditOnly(map);
  });
}

function mapReady(map: any) {
  leafletMap = map;
  const handler = (event: any) => {
    const leafletLayer = event.layer;
    if (isSkopeLayer(leafletLayer)) {
      const v = _.find(variables.value, (x: any) => x.name === event.name) as any;
      if (v) {
        datasetStore.setVariable(v.id);
        leafletLayer.bringToFront();
      }
    }
  };
  map.on("overlayadd", handler);
  map.on("baselayerchange", handler);
  addDrawToolbar(map);
  legacyActions.initializeDatasetGeoJson();
  registerToolbarHandlers(map);
  // Mirror original $watch("geoJson", ..., { immediate: true }) called in mapReady.
  // Must be stopped manually (created outside a lifecycle hook).
  stopGeoJsonWatch = watch(
    () => datasetStore.geoJson,
    (gJ) => {
      drawnItems.clearLayers();
      if (gJ === null) {
        disableEditOnly(map);
      } else {
        renderSelectedArea(gJ, map);
      }
    },
    { immediate: true }
  );
  isMapReady.value = true;
  emit("mapReady", true);
  updateWmsLegend();
}

function loadGeoJson(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  file.text().then((text) => {
    try {
      const geoJsonData = JSON.parse(text);
      legacyActions.saveGeoJson(geoJsonData);
    } catch (error) {
      console.error(error);
      alert("Sorry, we couldn't import this GeoJSON file: " + text);
    }
  });
}

function selectGeoJsonFile() {
  document.getElementById("loadGeoJsonFile")?.click();
}

function exportSelectedGeometry() {
  const gJ = datasetStore.geoJson as any;
  if (gJ) {
    const convertedArea = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gJ));
    const button = document.getElementById("exportSelectedGeometry");
    if (button) {
      button.setAttribute("href", "data:" + convertedArea);
      button.setAttribute("download", `${(metadata.value as any)?.id}.geojson`);
    }
  }
}

// Watchers
watch(() => props.year, updateWmsLayer);
watch([variable, layerOpacity], updateWmsLegend, { deep: true });

onUnmounted(() => {
  stopGeoJsonWatch?.();
});
</script>
<style>
.leaflet-top.leaflet-right
  .leaflet-control-layers:nth-child(1)
  .leaflet-control-layers-toggle {
  background-image: url(/earth.svg);
}

#exportSelectedGeometry {
  text-decoration: none;
  color: inherit;
}

.map {
  height: calc(95% - 48px);
  position: relative;
  z-index: 1;
}

.leaflet-map {
  height: 100%;
  width: 100%;
}

.leaflet-map .leaflet-container {
  height: 100%;
  width: 100%;
}

ul.leaflet-draw-actions.leaflet-draw-actions-bottom li a[title="Save changes"] {
  display: none;
}
</style>
