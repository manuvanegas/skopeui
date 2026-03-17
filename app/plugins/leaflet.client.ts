import * as Leaflet from "leaflet";
import {
  LMap,
  LTileLayer,
  LRectangle,
  LControlLayers,
  LControlScale,
} from "@vue-leaflet/vue-leaflet";

export default defineNuxtPlugin(async (nuxtApp) => {
  // Leaflet Draw expects a global L reference when loaded.
  (globalThis as any).L = Leaflet;
  await import("leaflet-draw");

  nuxtApp.vueApp.component("LMap", LMap);
  nuxtApp.vueApp.component("LTileLayer", LTileLayer);
  nuxtApp.vueApp.component("LRectangle", LRectangle);
  nuxtApp.vueApp.component("LControlLayers", LControlLayers);
  nuxtApp.vueApp.component("LControlScale", LControlScale);

  // Preserve legacy `$L` access pattern during migration.
  return {
    provide: {
      L: Leaflet,
    },
  };
});
