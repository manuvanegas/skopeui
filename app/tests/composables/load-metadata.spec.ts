import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import { useMetadataStore } from "@/stores/metadata";
import metadataFixture from "@/tests/fixtures/metadata-1.0.0.json";

function serve(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  );
}

describe("loadAllDatasetMetadata", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores the datasets of a 1.0.0 response", async () => {
    serve(metadataFixture);
    await useLegacyStoreActions().loadAllDatasetMetadata();

    const store = useMetadataStore();
    expect(store.allDatasetMetadata.map((d) => d.id)).toEqual(["paleocar_v3"]);
    expect(store.updateRequired).toBe(false);
  });

  it("flags an update when the API serves another major version", async () => {
    serve({ ...metadataFixture, schema_version: "2.0.0" });
    await expect(
      useLegacyStoreActions().loadAllDatasetMetadata(),
    ).rejects.toThrow("this UI reads 1.x");

    const store = useMetadataStore();
    expect(store.updateRequired).toBe(true);
    expect(store.allDatasetMetadata).toEqual([]);
  });

  it("fetches again on every call, so a changed API is noticed", async () => {
    serve(metadataFixture);
    const actions = useLegacyStoreActions();
    await actions.loadAllDatasetMetadata();
    await actions.loadAllDatasetMetadata();

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
