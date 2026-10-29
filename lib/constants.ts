/**
 * Below this many steps of drift, "ahead" and "behind" are noise, not signal.
 * Shared so the status badge and the pace copy can never disagree.
 *
 * Set above 0.5 deliberately: pace is rendered to one decimal, so a tolerance
 * of exactly 0.5 produced the odd "0.5 days behind" — a drift that displays as
 * the tolerance itself yet reads as a miss. The smallest miss now shown is 0.8.
 */
export const ON_PACE_TOLERANCE = 0.75;

/** Where state is persisted. Bumping the suffix discards incompatible data. */
export const STORAGE_KEY = "personal-dashboard:v1";

/**
 * The on-pace band in a goal's own steps. A month-long step made 0.75 of a
 * step mean three weeks of slack, so a monthly goal sat "on pace" for most of
 * its first month with nothing logged. The band is capped at a week instead.
 */
export function paceTolerance(stepUnit: "day" | "week" | "month"): number {
  const stepDays = stepUnit === "day" ? 1 : stepUnit === "week" ? 7 : 30.44;
  return Math.min(ON_PACE_TOLERANCE, 7 / stepDays);
}
