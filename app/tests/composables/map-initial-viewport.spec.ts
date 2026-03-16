import { describe, expect, it } from "vitest";

import { getInitialMapViewport } from "@/composables/useMapInitialViewport";

describe("getInitialMapViewport", () => {
  it("uses region center and zoom from metadata when valid", () => {
    const viewport = getInitialMapViewport({
      region: {
        center: [44.5, -120.2],
        zoom: 6,
      },
    });

    expect(viewport).toEqual({
      center: [44.5, -120.2],
      zoom: 6,
    });
  });

  it("falls back to defaults when metadata is missing", () => {
    const viewport = getInitialMapViewport(null);

    expect(viewport).toEqual({
      center: [0, 0],
      zoom: 2,
    });
  });

  it("falls back to defaults when region values are malformed", () => {
    const viewport = getInitialMapViewport({
      region: {
        center: ["x", 10],
        zoom: "high",
      },
    });

    expect(viewport).toEqual({
      center: [0, 0],
      zoom: 2,
    });
  });
});
