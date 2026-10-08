import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ListItem from "@/components/dataset/ListItem.vue";
import metadataFixture from "@/tests/fixtures/metadata-1.0.0.json";

const [paleocar] = metadataFixture.datasets;

function mountListItem(overrides: Record<string, unknown> = {}) {
  return mount(ListItem, {
    props: { ...paleocar, ...overrides } as any,
    global: {
      mocks: { $md: { render: (text: string) => text } },
      stubs: {
        "client-only": true,
        NuxtLink: { template: "<a><slot /></a>" },
        MetadataModal: true,
        "v-list-item": {
          props: ["title"],
          template: '<div><slot name="prepend" />{{ title }}</div>',
        },
      },
    },
  });
}

describe("ListItem", () => {
  it("shows the region, resolution and time coverage", () => {
    const text = mountListItem().text();

    expect(text).toContain("Southwestern USA at 30 arc-second (~830 m)");
    expect(text).toContain("103–2000 CE, annual");
  });

  it("lists variables by title with their category", () => {
    const text = mountListItem().text();

    expect(text).toContain("Annual (Jan–Dec) Precipitation");
    expect(text).toContain("Growing Degree Days");
  });

  it("links the source from the dataset's via link", () => {
    const link = mountListItem().find('a[target="_blank"]');

    expect(link.attributes("href")).toBe(
      "https://www.ncei.noaa.gov/access/paleo-search/study/19783",
    );
    expect(link.text()).toBe("NOAA NCEI paleoclimatology study 19783");
  });

  it("leaves out the source line without a via link", () => {
    expect(mountListItem({ links: [] }).text()).not.toContain("Source:");
  });
});
