<template>
  <v-list density="compact" class="pa-0 ma-0">
    <v-list-subheader class="text-h6 ma-0 pa-0">Variables</v-list-subheader>
    <v-list-item
      v-for="(variable, index) in safeVariables"
      :key="index"
      :title="variable.title"
    >
      <template v-if="variable.category" #prepend>
        <v-chip size="small" label color="primary" class="mr-2">
          {{ variable.category }}
        </v-chip>
      </template>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Variable } from "@/types/metadata";

const props = defineProps<{
  variables?: Variable[] | null;
}>();

const safeVariables = computed(() => props.variables ?? []);
</script>
