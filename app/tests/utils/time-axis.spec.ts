import { describe, expect, it } from "vitest";

import type { Time } from "@/types/metadata";
import {
  axisYears,
  stepAlongAxis,
  timeCoverageLabel,
  timeSpan,
  timestepKey,
  yearOfTimestep,
} from "@/utils/timeAxis";

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

describe("time axis steps", () => {
  it("keys a year with four digits", () => {
    expect(timestepKey(590)).toBe("0590");
    expect(timestepKey(2000)).toBe("2000");
  });

  it("lists every year of a regular annual axis", () => {
    const years = axisYears({ ...annual, origin: "0103", end: "0106" });
    expect(years).toEqual([103, 104, 105, 106]);
  });

  it("lists the years of an enumerated axis", () => {
    const years = axisYears({
      ...annual,
      kind: "enumerated",
      step: null,
      values: ["1900", "1950", "2000"],
    });
    expect(years).toEqual([1900, 1950, 2000]);
  });

  it("steps along the axis within the selected range", () => {
    const years = [1900, 1950, 2000, 2050];
    expect(stepAlongAxis(years, 1950, 1, [1900, 2050])).toBe(2000);
    expect(stepAlongAxis(years, 1950, -1, [1900, 2050])).toBe(1900);
    expect(stepAlongAxis(years, 2000, 1, [1900, 2000])).toBe(2000);
    expect(stepAlongAxis(years, 1960, 1, [1900, 2050])).toBe(2000);
  });
});
