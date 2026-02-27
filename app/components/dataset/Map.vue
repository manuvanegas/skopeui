<template>
  <v-card class="pb-2" height="100%" width="100%" elevation="1" outlined>
    <v-toolbar flat class="ma-0 pa-0">
      <v-row class="mx-0" align="baseline">
        <!-- selected area -->
        <v-tooltip bottom>
          <template #activator="{ on, attrs }">
            <h3
              class="font-weight-light text-center pa-2 my-auto"
              style="background-color: #e4e7ef"
              v-bind="attrs"
              v-on="on"
            >
              {{ selectedArea }} km<sup>2</sup>
            </h3>
          </template>
          <span>Area of the selected geometry</span>
        </v-tooltip>
        <v-spacer></v-spacer>
        <v-alert
          v-if="isSelectArea"
          dense
          text
          outlined
          icon="draw"
          color="secondary darken-2"
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
          append-outer-icon="add"
          prepend-icon="remove"
          class="shrink mt-8"
          :rules="opacityRules"
          @click:append-outer="increaseOpacity"
          @click:prepend="decreaseOpacity"
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
        <v-tooltip bottom>
          <template #activator="{ on, attrs }">
            <v-btn
              small
              color="secondary"
              outlined
              depressed
              v-bind="attrs"
              class="my-auto"
              v-on="on"
              @click="selectGeoJsonFile"
            >
              <v-icon>upload</v-icon>
            </v-btn>
          </template>
          <span>Upload study area from GeoJSON</span>
        </v-tooltip>
        <!-- export geojson -->
        <v-tooltip bottom>
          <template #activator="{ on, attrs }">
            <v-btn
              small
              color="secondary"
              depressed
              v-bind="attrs"
              class="mx-2 my-auto"
              v-on="on"
              @click="exportSelectedGeometry"
            >
              <a id="exportSelectedGeometry">
                <v-icon>download</v-icon>
              </a>
            </v-btn>
          </template>
          <span>Download selected area as GeoJSON</span>
        </v-tooltip>
      </v-row>
    </v-toolbar>
    <!-- map -->
    <v-card-text class="map">
      <client-only placeholder="Loading map, please wait...">
        <l-map
          ref="layerMap"
          :zoom="6"
          :center="[37, -108]"
          :min-zoom="2"
          style="height: 100%; width: 100%"
          @l-ready="mapReady"
          @ready="mapReady"
        >
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
            <l-layer-group ref="rasterLayerGroup" layer-type="overlay" />
          </template>
          <l-control-scale position="bottomright" />
        </l-map>
      </client-only>
    </v-card-text>
  </v-card>
</template>

<script>
import Vue from "vue";
import { Component, Prop, Watch } from "nuxt-property-decorator";
import { LEAFLET_PROVIDERS } from "@/store/modules/constants";
import circleToPolygon from "circle-to-polygon";
import { stringify } from "query-string";
import {
  initializeDatasetGeoJson,
  clearGeoJson,
  saveGeoJson,
} from "@/store/actions";

const fillTemplate = require("es6-dynamic-template");
import _ from "lodash";

@Component({
  components: {},
})
class Map extends Vue {
  @Prop({ default: 2000 })
  year;

  @Prop({ default: true })
  displayRaster;

  @Prop({ default: 32 })
  circleToPolygonEdges;

  isMapReady = false;
  opacity = 50;
  opacityRules = [
    (v) =>
      (v && v >= 0 && v <= 100) || "Please enter an opacity between 0 and 100.",
  ];
  // default opacity for the dataset bounding box
  defaultDatasetOpacity = 0.0;
  // default padding for fitBounds
  defaultBoundsPadding = [3, 3];
  legendImage = null;
  legendControl = null;
  legendPosition = "bottomleft";
  geoJsonWatcher = null;
  georasterLayers = {};

  get areaStyle() {
    return {
      fill: !this.isVisualize,
      fillColor: "yellow",
      fillOpacity: 0.1,
      stroke: true,
      weight: 3,
      opacity: 1,
      color: this.isVisualize ? "black" : "yellow",
    };
  }

  get stepNames() {
    return this.$api().app.stepNames;
  }

  get metadata() {
    return this.$api().dataset.metadata;
  }

  get geoJson() {
    return this.$api().dataset.geoJson;
  }

  get selectedArea() {
    return this.$api().dataset.selectedAreaInSquareKm;
  }

  get currentStep() {
    return this.stepNames.findIndex((x) => x === this.$route.name);
  }

  get showMapControls() {
    return this.currentStep >= 1;
  }

  get layerOpacity() {
    return this.opacity / 100.0;
  }

  get cogBasePath() {
    return "/data";
  }

  get leafletProviders() {
    return LEAFLET_PROVIDERS;
  }

  get defaultCrs() {
    if (this.$L) {
      return this.$L.CRS.EPSG4326;
    }
    return "";
  }

  get isSelectArea() {
    return this.currentStep === 1;
  }

  get isVisualize() {
    return this.currentStep === 2;
  }

