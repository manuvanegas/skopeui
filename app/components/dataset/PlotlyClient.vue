<template>
  <div ref="container" class="plotly-client"></div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Plotly from "plotly.js/lib/core";
import Scatter from "plotly.js/lib/scatter";

Plotly.register([Scatter]);

const props = defineProps<{
  data: unknown[];
  layout?: Record<string, unknown>;
  options?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (e: "click", payload: unknown): void;
}>();

const container = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let resizeFrame: number | null = null;

function renderPlot(data = props.data, layout = props.layout, options = props.options) {
  if (container.value == null) {
    return;
  }
  Plotly.react(container.value, data || [], layout || {}, options || {});
}

function scheduleResize() {
  if (typeof window === "undefined" || container.value == null) {
    return;
  }

  if (resizeFrame != null) {
    window.cancelAnimationFrame(resizeFrame);
  }

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null;

    if (container.value == null) {
      return;
    }

    if (container.value.clientWidth === 0 || container.value.clientHeight === 0) {
      return;
    }

    void Plotly.Plots.resize(container.value);
  });
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

onMounted(async () => {
  await nextTick();
  renderPlot();
  scheduleResize();

  if (container.value != null) {
    (container.value as any).on("plotly_click", (eventData: unknown) => {
      emit("click", eventData);
    });
  }

  if (typeof ResizeObserver !== "undefined" && container.value != null) {
    resizeObserver = new ResizeObserver(() => {
      scheduleResize();
    });
    resizeObserver.observe(container.value);

    if (container.value.parentElement != null) {
      resizeObserver.observe(container.value.parentElement);
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("resize", scheduleResize);
  }
});

watch(
  () => [props.data, props.layout, props.options],
  async () => {
    await nextTick();
    renderPlot();
    scheduleResize();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();

  if (typeof window !== "undefined") {
    window.removeEventListener("resize", scheduleResize);
    if (resizeFrame != null) {
      window.cancelAnimationFrame(resizeFrame);
    }
  }

  if (container.value != null) {
    Plotly.purge(container.value);
  }
});
</script>

<style scoped>
.plotly-client {
  width: 100%;
  height: 100%;
  min-height: 320px;
}
</style>
