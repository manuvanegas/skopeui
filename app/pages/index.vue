<template>
  <v-container fluid>
    <v-row>
      <v-col class="ma-0">
        <h1>
          Select a Dataset
          <v-tooltip
            location="bottom"
            text="View the SKOPE user guide (opens in a new tab)"
          >
            <template #activator="{ props }">
              <v-btn
                icon
                class="mt-n1 ml-n1"
                href="https://www.openskope.org/skope-users-guide/"
                target="_blank"
                v-bind="props"
              >
                <v-icon>mdi-help-circle-outline</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </h1>
      </v-col>
    </v-row>
    <Search />
    <v-row class="ma-0 pa-0">
      <v-col class="ma-0">
        <template
          v-for="dataset in datasets"
          :key="dataset.absoluteUrl"
          router
          exact
        >
          <v-card class="pa-4 my-3" elevation="0" variant="outlined">
            <ListItem v-bind="dataset" />
          </v-card>
        </template>
        <v-alert v-if="loadFailed" type="error">
          Unable to load the datasets. Please try again shortly.
        </v-alert>
        <v-alert v-else-if="datasets.length === 0" type="warning">
          No datasets found, please refine your filter criteria.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import ListItem from "@/components/dataset/ListItem.vue";
import Search from "@/components/dataset/Search.vue";
import { useDatasetStore } from "@/stores/dataset";
import { useMetadataStore } from "@/stores/metadata";
import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";

definePageMeta({ layout: "default" });

const legacyActions = useLegacyStoreActions();
const datasetStore = useDatasetStore();
const metadataStore = useMetadataStore();

const datasets = computed(() => metadataStore.filteredDatasets);
const loadFailed = ref(false);

datasetStore.clearTimeSeries();
datasetStore.setMetadata(null);

await useAsyncData(
  "landingPageMetadata",
  async () => {
    try {
      await legacyActions.loadAllDatasetMetadata();
      loadFailed.value = false;
      return true;
    } catch (error) {
      console.error("Failed to load dataset metadata", error);
      loadFailed.value = true;
      return false;
    }
  },
  { server: false },
);
</script>