  get variable() {
    return this.$api().dataset.variable;
  }

  get variables() {
    return this.metadata.variables;
  }
  async initGeoRasterLayers() {
    if (!this.displayRaster || !this.$refs.rasterLayerGroup) return;

    for (const v of this.variables) {
      await this.loadCogLayer(v);
    }
  }

  async loadCogLayer(variable) {
    try {
      const map = this.$refs.layerMap.mapObject;
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const cogUrl = `${baseUrl}${this.cogBasePath}/${variable.id}.tif`;
      // Ensure L is available for the georaster plugin
      window.L = window.L || this.$L;
      // Dynamic imports
      const georasterModule = await import("georaster");
      const parseGeoraster = georasterModule.default || georasterModule;
      const layerModule = await import(
        "georaster-layer-for-leaflet/georaster-layer-for-leaflet.browserify.min.js"
      );
      let GeoRasterLayer = layerModule.default || layerModule;
      if (
        typeof GeoRasterLayer !== "function" &&
        typeof window !== "undefined" &&
        window.GeoRasterLayer
      ) {
        GeoRasterLayer = window.GeoRasterLayer;
      }
      map.setView([37, -108], 14); // using a zoomed view because (tile interleaved) COG loading and rendering can be slow

      const georaster = await parseGeoraster(cogUrl);
      // const bandIndex = this.getBandNumber(variable);
      const bandIndex = 0; // TODO HARDCODE for testing

      const layer = new GeoRasterLayer({
        georaster,
        opacity: this.layerOpacity,
        resolution: 32, // 256 was too much for my case

        pixelValuesToColorFn: (values) => {
          const pixelValue = values[bandIndex];
          // Don't render empty/no-data pixels
          if (
            pixelValue === georaster.noDataValue ||
            pixelValue === undefined ||
            isNaN(pixelValue)
          ) {
            return null;
          }
          // TODO: Replace this with an actual color scale
          return "#ff0000";
        },
      }).addTo(map);

      if (!this.nonReactiveGeoLayers) {
        this.nonReactiveGeoLayers = {};
      }
      this.nonReactiveGeoLayers[variable.id] = layer;
      console.log(`Loaded COG layer: ${variable.id}, band index: ${bandIndex}`);
    } catch (error) {
      console.error(`Failed to load COG for ${variable.id}:`, error);
    }
  }

  getBandNumber(variable) {
    const year = parseInt(this.year || this.$api().dataset.temporalRangeMax);
    // TODO: figure out if the offset below is needed
    // const offset = variable.timespan?.period?.gte;
    // if (offset) {
    //   return year - parseInt(offset);
    // }
    return year;
  }

  destroyed() {
    if (this.geoJsonWatcher) {
      this.geoJsonWatcher();
    }
  }

  isVisible(provider) {
    return this.currentStep === provider.visible;
  }

  decreaseOpacity() {
    this.opacity = _.clamp(this.opacity - 10, 0, 100);
  }
  increaseOpacity() {
    this.opacity = _.clamp(this.opacity + 10, 0, 100);
  }

  mapReady(map) {
    const handler = (event) => {
      const leafletLayer = event.layer;
      if (this.isSkopeLayer(leafletLayer)) {
        const variable = _.find(this.variables, (v) => v.name === event.name);
        this.$api().dataset.setVariable(variable.id);
        leafletLayer.bringToFront();
      }
    };
    map.on("overlayadd", handler);
    map.on("baselayerchange", handler);
    this.addDrawToolbar(map);
    initializeDatasetGeoJson(this.$warehouse, this.$api());
    this.registerToolbarHandlers(map);
    this.$nextTick(() => {
      this.initGeoRasterLayers();
    });
    this.geoJsonWatcher = this.$watch(
      "geoJson",
      function (geoJson) {
        this.drawnItems.clearLayers();
        if (geoJson === null) {
          this.disableEditOnly(map);
        } else {
          this.renderSelectedArea(geoJson, map);
        }
      },
      { immediate: true }
    );
    this.isMapReady = true;
    this.$emit("mapReady", true);
  }

  addDrawToolbar(map) {
    const L = this.$L;
    this.drawnItems = new L.FeatureGroup();
    map.addLayer(this.drawnItems);
    this.drawControlFull = new L.Control.Draw({
      position: "topleft",
      draw: {
        // disable polylines and circlemarkers, allow polygon, rectangle, circle, and marker
        polyline: false,
        circlemarker: false,
        rectangle: {
          shapeOptions: {
            color: "yellow",
          },
          metric: ["km"],
        },
        circle: {
          shapeOptions: {
            color: "yellow",
          },
          metric: ["km"],
        },
        polygon: {
          shapeOptions: {
            color: "yellow",
          },
          metric: ["km"],
          showArea: true,
          showLength: true,
        },
      },
      edit: {
        featureGroup: this.drawnItems,
      },
    });
    this.drawControlEditOnly = new L.Control.Draw({
      edit: {
        featureGroup: this.drawnItems,
      },
      draw: false,
    });
    // set custom tooltips on the draw and edit toolbars
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
    map.addControl(this.drawControlFull);
  }

