import type { Time } from "@/types/metadata";

const STEP_LABELS: Record<string, string> = { P1Y: "annual" };

/** The year of a timestep key or ISO date: "0103" and "0103-01-01" are 103. */
export function yearOfTimestep(key: string): number {
  return Number(key.slice(0, 4));
}

/** The first and last years a dataset's time axis covers. */
export function timeSpan(time: Time): [number, number] {
  return [yearOfTimestep(time.origin), yearOfTimestep(time.end)];
}

/** A readable coverage label, such as "103–2000 CE, annual". */
export function timeCoverageLabel(time: Time): string {
  const [start, end] = timeSpan(time);
  const span = start === end ? `${start} CE` : `${start}–${end} CE`;
  const step = time.step ? STEP_LABELS[time.step] : undefined;
  return step ? `${span}, ${step}` : span;
}

// SKOPE UI reads annual axes, where a year identifies a timestep. Finer
// precisions and the static profile (PROTO-008) aren't supported yet.

/** The tile key of a year on an annual axis: 590 is "0590" (API-002). */
export function timestepKey(year: number): string {
  return String(year).padStart(4, "0");
}

/** Every year on the axis, in order. */
export function axisYears(time: Time): number[] {
  if (time.kind === "enumerated" && time.values) {
    return time.values.map(yearOfTimestep);
  }
  const [start, end] = timeSpan(time);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * The year `delta` timesteps from `year` along the axis, kept within
 * [lower, upper]. A year off the axis moves from the nearest one before it.
 */
export function stepAlongAxis(
  years: number[],
  year: number,
  delta: number,
  [lower, upper]: [number, number],
): number {
  const inRange = years.filter((y) => y >= lower && y <= upper);
  if (inRange.length === 0) return year;
  const before = inRange.filter((y) => y <= year).length - 1;
  const index = Math.min(Math.max(before + delta, 0), inRange.length - 1);
  return inRange[index];
}
