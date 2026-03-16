<template>
  <v-list density="compact" class="pa-0 ma-0">
    <v-list-subheader class="text-h6 ma-0 pa-0">Variables</v-list-subheader>
    <v-list-item v-for="(variable, index) in safeVariables" :key="index" :title="variable.name">
      <template #prepend>
        <v-chip size="small" label color="primary" class="mr-2">
          {{ variable.class }}
        </v-chip>
      </template>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  variables?: Array<{ class: string; name: string }> | null;
}>();

const safeVariables = computed(() => props.variables ?? []);
</script>