  registerToolbarHandlers(map) {
    const L = this.$L;
    // check for persisted geometry
    map.on(L.Draw.Event.EDITED, (layerGroup) => {
      layerGroup.layers.eachLayer((layer) => {
        this.saveGeometry(layer);
      });
    });
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
      this.saveGeometry(layer);
      this.enableEditOnly(map);
    });
    map.on(L.Draw.Event.DELETED, (event) => {
      clearGeoJson(this.$warehouse, this.$api());
      if (this.drawnItems.getLayers().length === 0) {
        this.disableEditOnly(map);
      }
    });
  }

  renderSelectedArea(geoJson, map) {
    const L = this.$L;
    const geoJsonLayer = this.toLeafletLayer(geoJson);
    if (!map) {
      map = this.$refs.layerMap.mapObject;
    }
    geoJsonLayer.eachLayer((l) => {
      this.drawnItems.addLayer(l);
    });
    this.enableEditOnly(map);
    let padding = this.defaultBoundsPadding;
    if (geoJsonLayer instanceof L.Marker) {
      padding = padding.map((x) => x * 15);
    }
    map.fitBounds(geoJsonLayer.getBounds(), { padding });
  }

  /**
   * Persists geo json to the vuex store and local storage / warehouse and
   * converts leaflet circles to polygons
   * @param layer
   */
  saveGeometry(layer) {
    const geoJson = layer.toGeoJSON();
    if (layer instanceof L.Circle) {
      geoJson.properties.radius = layer.getRadius();
      const geometry = circleToPolygon(
        geoJson.geometry.coordinates,
        layer.getRadius(),
        this.circleToPolygonEdges
      );
      geoJson.geometry = geometry;
    }
    // save geoJSON in local storage (consider pushing into the vuex store)
    saveGeoJson(this.$warehouse, this.$api(), geoJson);
  }

  toLeafletLayer(geoJson) {
    const L = this.$L;
    return L.geoJSON(geoJson, {
      // convert persisted circles to L.Circle instead of L.Marker
      pointToLayer: (feature, latlng) => {
        if (feature.properties.radius) {
          return new L.Circle(latlng, feature.properties.radius);
        } else {
          return new L.Marker(latlng);
        }
      },
      style: this.areaStyle,
    });
  }

  disableEditOnly(map) {
    map.removeControl(this.drawControlEditOnly);
    // this.drawControlEditOnly.remove(map);
    this.drawControlFull.addTo(map);
  }

  enableEditOnly(map) {
    map.removeControl(this.drawControlFull);
    // this.drawControlFull.remove(map);
    this.drawControlEditOnly.addTo(map);
  }

  setLegendImage(htmlElement) {
    this.legendImage = htmlElement;
  }

  @Watch("year")
  async onYearChange() {
    Object.entries(this.georasterLayers).forEach(([varId, layer]) => {
      if (layer) {
        const variable = this.variables.find((v) => v.id === varId);
        if (variable) {
          layer.setBand(this.getBandNumber(variable));
        }
      }
    });
  }

  @Watch("layerOpacity")
  onOpacityChange() {
    Object.values(this.georasterLayers).forEach((layer) => {
      if (layer) layer.setOpacity(this.layerOpacity);
    });
  }

  @Watch("variables", { deep: true })
  async onVariablesChange() {
    // Clean up old layers
    Object.values(this.georasterLayers).forEach((layer) => layer?.remove());
    this.georasterLayers = {};

    // Reload visible layers
    if (this.isMapReady) {
      await this.initGeoRasterLayers();
    }
  }

  isSkopeLayer(leafletLayer) {
    return (leafletLayer.options.layers || "").startsWith("SKOPE");
  }

  loadGeoJson(event) {
    const file = event.target.files[0];
    file.text().then((text) => {
      try {
        const geoJson = JSON.parse(text);
        saveGeoJson(this.$warehouse, this.$api(), geoJson);
        // assert that uploaded and store geojson are the same
        console.log(
          "geojson persisted to store? ",
          geoJson === this.$api().dataset.geoJson
        );
      } catch (error) {
        console.error(error);
        // FIXME: this should be a toast or other notification
        alert("Sorry, we couldn't import this GeoJSON file: " + text);
      }
    });
  }

  selectGeoJsonFile() {
    document.getElementById("loadGeoJsonFile").click();
  }

  exportSelectedGeometry(event) {
    const geoJson = this.geoJson;
    if (geoJson) {
      const convertedArea =
        "text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(geoJson));
      const button = document.getElementById("exportSelectedGeometry");
      button.setAttribute("href", "data:" + convertedArea);
      // FIXME: generate a more unique name using the lat lngs or similar
      button.setAttribute("download", `${this.metadata.id}.geojson`);
    }
  }
}
export default Map;
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

ul.leaflet-draw-actions.leaflet-draw-actions-bottom li a[title="Save changes"] {
  display: none;
}
</style>
