import { addDays, daysBetween } from "./dates";
import type { Challenge, ChallengeUnit } from "./types";

/**
 * A challenge read back from its relapses.
 *
 * Every day passes as clean unless a relapse says otherwise, so nothing has to
 * be logged on a good day. A relapse ends the streak and costs what one time
 * would have cost; the challenge itself runs on to its end date.
 */

const DAYS_PER_MONTH = 30.44;

export type ChallengeDerived = {
  /** Days lived so far, today included, capped at the end date. */
  daysIn: number;
  /** Total length, or null when it has no end. */
  totalDays: number | null;
  /** 0–1 through the challenge; null without an end. */
  progress: number | null;
  /** Days lived without a relapse. */
  cleanDays: number;
  /** Days since the last relapse (or since the start). */
  streak: number;
  bestStreak: number;
  relapses: number;
  /** Times you would have done it in the days lived, minus the times you did. */
  skipped: number | null;
  /** Dollars or hours kept so far. */
  saved: number | null;
  /** Saved by the end date, at the same rate, with no more relapses. */
  projected: number | null;
  /** Past its end date, or ended by hand. */
  done: boolean;
  /** The last day the challenge covers, today or earlier. */
  lastDay: string;
};

export function deriveChallenge(c: Challenge, todayKey: string): ChallengeDerived {
  const ended = c.finishedAt ? c.finishedAt.slice(0, 10) : null;
  let lastDay = todayKey;
  if (c.endDate && c.endDate < lastDay) lastDay = c.endDate;
  if (ended && ended < lastDay) lastDay = ended;

  const daysIn = lastDay < c.startDate ? 0 : daysBetween(c.startDate, lastDay) + 1;
  const totalDays = c.endDate ? daysBetween(c.startDate, c.endDate) + 1 : null;

  const inWindow = c.relapses.filter((r) => r.date >= c.startDate && r.date <= lastDay);
  const relapseDays = [...new Set(inWindow.map((r) => r.date))].sort();
  const relapses = inWindow.reduce((sum, r) => sum + r.count, 0);
  const cleanDays = Math.max(0, daysIn - relapseDays.length);

  // Runs of clean days between relapse days.
  let best = 0;
  let prev = addDays(c.startDate, -1);
  for (const day of relapseDays) {
    best = Math.max(best, daysBetween(prev, day) - 1);
    prev = day;
  }
  const streak = daysIn === 0 ? 0 : Math.max(0, daysBetween(prev, lastDay));
  const bestStreak = Math.max(best, streak);

  const b = c.benefit;
  const perDay = b ? b.timesPerMonth / DAYS_PER_MONTH : 0;
  const skipped = b ? Math.max(0, daysIn * perDay - relapses) : null;
  const saved = b ? skipped! * b.perTime : null;
  const projected =
    b && totalDays !== null
      ? saved! + Math.max(0, totalDays - daysIn) * perDay * b.perTime
      : null;

  return {
    daysIn,
    totalDays,
    progress: totalDays ? Math.min(1, daysIn / totalDays) : null,
    cleanDays,
    streak,
    bestStreak,
    relapses,
    skipped,
    saved,
    projected,
    done: Boolean(c.finishedAt) || (c.endDate !== null && c.endDate < todayKey),
    lastDay,
  };
}

export const UNIT_LABEL: Record<ChallengeUnit, string> = { usd: "Dollars", hours: "Hours" };

const MONEY = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const HOURS = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** "$7,360" or "98 h". */
export function formatBenefit(value: number, unit: ChallengeUnit): string {
  return unit === "usd" ? `$${MONEY.format(value)}` : `${HOURS.format(value)} h`;
}

export function dayWord(n: number): string {
  return n === 1 ? "day" : "days";
}

/** Running first, then finished — newest first inside each. */
export function sortChallenges(list: Challenge[], todayKey: string) {
  return list
    .map((challenge) => ({ challenge, derived: deriveChallenge(challenge, todayKey) }))
    .sort((a, b) =>
      a.derived.done !== b.derived.done
        ? a.derived.done
          ? 1
          : -1
        : a.challenge.startDate < b.challenge.startDate
          ? 1
          : -1,
    );
}
