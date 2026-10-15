import { addDays, daysBetween, startOfWeek, toDateKey } from "./dates";
import type { GoalDerived } from "./goals";
import type { Goal } from "./types";

/**
 * A goal read in calendar weeks, whatever step unit it was planned in.
 *
 * The plan itself stays in its own steps; weeks are just the window the detail
 * screen looks through — long enough that a quiet day doesn't read as failure,
 * short enough that a slipping week is still worth fixing.
 */

export type GoalWeek = {
  /** Monday the week starts on, YYYY-MM-DD. */
  start: string;
  /** Progress made in the week, oriented so moving toward the target is positive. */
  amount: number;
  /** The week containing today — still being lived, so not yet judged. */
  current: boolean;
};

/** The plan's weekly amount: the whole span spread evenly over the goal's days. */
export function plannedPerWeek(goal: Goal, derived: GoalDerived): number {
  const days = daysBetween(goal.startDate, derived.deadline);
  if (days <= 0) return Math.abs(derived.span);
  return (Math.abs(derived.span) / days) * 7;
}

/**
 * What each week from here has to carry to still land on the target. In the
 * final week, or past the deadline, it is simply everything that is left.
 */
export function neededPerWeek(goal: Goal, derived: GoalDerived, todayKey: string): number {
  const direction = Math.sign(derived.span) || 1;
  const left = Math.max(0, derived.remaining * direction);
  const days = daysBetween(todayKey, derived.deadline);
  if (days <= 7) return left;
  return (left / days) * 7;
}

/** Days until the deadline, never negative. */
export function daysLeft(derived: GoalDerived, todayKey: string): number {
  return Math.max(0, daysBetween(todayKey, derived.deadline));
}

/**
 * The most recent `limit` weeks, oldest first, ending with the current one and
 * never reaching back before the goal started.
 *
 * An accumulating goal's week is the sum of what was logged in it. A measured
 * goal's week is how far the reading moved: the last reading of the week
 * against the last one before it (or the starting point).
 */
export function goalWeeks(goal: Goal, todayKey: string, limit = 8): GoalWeek[] {
  const thisWeek = startOfWeek(todayKey);
  const firstWeek = startOfWeek(goal.startDate);
  const earliest = addDays(thisWeek, -7 * (limit - 1));
  const from = firstWeek > earliest ? firstWeek : earliest;
  if (from > thisWeek) return [];

  const direction = Math.sign(goal.pointB - goal.pointA) || 1;
  const dated = goal.entries
    .map((e) => ({ day: toDateKey(new Date(e.at)), at: e.at, value: e.value }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  /** The latest reading strictly before `day`, falling back to the start. */
  const readingBefore = (day: string) => {
    let value = goal.pointA;
    for (const e of dated) {
      if (e.day >= day) break;
      value = e.value;
    }
    return value;
  };

  const weeks: GoalWeek[] = [];
  for (let start = from; start <= thisWeek; start = addDays(start, 7)) {
    const end = addDays(start, 7);
    const inWeek = dated.filter((e) => e.day >= start && e.day < end);

    let amount = 0;
    if (goal.kind === "accumulate") {
      amount = inWeek.reduce((sum, e) => sum + e.value, 0) * direction;
    } else if (goal.kind === "measure" && inWeek.length > 0) {
      const last = inWeek[inWeek.length - 1]!.value;
      amount = (last - readingBefore(start)) * direction;
    }

    weeks.push({ start, amount, current: start === thisWeek });
  }
  return weeks;
}
