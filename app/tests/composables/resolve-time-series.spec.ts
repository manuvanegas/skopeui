import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useLegacyStoreActions } from "@/composables/useLegacyStoreActions";
import { useDatasetStore } from "@/stores/dataset";

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

  it.each([404, 422])(
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

  it("waits for a running extraction instead of starting a second one", async () => {
    // Analyze opened while visualize's extraction runs: /analyze answers 409,
    // and a new /extract would be refused at capacity.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(409, { detail: "not complete" }))
      .mockResolvedValueOnce(respond(200, { status: "RUNNING" }))
      .mockResolvedValueOnce(
        respond(200, { status: "SUCCESS", result: RESULT }),
      )
      .mockResolvedValueOnce(respond(200, RESULT));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    const pending = useLegacyStoreActions().resolveTimeSeries(
      "running-job",
      {},
    );
    await vi.runAllTimersAsync();
    const { newJobId, response } = await pending;
    vi.useRealTimers();

    expect(newJobId).toBe("running-job");
    expect(response).toEqual(RESULT);
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.endsWith("/timeseries/extract"))).toBe(false);
    expect(urls.at(-1)).toMatch(/\/timeseries\/analyze$/);
  });

  it("extracts again when the cached job's extraction failed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(409, { detail: "not complete" }))
      .mockResolvedValueOnce(respond(200, { status: "FAILED" }))
      .mockResolvedValueOnce(respond(200, { job_id: "new-job" }))
      .mockResolvedValueOnce(
        respond(200, { status: "SUCCESS", result: RESULT }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { newJobId } = await useLegacyStoreActions().resolveTimeSeries(
      "old-job",
      {},
    );

    expect(newJobId).toBe("new-job");
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/timeseries\/extract$/);
  });

  it("records a new extraction's job as soon as it's submitted", async () => {
    let jobIdWhilePolling: string | undefined;
    const store = useDatasetStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(200, { job_id: "new-job" }))
      .mockImplementationOnce(async () => {
        jobIdWhilePolling = store.jobIds?.ppt_annual;
        return respond(200, { status: "SUCCESS", result: RESULT });
      });
    vi.stubGlobal("fetch", fetchMock);

    await useLegacyStoreActions().resolveTimeSeries(undefined, {
      variable_id: "ppt_annual",
    });

    expect(jobIdWhilePolling).toBe("new-job");
  });

  it("retries an extraction the API is at capacity for", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(503, { detail: "at capacity" }))
      .mockResolvedValueOnce(respond(503, { detail: "at capacity" }))
      .mockResolvedValueOnce(respond(200, { job_id: "new-job" }))
      .mockResolvedValueOnce(
        respond(200, { status: "SUCCESS", result: RESULT }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    const pending = useLegacyStoreActions().resolveTimeSeries(undefined, {});
    await vi.advanceTimersByTimeAsync(4_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(6_000);
    const { newJobId } = await pending;
    vi.useRealTimers();

    expect(newJobId).toBe("new-job");
  });

  it("gives up on capacity after about a minute", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respond(503, { detail: "at capacity" })),
    );
    vi.useFakeTimers();

    const pending = useLegacyStoreActions().resolveTimeSeries(undefined, {});
    const outcome = expect(pending).rejects.toMatchObject({
      response: { status: 503 },
    });
    await vi.advanceTimersByTimeAsync(65_000);
    await outcome;
    vi.useRealTimers();
  });

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
