<template>
  <v-dialog v-model="showMetadata" max-width="800px">
    <template #activator="{ props }">
      <v-tooltip
        location="bottom"
        text="View dataset metadata with important details on uncertainty and provenance"
      >
        <template #activator="{ props: tooltipProps }">
          <v-btn icon size="x-small" rounded v-bind="{ ...props, ...tooltipProps }">
            <v-icon color="red-accent-4">mdi-alert</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </template>
    <v-card>
      <v-card-title style="background-color: #6db1bf">
        <h3 class="font-weight-light" style="color: white">
          {{ metadata.title || "Dataset metadata" }}
        </h3>
        <v-spacer></v-spacer>
        <v-btn icon @click="showMetadata = false">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <MetadataDetail :metadata="metadata" />
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
import MetadataDetail from "@/components/dataset/MetadataDetail.vue";
import { useMetadataStore } from "@/stores/metadata";

const props = defineProps<{ metadataId: string }>();
const showMetadata = ref(false);
const metadataStore = useMetadataStore();
const metadata = computed(
  () => metadataStore.find(props.metadataId) ?? { title: "Dataset metadata", variables: [] }
);
</script>
