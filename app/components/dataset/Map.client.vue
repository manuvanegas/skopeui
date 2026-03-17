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
});
const emit = defineEmits(["mapReady"]);

const route = useRoute();
const runtimeConfig = useRuntimeConfig();

console.log("[Map.client] useRoute query:", route.query);
console.log("[Map.client] runtimeConfig.public.mapEngine:", runtimeConfig.public.mapEngine);

const year = computed(() => props.year);
const displayRaster = computed(() => props.displayRaster);
const circleToPolygonEdges = computed(() => props.circleToPolygonEdges);
const mapEngine = computed(() => {
  const queryEngine = route.query.map_engine;
  if (typeof queryEngine === "string" && queryEngine.length > 0) {
    return queryEngine;
  }
  return runtimeConfig.public.mapEngine;
});

const mapComponent = computed(() => {
  if (mapEngine.value === "maplibre") {
    console.log("[Map.client] mapEngine is 'maplibre', using MapLibrePoc");
    return MapLibrePoc;
  }
  console.log("[Map.client] mapEngine is not 'maplibre', using LeafletMap. mapEngine value:", mapEngine.value);
  return LeafletMap;
});
</script>
