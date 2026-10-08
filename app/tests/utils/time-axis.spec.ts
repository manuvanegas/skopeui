import { describe, expect, it } from "vitest";

import type { Time } from "@/types/metadata";
import { timeCoverageLabel, timeSpan, yearOfTimestep } from "@/utils/timeAxis";

const annual: Time = {
  kind: "regular",
  precision: "year",
  count: 1898,
  origin: "0103",
  end: "2000",
  step: "P1Y",
  values: null,
};

describe("time axis labels", () => {
  it("reads the year of a key or an ISO date", () => {
    expect(yearOfTimestep("0103")).toBe(103);
    expect(yearOfTimestep("0590-01-01")).toBe(590);
  });

  it("spans the first and last years of the axis", () => {
    expect(timeSpan(annual)).toEqual([103, 2000]);
  });

  it("labels the coverage with the step", () => {
    expect(timeCoverageLabel(annual)).toBe("103–2000 CE, annual");
  });

  it("labels a single year without a range or unknown step", () => {
    expect(
      timeCoverageLabel({ ...annual, origin: "2009", end: "2009", step: null }),
    ).toBe("2009 CE");
  });
});
