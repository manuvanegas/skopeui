import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";

const RESULT = { series: [], summary_stats: [], n_cells: 1, area: 0 };

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

describe("resolveTimeSeries", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([404, 409, 422])(
    "extracts again when /analyze answers %i for the cached job",
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(respond(status, { detail: "stale" }))
        .mockResolvedValueOnce(respond(200, { job_id: "new-job" }))
        .mockResolvedValueOnce(
          respond(200, { status: "SUCCESS", result: RESULT }),
        );
      vi.stubGlobal("fetch", fetchMock);

      const { newJobId, response } =
        await useLegacyStoreActions().resolveTimeSeries("old-job", {});

      expect(newJobId).toBe("new-job");
      expect(response).toEqual(RESULT);
      expect(fetchMock.mock.calls[1][0]).toMatch(/\/timeseries\/extract$/);
    },
  );

  it("passes on other errors from /analyze", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respond(500, { detail: "boom" })),
    );

    await expect(
      useLegacyStoreActions().resolveTimeSeries("old-job", {}),
    ).rejects.toMatchObject({ response: { status: 500 } });
  });
});
