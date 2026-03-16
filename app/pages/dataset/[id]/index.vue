<template>
  <v-container fluid class="fill-height">
    <LoadingSpinner v-if="isLoadingMetadata"></LoadingSpinner>
    <template v-else>
      <SubHeader>
        <v-btn
          :disabled="!hasValidStudyArea"
          :to="visualizeLocation"
          color="accent"
          variant="flat"
        >
          Visualize Data
          <v-icon size="small" class="ml-2"> mdi-chevron-right </v-icon>
        </v-btn>
      </SubHeader>
      <v-row>
        <v-col cols="12" class="d-flex map-flex">
          <Map
            :display-raster="false"
            class="mx-auto"
            @mapReady="mapLoaded"
          ></Map>
        </v-col>
        <client-only>
          <v-dialog
            v-model="confirmGeometry"
            transition="dialog-bottom-transition"
            max-width="600"
          >
            <v-card class="pa-6">
              <v-card-text>
                <h3>
                  Welcome back! Would you like to clear the currently selected
                  area?
                </h3>
              </v-card-text>
              <v-card-actions class="justify-space-between">
                <v-btn variant="outlined" color="accent" @click="clearGeometry">
                  Clear selected area
                </v-btn>
                <v-btn variant="flat" color="accent" @click="keepGeometry">
                  Keep selected area
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </client-only>
      </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import SubHeader from "@/components/dataset/SubHeader.vue";
import Map from "@/components/dataset/Map.client.vue";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import { useAppStore } from "@/stores/app";
import { useDatasetStore } from "@/stores/dataset";

definePageMeta({
  layout: "default",
  validate: ({ params }: { params: Record<string, string> }) => /^\w+$/.test(params.id),
});

const route = useRoute();
const legacyActions = useLegacyStoreActions();
const appStore = useAppStore();
const datasetStore = useDatasetStore();

const shouldConfirmGeometry = ref(true);

const isLoadingMetadata = computed(() => datasetStore.metadata == null);
const metadata = computed(() => datasetStore.metadata);
const hasValidStudyArea = computed(() => datasetStore.hasGeoJson);
const isFirstVisit = computed(() => appStore.isFirstVisit);
const confirmGeometry = computed({
  get: () => hasValidStudyArea.value && shouldConfirmGeometry.value && isFirstVisit.value,
  set: (value: boolean) => { shouldConfirmGeometry.value = value; },
});
const visualizeLocation = computed(() => {
  const id = route.params.id;
  const variable = (datasetStore.variable as any)?.id;
  return { name: "dataset-id-visualize-variable", params: { id, variable } };
});

await useAsyncData(`dataset-${route.params.id}`, () =>
  legacyActions.initializeDataset(route.params.id as string)
);

useHead(() => ({
  title: (metadata.value as any)?.title || "SKOPE",
  meta: (metadata.value as any)?.description
    ? [{ name: "description", content: (metadata.value as any).description }]
    : [],
}));

function clearGeometry() {
  shouldConfirmGeometry.value = false;
  appStore.setVisited();
  legacyActions.clearGeoJson();
}

function mapLoaded(_value: boolean) {
  shouldConfirmGeometry.value = hasValidStudyArea.value;
}

function keepGeometry() {
  shouldConfirmGeometry.value = false;
  appStore.setVisited();
}
</script>
<style>
.map-flex {
  height: calc(85vh - 96px);
}

@media all and (max-width: 960px) {
  .map-flex {
    height: 400px;
  }
}

@media all and (max-width: 600px) {
  .map-flex {
    height: 350px;
  }
}
</style>
