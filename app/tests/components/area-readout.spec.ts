import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import AreaReadout from "@/components/dataset/AreaReadout.vue";
import { useDatasetStore } from "@/stores/dataset";

const stubs = {
  "v-tooltip": {
    template: '<div><slot name="activator" :props="{}" /></div>',
  },
};

function readout() {
  return mount(AreaReadout, { global: { stubs } }).find(
    '[data-test="area-readout"]',
  );
}

describe("AreaReadout", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("stays hidden until a time series reports its cells", () => {
    expect(readout().exists()).toBe(false);
  });

  it("shows the API's area and cell count", () => {
    useDatasetStore().setAreaSummary(17847, 12_179_890_000);

    expect(readout().text()).toBe("12,179.89 km² · 17,847 cells");
  });

  it("shows only the cell for a point, which has no area", () => {
    useDatasetStore().setAreaSummary(1, 0);

    expect(readout().text()).toBe("1 cell");
  });
});
