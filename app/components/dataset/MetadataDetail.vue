<template>
  <v-card-text>
    <div v-for="(label, attr) in metadataAttributes" :key="attr" class="py-0">
      <span class="text-h5">{{ label }}</span>
      <span v-html="$md.render(renderableMetadata(attr))"></span>
    </div>
    <VariableList :variables="metadata.variables" />
  </v-card-text>
</template>

<script setup lang="ts">
import VariableList from "@/components/dataset/VariableList.vue";

const props = defineProps<{ metadata: Record<string, any> }>();

const metadataAttributes: Record<string, string> = {
  uncertainty: "Uncertainty",
  methodSummary: "Method Summary",
  originator: "Originator",
  references: "References",
  contactInformation: "Contact Information",
};

function renderableMetadata(attr: string): string {
  const value = props.metadata?.[attr];
  return typeof value === "string" ? value : "";
}
</script>
