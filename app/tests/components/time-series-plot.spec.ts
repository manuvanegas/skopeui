import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TimeSeriesPlot from "@/components/dataset/TimeSeriesPlot.vue";
import { useDatasetStore } from "@/stores/dataset";

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { id: "paleocar_v3" } }),
}));

vi.mock("@/components/dataset/PlotlyClient.vue", () => ({
  __esModule: true,
  default: { name: "PlotlyStub", template: "<div />" },
}));

const passThrough = { template: "<div><slot /></div>" };

function mountPlot() {
  return mount(TimeSeriesPlot, {
    props: { traces: [] },
    global: {
      stubs: {
        "client-only": passThrough,
        "v-card": passThrough,
        "v-card-text": passThrough,
        "v-form": passThrough,
        "v-text-field": true,
        "v-btn": true,
        "v-icon": true,
        "v-tooltip": true,
        "v-alert": true,
        "v-progress-circular": true,
      },
    },
  });
}

describe("TimeSeriesPlot loading messages", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the progress messages on the first request too", async () => {
    // The store starts out loading, so the first request doesn't change the
    // status string.
    const store = useDatasetStore();
    const wrapper = mountPlot();
    store.setTimeSeriesLoading();
    await flushPromises();

    vi.advanceTimersByTime(8_000);
    await flushPromises();
    expect(wrapper.find(".loading-message").text()).toBe("Still working...");

    vi.advanceTimersByTime(8_000);
    await flushPromises();
    expect(wrapper.find(".loading-message").text()).toBe(
      "Hang tight, almost there...",
    );
  });

  it("stops the messages once the data arrives", async () => {
    const store = useDatasetStore();
    const wrapper = mountPlot();
    store.setTimeSeriesLoaded();
    await flushPromises();

    vi.advanceTimersByTime(30_000);
    await flushPromises();
    expect(wrapper.find(".loading-message").exists()).toBe(false);
  });
});
