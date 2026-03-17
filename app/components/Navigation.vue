<template>
  <v-navigation-drawer v-model="navigationVisible" temporary>
    <v-list-item title="SKOPE Workflow" class="text-h6 skope-title" />
    <v-divider />
    <v-list nav>
      <v-list-item
        v-for="(step, index) in steps"
        :key="index"
        :prepend-icon="step.icon"
        :title="step.label"
        :to="locations[index]"
        :disabled="isDisabled(index)"
        :append-icon="isStepComplete(index) ? 'mdi-check-circle-outline' : undefined"
      />
      <v-divider />
      <v-list-item>
        <LoadAnalysis />
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import LoadAnalysis from "@/components/dataset/LoadAnalysis.vue";
import { useAppStore } from "@/stores/app";
import { useDatasetStore } from "@/stores/dataset";

const route = useRoute();
const appStore = useAppStore();
const datasetStore = useDatasetStore();

const navigationVisible = computed({
  get() { return appStore.isNavigationVisible; },
  set(value: boolean) { appStore.setNavigationVisible(value); },
});

const steps = computed(() => appStore.steps);
const stepNames = computed(() => appStore.stepNames);
const variableId = computed(() => datasetStore.variable.id);
const hasMetadata = computed(() => route.params.id != null);
const hasValidStudyArea = computed(() => hasMetadata.value && datasetStore.hasGeoJson);
const canAnalyze = computed(() => hasValidStudyArea.value);
const currentStepIndex = computed(() => stepNames.value.findIndex((x) => x === (route.name as string)));

const locations = computed(() => [
  { name: "index" },
  hasMetadata.value
    ? { name: "dataset-id", params: { id: route.params.id as string } }
    : undefined,
  hasValidStudyArea.value
    ? { name: "dataset-id-visualize-variable", params: { id: route.params.id as string, variable: variableId.value } }
    : undefined,
  canAnalyze.value
    ? { name: "dataset-id-analyze-variable", params: { id: route.params.id as string, variable: variableId.value } }
    : undefined,
]);

function isDisabled(stepId: number) {
  switch (currentStepIndex.value) {
    case 0:
      if (stepId === 1) return !hasMetadata.value;
      if (stepId === 2) return !hasValidStudyArea.value;
      if (stepId === 3) return !canAnalyze.value;
      return false;
    case 1:
      if ([2, 3].includes(stepId)) return !hasValidStudyArea.value;
      return false;
    case 2:
      if (stepId === 3) return !canAnalyze.value;
      return false;
    default:
      return false;
  }
}

function isStepComplete(index: number) {
  return currentStepIndex.value > index;
}
</script>

<style scoped></style>
