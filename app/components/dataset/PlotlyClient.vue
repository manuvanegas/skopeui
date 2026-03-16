<template>
  <div ref="container" class="plotly-client"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import Plotly from "plotly.js";

const props = defineProps<{
  data: unknown[];
  layout?: Record<string, unknown>;
  options?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (e: "click", payload: unknown): void;
}>();

const container = ref<HTMLElement | null>(null);

function renderPlot(data = props.data, layout = props.layout, options = props.options) {
  if (container.value == null) {
    return;
  }
  Plotly.react(container.value, data || [], layout || {}, options || {});
}

async function toImage(options?: Record<string, unknown>) {
  if (container.value == null) {
    return "";
  }
  return Plotly.toImage(container.value, options || {});
}

function update(data: unknown[], layout?: Record<string, unknown>) {
  renderPlot(data, layout, props.options);
}

defineExpose({
  toImage,
  update,
});

onMounted(() => {
  renderPlot();
  if (container.value != null) {
    container.value.on("plotly_click", (eventData: unknown) => {
      emit("click", eventData);
    });
  }
});

watch(
  () => [props.data, props.layout, props.options],
  () => {
    renderPlot();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (container.value != null) {
    Plotly.purge(container.value);
  }
});
</script>

<style scoped>
.plotly-client {
  height: 100%;
}
</style>
