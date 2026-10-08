<template>
  <v-row align-content-start justify-space-around>
    <v-col xs4>
      <client-only>
        <NuxtLink :to="absoluteUrl">
          <l-map
            :min-zoom="2"
            :zoom="initialCenter.zoom"
            :center="initialCenter.center"
            class="list-item-map"
            @ready="fitToViewport"
          >
            <l-control-scale />
            <l-tile-layer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
            />
            <l-rectangle :bounds="leafletBounds(bbox)" />
          </l-map>
        </NuxtLink>
      </client-only>
    </v-col>
    <v-col xs8>
      <v-card elevation="0">
        <v-card-title class="ma-0 pa-0">
          <div class="text-h6">
            <NuxtLink :to="absoluteUrl" class="dataset-title">
              {{ title }}
            </NuxtLink>
            <MetadataModal :metadata-id="id" />
          </div>
          <div class="text-subtitle-2 pa-0 ma-0">
            {{ spatialCoverage }} | {{ temporalCoverage }}
          </div>
        </v-card-title>
        <v-card-text class="mt-3 pa-0">
          <span v-html="$md.render(safeDescription)" />
        </v-card-text>
        <VariableList :variables="safeVariables" />
        <v-card-text v-if="sourceLink" class="ma-0 pa-0">
          <b class="text-subtitle-1">Source:</b>
          <a target="_blank" :href="sourceLink.href">
            {{ sourceLink.title ?? sourceLink.href }}
          </a>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { BaseMapProvider } from "@/store/modules/constants";
import MetadataModal from "@/components/dataset/MetadataModal.vue";
import VariableList from "@/components/dataset/VariableList.vue";
import {
  getInitialMapViewport,
  leafletBounds,
  leafletStartView,
} from "@/composables/useMapInitialViewport";
import type { MapView, OverviewLink, Time, Variable } from "@/types/metadata";
import { timeCoverageLabel } from "@/utils/timeAxis";

const props = defineProps<{
  title: string;
  region_name: string;
  resolution_label: string;
  time: Time;
  links: OverviewLink[];
  bbox: [number, number, number, number];
  map_view: MapView | null;
  description: string;
  id: string;
  variables: Variable[];
}>();

const viewport = computed(() => getInitialMapViewport(props));
const initialCenter = computed(() => leafletStartView(viewport.value));

function fitToViewport(map: any) {
  if ("bbox" in viewport.value)
    map.fitBounds(leafletBounds(viewport.value.bbox));
}

const safeDescription = computed(() => props.description ?? "");
const safeVariables = computed(() => props.variables ?? []);

const spatialCoverage = computed(
  () => `${props.region_name} at ${props.resolution_label}`,
);
const temporalCoverage = computed(() => timeCoverageLabel(props.time));
// STAC's "via" link points at the source the dataset was taken from.
const sourceLink = computed(() =>
  props.links.find((link) => link.rel === "via"),
);
const absoluteUrl = computed(() => `/dataset/${props.id}`);
</script>
<style scoped>
.dataset-title {
  text-decoration: none;
  box-shadow:
    inset 0 -2px 0 #ee6c4d,
    0 2px 0 #ee6c4d;
  transition: box-shadow 0.3s;
  color: inherit;
  overflow: hidden;
}

.dataset-title:hover {
  box-shadow:
    inset 0 -30px 0 #ee6c4d,
    0 2px 0 #ee6c4d;
  color: white;
}

.list-item-map {
  position: relative;
  z-index: 1;
  cursor: pointer;
}
</style>
