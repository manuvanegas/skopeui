<template>
  <v-form @submit.prevent>
    <v-row class="mb-n7" align="center" justify="center">
      <!-- filter by variable -->
      <v-col cols="12" md="3" sm="6">
        <v-combobox
          v-model="selectedVariableClasses"
          no-filter
          :items="variableClasses"
          label="Filter by variable"
          multiple
          chips
          variant="outlined"
          @update:modelValue="filterDatasets"
          @blur="filterDatasets"
        >
          <template #chip="{ item: variableClass, props: chipProps }">
            <v-chip
              v-bind="chipProps"
              color="primary"
              label
              size="small"
            >
              {{ variableClass.title ?? variableClass }}
            </v-chip>
          </template>
          <template #item="{ item: variableClass, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #title>
                <v-chip color="primary" label size="small">
                  {{ variableClass.title ?? variableClass }}
                </v-chip>
              </template>
            </v-list-item>
          </template>
        </v-combobox>
      </v-col>
      <!-- search by keyword -->
      <v-col cols="12" md="5" sm="6">
        <!-- keyword search -->
        <v-text-field
          id="keywordQuery"
          v-model="keywordSearchQuery"
          clearable
          variant="outlined"
          data-toggle="hideseek"
          label="Keyword search"
          append-inner-icon="mdi-magnify"
          @update:modelValue="filterDatasets"
          @click:clear="clearSearchQuery"
          @click:append-inner="filterDatasets"
        />
      </v-col>
      <v-col cols="12" md="2" sm="6">
        <v-text-field
          v-model="startYear"
          variant="outlined"
          label="Start Year"
          :rules="startYearRules"
          type="number"
          @update:modelValue="filterDatasets"
          @blur="filterDatasets"
        />
      </v-col>
      <v-col cols="12" md="2" sm="6">
        <v-text-field
          v-model="endYear"
          variant="outlined"
          :rules="endYearRules"
          label="End Year"
          type="number"
          @update:modelValue="filterDatasets"
        />
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useMetadataStore } from "@/stores/metadata";

const metadataStore = useMetadataStore();
const currentYear = new Date().getFullYear();

const keywordSearchQuery = ref("");
const startYear = ref(1);
const endYear = ref(currentYear);
const selectedVariableClasses = ref<string[]>([]);
const minYear = 1;
const maxYear = currentYear;

const datasets = computed(() => metadataStore.filteredDatasets);

const startYearRules = computed(() => [
  (v: number) => v >= minYear || `Please enter a valid start year after ${minYear}`,
  (v: number) => v <= endYear.value || `Please enter a valid start year before ${endYear.value}`,
]);

const endYearRules = computed(() => [
  (v: number) => v >= startYear.value || `Please enter a valid end year after ${startYear.value}`,
  (v: number) => v <= maxYear || `Please enter a valid end year before ${maxYear}`,
]);

const variableClasses = computed(() => {
  const variableClassSet = new Set<string>();
  for (const dataset of metadataStore.allDatasetMetadata as any[]) {
    for (const variable of (dataset.variables || [])) {
      variableClassSet.add(variable.class);
    }
  }
  return Array.from(variableClassSet);
});

function filterDatasets() {
  const criteria = {
    selectedVariableClasses: selectedVariableClasses.value,
    yearStart: startYear.value,
    yearEnd: endYear.value,
    query: keywordSearchQuery.value,
  };
  metadataStore.setFilterCriteria(criteria);
}

function clearSearchQuery() {
  keywordSearchQuery.value = "";
  filterDatasets();
}
</script>

<style scoped></style>
