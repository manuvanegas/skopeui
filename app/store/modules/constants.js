import { find } from "lodash";
import {
  API_HOST_URL,
  GEOSERVER_HOST_URL,
  TITILER_HOST_URL,
  BUILD_ID,
} from "@/store/modules/_constants";
import { toISODate } from "@/store/stats";

export const WMS_SERVER_URI = "geoserver/SKOPE/wms?";
export const DEFAULT_CENTERED_SMOOTHING_WIDTH = 11;
export const DEFAULT_MAX_PROCESSING_TIME = 10000; // in ms
export const SKOPE_WMS_ENDPOINT = `${GEOSERVER_HOST_URL}/${WMS_SERVER_URI}`;
export const TIMESERIES_ENDPOINT = `${API_HOST_URL}/timeseries`;
export const METADATA_ENDPOINT = `${API_HOST_URL}/metadata`;
export const TITILER_ENDPOINT = `${TITILER_HOST_URL}`;
export const LEAFLET_PROVIDERS = [
  {
    name: "CartoDB.Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    visible: 2,
    attribution:
      'OpenStreetMap &copy; <a href="//carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
  },
  {
    name: "Stamen.TonerLite",
    url:
      "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.png",
    visible: false,
    attribution:
      'Tiles &copy; <a href="//stamen.com">Stamen Design</a> <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>',
  },
  {
    name: "Esri.WorldTerrain",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
    visible: false,
    attribution:
      "Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS",
  },
  {
    name: "Esri.WorldTopoMap",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri et al",
    visible: 1,
  },
];

export class BaseMapProvider {
  static get(name) {
    return find(LEAFLET_PROVIDERS, { name });
  }
}

export function buildReadme(requestData) {
  return `
# SKOPE data for ${requestData.dataset_id} / ${requestData.variable_id}
### [version: ${BUILD_ID}](https://github.com/openskope/skopeui)

## Terms of Service
By using the SKOPE application, you assume any risk associated with its use. You are solely responsible for any damage or loss you may incur resulting from your reliance on or use of information provided by SKOPE.

## Citation
Use of data, graphics, or other information provided by SKOPE should be accompanied by a citation of the original data source (provided by SKOPE in the dataset metadata) and of the SKOPE application Web page. Example reference: (SKOPE 2021).

Example Citation:
> SKOPE 2021 SKOPE: Synthesizing Knowledge of Past Environments. https://app.openskope.org/. Accessed 1 July 2021.

## Contact
For comments, feedback, or questions, please use the "Email Us" button on the application navigation bar or send us a note at skope-team@googlegroups.com

Time range: ${requestData.time_range.gte} - ${requestData.time_range.lte} CE
Location: ${JSON.stringify(requestData.selected_area, null, 2)}

## Files
- \`skope-request.json\` - A plaintext JSON file with all input parameters needed to recreate this analysis. Load this file into the SKOPE app to regenerate the data in this zipfile.
- \`summary-statistics.json\` - The computed mean, median, and standard deviation of the time series data.
- \`plot.png\` and \`plog.svg\` - Graph of the time series data.
- \`time-series.json\` and \`time-series.csv\` - time series data in JSON and long form CSV formats.
- \`study-area.geojson\` - GeoJSON file with the defined study area.
`;
}

// constants data structure of available smoothing options to present in the UI
export const SMOOTHING_OPTIONS = [
  {
    label: "None (time steps individually plotted)",
    id: "none",
    type: "NoSmoother",
    method: "none",
    toRequestData: function (analyzeVue) {
      return {
        type: this.type,
      };
    },
    fromRequestData: function (analyzeVue, requestData) {
      analyzeVue.smoothingOption = this.id;
    },
  },
  {
    label: "Centered Running Average",
    id: "centeredAverage",
    method: "centered",
    type: "MovingAverageSmoother",
    toRequestData: function (analyzeVue) {
      return {
        type: this.type,
        method: this.method,
        width: analyzeVue.smoothingTimeStep,
      };
    },
    fromRequestData: function (analyzeVue, requestData) {
      analyzeVue.smoothingOption = this.id;
      analyzeVue.smoothingTimeStep = requestData.width;
    },
  },
  {
    label: "Trailing Running Average (- window width)",
    id: "trailingAverage",
    method: "trailing",
    type: "MovingAverageSmoother",
    toRequestData: function (analyzeVue) {
      return {
        type: this.type,
        method: this.method,
        width: analyzeVue.smoothingTimeStep,
      };
    },
    fromRequestData: function (analyzeVue, requestData) {
      analyzeVue.smoothingOption = this.id;
      analyzeVue.smoothingTimeStep = requestData.width;
    },
  },
];

// constants data structure for available transform options to display in the UI
export const TRANSFORM_OPTIONS = [
  {
    label: "None: Modeled values displayed",
    id: "none",
    type: "NoTransform",
    toRequestData: function () {
      return {
        type: this.type,
      };
    },
    fromRequestData: function (analyzeVue) {
      analyzeVue.transformOption = this.id;
    },
  },
  {
    label: "Z-Score wrt selected interval",
    id: "zscoreSelected",
    type: "ZScoreFixedInterval",
    toRequestData: function () {
      return {
        type: this.type,
      };
    },
    fromRequestData: function (analyzeVue, requestData) {
      if (requestData.time_range) {
        // FIXME: refactor this, we have two mappings for ZScoreFixedIntervals and
        // the only way to disambiguate them at the moment is testing for requestData.time_range
        analyzeVue.transformOption = "zscoreFixed";
        analyzeVue.time_range = requestData.time_range;
      } else {
        analyzeVue.transformOption = this.id;
      }
    },
  },
  {
    label: "Z-Score wrt fixed interval",
    id: "zscoreFixed",
    type: "ZScoreFixedInterval",
    toRequestData: function (analyzeVue) {
      return {
        type: this.type,
        time_range: {
          gte: toISODate(analyzeVue.timeRange.lb.year),
          lte: toISODate(analyzeVue.timeRange.ub.year),
        },
      };
    },
    fromRequestData: function (analyzeVue, requestData) {
      // FIXME: this does not get called due to multiple mappings for ZScoreFixedIntervals
      analyzeVue.transformOption = this.id;
      analyzeVue.time_range = requestData.time_range;
    },
  },
  {
    label: "Z-Score wrt moving interval",
    id: "zscoreMoving",
    type: "ZScoreMovingInterval",
    toRequestData: function (analyzeVue) {
      return {
        type: this.type,
        width: analyzeVue.zScoreMovingIntervalTimeSteps,
      };
    },
    fromRequestData: function (analyzeVue, requestData) {
      analyzeVue.transformOption = this.id;
      analyzeVue.zScoreMovingIntervalTimeSteps = requestData.width;
    },
  },
];
