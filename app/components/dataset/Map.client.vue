<template>
  <!-- Only Leaflet converts circles itself; geoman already emits polygons. -->
  <component
    :is="mapComponent"
    :step="step"
    :display-raster="displayRaster"
    v-bind="mapComponent === LeafletMap ? { circleToPolygonEdges } : {}"
    @map-ready="emit('mapReady', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import LeafletMap from "@/components/dataset/LeafletMap.client.vue";
import MapLibre from "@/components/dataset/MapLibre.client.vue";

const props = defineProps({
  step: { type: Number, default: 2000 },
  displayRaster: { type: Boolean, default: true },
  circleToPolygonEdges: { type: Number, default: 32 },
  mapEngine: { type: String, default: null },
});
const emit = defineEmits(["mapReady"]);

const route = useRoute();
const runtimeConfig = useRuntimeConfig();

const step = computed(() => props.step);
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
    return MapLibre;
  }
  return LeafletMap;
});
</script>
