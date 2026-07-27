import { ON_PACE_TOLERANCE } from "./constants";
import { STEP_NOUN } from "./dates";
import type { StepUnit } from "./types";

/**
 * Precision follows magnitude, so small rates stay legible and large totals
 * don't become a wall of decimals. Intl handles grouping and drops trailing
 * zeros on its own — hand-rolled trimming ate the zeros off round integers
 * (6000 → "6"), which is exactly the sort of bug a personal ledger cannot have.
 */
export function formatNumber(value: number, maxDecimals?: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const auto = abs >= 1000 ? 0 : abs >= 10 ? 1 : 2;
  const max = maxDecimals === undefined ? auto : Math.min(auto, maxDecimals);
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: max }).format(
    value,
  );
}

/** True for symbol units (€, $, %) that prefix the figure rather than follow it. */
function isSymbolUnit(unit: string): boolean {
  return /^[^\w\s]$/.test(unit);
}

export function formatValue(value: number, unit: string): string {
  const n = formatNumber(value);
  if (!unit) return n;
  // Currency and percent sit tight against the figure; words get a space.
  return isSymbolUnit(unit) ? `${unit}${n}` : `${n} ${unit}`;
}

/**
 * "€3,250 → €6,000" but "8 → 24 books" — a symbol reads as part of each
 * figure, a word unit only needs saying once.
 */
export function formatRange(a: number, b: number, unit: string): string {
  if (!unit) return `${formatNumber(a)} → ${formatNumber(b)}`;
  if (isSymbolUnit(unit)) {
    return `${unit}${formatNumber(a)} → ${unit}${formatNumber(b)}`;
  }
  return `${formatNumber(a)} → ${formatNumber(b)} ${unit}`;
}

/**
 * Pluralise on the *rendered* number, not the raw float. A delta of
 * -1.0000000002 formats as "1" and must read "1 month", not "1 months".
 */
export function pluralSteps(count: number, unit: StepUnit): string {
  const [singular, plural] = STEP_NOUN[unit];
  const n = formatNumber(Math.abs(count), 1);
  return `${n} ${n === "1" ? singular : plural}`;
}

/** "3 days ahead" / "2 days behind" / "on pace". Never colour-dependent. */
export function formatPace(stepsDelta: number, unit: StepUnit): string {
  if (Math.abs(stepsDelta) <= ON_PACE_TOLERANCE) return "on pace";
  return `${pluralSteps(stepsDelta, unit)} ${stepsDelta > 0 ? "ahead" : "behind"}`;
}

export function formatRate(
  rate: number,
  unit: string,
  stepUnit: StepUnit,
): string {
  const [singular] = STEP_NOUN[stepUnit];
  return `${formatValue(Math.abs(rate), unit)}/${singular}`;
}

export function formatPoints(points: number): string {
  const rounded = Math.round(points);
  if (rounded === 0) return "±0%";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`;
}
