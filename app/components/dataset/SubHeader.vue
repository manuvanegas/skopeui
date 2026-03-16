<template>
  <v-row align="start" justify="space-between">
    <v-col md="6" sm="9" cols="12">
      <span class="text-h6">
        {{ metadata?.title }}
      </span>
      <MetadataModal :metadata-id="metadata?.id" />
      <v-tooltip location="bottom" text="View the SKOPE user guide (opens in a new tab)">
        <template #activator="{ props }">
          <v-btn
            icon
            size="x-small"
            href="https://www.openskope.org/skope-users-guide/"
            target="_blank"
            v-bind="props"
          >
            <v-icon>mdi-help-circle-outline</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </v-col>
    <v-col v-if="selectVariable">
      <v-select
        v-model="variable"
        label="Select a variable"
        item-color="secondary"
        color="secondary"
        density="compact"
        :items="variables"
        item-title="name"
        item-value="id"
        variant="outlined"
      />
    </v-col>
    <v-col cols="3" class="ml-auto" align="end">
      <!-- slot for next nav button -->
      <slot />
    </v-col>
  </v-row>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import MetadataModal from "@/components/dataset/MetadataModal.vue";
import { useDatasetStore } from "@/stores/dataset";

const props = defineProps<{ selectVariable?: boolean }>();
const route = useRoute();
const router = useRouter();
const datasetStore = useDatasetStore();

const showInstructions = ref(false);
const metadata = computed(() => datasetStore.metadata as any);
const variables = computed(() => metadata.value?.variables ?? []);

const variable = computed({
  get() { return datasetStore.variable as any; },
  set(variableId: string) {
    datasetStore.setVariable(variableId);
    router.push({
      name: route.name as string,
      params: { id: route.params.id as string, variable: variableId },
    });
  },
});
</script>
