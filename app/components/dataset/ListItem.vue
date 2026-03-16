<template>
  <v-row align-content-start justify-space-around>
    <v-col xs4>
      <client-only>
        <NuxtLink :to="absoluteUrl">
          <l-map
            :min-zoom="2"
            :zoom="safeRegion.zoom"
            :center="safeRegion.center"
            class="list-item-map"
          >
            <l-control-scale />
            <l-tile-layer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
            />
            <l-rectangle :bounds="safeRegion.extents" :l-style="safeRegion.style" />
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
          <span v-html="$md.render(safeDescription)"></span>
        </v-card-text>
        <VariableList :variables="safeVariables" />
        <v-card-text class="ma-0 pa-0">
          <b class="text-subtitle-1">Source:</b>
          <a target="_blank" :href="sourceUrl">
            {{ sourceUrl }}
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

const props = defineProps<{
  title: string;
  status?: string;
  revised?: string;
  region: { name: string; resolution: string; zoom: number; center: any; extents: any; style?: any };
  timespan: { period: { gte: string; lte: string; suffix?: string }; resolutionLabel: string };
  description: string;
  id: string;
  sourceUrl?: string;
  variables?: Array<{ class: string; name: string }>;
}>();

const safeRegion = computed(() => ({
  name: props.region?.name ?? "Unknown region",
  resolution: props.region?.resolution ?? "unknown resolution",
  zoom: props.region?.zoom ?? 2,
  center: props.region?.center ?? [0, 0],
  extents: props.region?.extents ?? [[-1, -1], [1, 1]],
  style: props.region?.style ?? {},
}));

const safeDescription = computed(() => props.description ?? "");
const safeVariables = computed(() => props.variables ?? []);

const spatialCoverage = computed(
  () => `${safeRegion.value.name} at ${safeRegion.value.resolution}`
);
const temporalCoverage = computed(() => {
  const period = props.timespan?.period ?? { gte: "", lte: "", suffix: "" };
  const timespan = period.gte === period.lte ? period.gte : `${period.gte}-${period.lte}`;
  return `${timespan}${period.suffix ?? ""} ${props.timespan?.resolutionLabel ?? ""}`;
});
const absoluteUrl = computed(() => `/dataset/${props.id}`);
</script>
<style scoped>
.dataset-title {
  text-decoration: none;
  box-shadow: inset 0 -2px 0 #ee6c4d, 0 2px 0 #ee6c4d;
  transition: box-shadow 0.3s;
  color: inherit;
  overflow: hidden;
}

.dataset-title:hover {
  box-shadow: inset 0 -30px 0 #ee6c4d, 0 2px 0 #ee6c4d;
  color: white;
}

.list-item-map {
  position: relative;
  z-index: 1;
  cursor: pointer;
}
</style>
