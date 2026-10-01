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
