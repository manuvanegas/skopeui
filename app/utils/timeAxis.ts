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
