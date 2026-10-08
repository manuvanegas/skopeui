import { describe, expect, it } from "vitest";

import {
  datasetsFromMetadata,
  UnsupportedMetadataVersionError,
} from "@/utils/metadataResponse";
import metadataFixture from "@/tests/fixtures/metadata-1.0.0.json";

describe("datasetsFromMetadata", () => {
  it("returns the datasets of a 1.0.0 response", () => {
    expect(datasetsFromMetadata(metadataFixture)).toBe(
      metadataFixture.datasets,
    );
  });

  it("accepts a newer minor version", () => {
    expect(
      datasetsFromMetadata({ schema_version: "1.3.0", datasets: [] }),
    ).toEqual([]);
  });

  it("rejects another major version", () => {
    expect(() =>
      datasetsFromMetadata({ schema_version: "2.0.0", datasets: [] }),
    ).toThrow(UnsupportedMetadataVersionError);
  });

  it("rejects the legacy array response, which has no version", () => {
    expect(() => datasetsFromMetadata([{ id: "paleocar_v3" }])).toThrow(
      UnsupportedMetadataVersionError,
    );
  });
});
