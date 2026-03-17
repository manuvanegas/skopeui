<template>
  <component
    :is="mapComponent"
    :year="year"
    :display-raster="displayRaster"
    :circle-to-polygon-edges="circleToPolygonEdges"
    @mapReady="emit('mapReady', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import LeafletMap from "@/components/dataset/LeafletMap.client.vue";
import MapLibrePoc from "@/components/dataset/MapLibrePoc.client.vue";

const props = defineProps({
  year: { type: Number, default: 2000 },
  displayRaster: { type: Boolean, default: true },
  circleToPolygonEdges: { type: Number, default: 32 },
  mapEngine: { type: String, default: null },
});
const emit = defineEmits(["mapReady"]);

const route = useRoute();
const runtimeConfig = useRuntimeConfig();

const year = computed(() => props.year);
const displayRaster = computed(() => props.displayRaster);
const circleToPolygonEdges = computed(() => props.circleToPolygonEdges);
const mapEngine = computed(() => {
  if (typeof props.mapEngine === "string" && props.mapEngine.length > 0) {
    return props.mapEngine;
  }
  const queryEngine = route.query.map_engine;
  if (typeof queryEngine === "string" && queryEngine.length > 0) {
    return queryEngine;
  }
  return runtimeConfig.public.mapEngine;
});

const mapComponent = computed(() => {
  if (mapEngine.value === "maplibre") {
    return MapLibrePoc;
  }
  return LeafletMap;
});
</script>
