import { addDays, daysBetween, monthKey, startOfWeek } from "./dates";
import type { Habit } from "./types";

/** A habit's intended cadence, 1–7 days a week. Missing/legacy = daily (7). */
export function habitTarget(habit: Habit): number {
  const t = habit.weeklyTarget;
  if (!t || !Number.isFinite(t)) return 7;
  return Math.min(7, Math.max(1, Math.round(t)));
}

export type HabitDerived = {
  /** Consecutive days ending today (or yesterday, if today isn't marked yet). */
  streak: number;
  /** True when the streak ended before today — stated plainly, never punished. */
  broken: boolean;
  markedToday: boolean;
  /** Days marked within the rendered window. */
  hits: number;
};

export function deriveHabit(
  habit: Habit,
  todayKey: string,
  windowDays: number,
): HabitDerived {
  const marks = new Set(habit.marks);
  const markedToday = marks.has(todayKey);

  // A streak counts back from today when today is marked, otherwise from
  // yesterday — so an unmarked morning doesn't read as an instant loss.
  let cursor = markedToday ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (marks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  let hits = 0;
  for (let i = 0; i < windowDays; i += 1) {
    if (marks.has(addDays(todayKey, -i))) hits += 1;
  }

  const lastMark = [...habit.marks].sort().pop();
  const broken =
    streak === 0 && lastMark !== undefined && daysBetween(lastMark, todayKey) > 1;

  return { streak, broken, markedToday, hits };
}

/** Oldest → newest, ending on today. Today is always the last column. */
export function windowDays(todayKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    addDays(todayKey, -(count - 1 - i)),
  );
}

/* ---------------------------------------------------------------------------
 * Weekly-aware model — the redesigned Habits board.
 *
 * The streak question changes shape once a habit isn't daily. "4× a week"
 * can't be a run of consecutive days, so its streak is a run of consecutive
 * *successful weeks* (a week that reaches the target). The in-progress week
 * never breaks the streak on its own — same grace the daily rule gives today.
 * ------------------------------------------------------------------------- */

export type HabitCard = {
  target: number;
  isDaily: boolean;
  markedToday: boolean;
  /** Marks in the trailing 7 days. */
  last7: number;
  /** 0..1 adherence over the trailing 7 days, relative to the target. */
  adherence: number;
  /** Marks in the current Monday–Sunday week. */
  weekMarks: number;
  weekMet: boolean;
  /** Consecutive days (daily) or successful weeks (weekly). */
  streak: number;
  streakUnit: "day" | "week";
  broken: boolean;
};

function countLastN(marks: Set<string>, todayKey: string, n: number): number {
  let c = 0;
  for (let i = 0; i < n; i += 1) if (marks.has(addDays(todayKey, -i))) c += 1;
  return c;
}

function marksInWeek(marks: Set<string>, weekStartKey: string): number {
  let c = 0;
  for (let i = 0; i < 7; i += 1) if (marks.has(addDays(weekStartKey, i))) c += 1;
  return c;
}

export function deriveHabitCard(habit: Habit, todayKey: string): HabitCard {
  const marks = new Set(habit.marks);
  const target = habitTarget(habit);
  const isDaily = target >= 7;
  const markedToday = marks.has(todayKey);
  const last7 = countLastN(marks, todayKey, 7);
  const adherence = Math.min(1, last7 / target);

  const weekStart = startOfWeek(todayKey);
  const weekMarks = marksInWeek(marks, weekStart);
  const weekMet = weekMarks >= target;

  const lastMark = [...habit.marks].sort().pop();

  if (isDaily) {
    let cursor = markedToday ? todayKey : addDays(todayKey, -1);
    let streak = 0;
    while (marks.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    const broken =
      streak === 0 && lastMark !== undefined && daysBetween(lastMark, todayKey) > 1;
    return {
      target,
      isDaily,
      markedToday,
      last7,
      adherence,
      weekMarks,
      weekMet,
      streak,
      streakUnit: "day",
      broken,
    };
  }

  // Weekly cadence: count completed successful weeks before this one, then add
  // the current week only once it has already reached target.
  let streak = 0;
  let wk = addDays(weekStart, -7);
  while (marksInWeek(marks, wk) >= target) {
    streak += 1;
    wk = addDays(wk, -7);
  }
  if (weekMet) streak += 1;

  // Broken only once the last activity is at least two weeks stale — an empty
  // start to the current week is not a failure yet.
  const broken =
    streak === 0 && lastMark !== undefined && daysBetween(lastMark, todayKey) > 13;

  return {
    target,
    isDaily,
    markedToday,
    last7,
    adherence,
    weekMarks,
    weekMet,
    streak,
    streakUnit: "week",
    broken,
  };
}

/* ---------- Cross-habit aggregates ---------- */

/** Map of dateKey → how many habits were marked that day. Built once, reused. */
export function markCounts(habits: Habit[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const habit of habits) {
    for (const day of habit.marks) {
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * The whole-board streak. A day counts when at least half of all habits were
 * marked — the "did I show up" line. Today gets the same grace as a single
 * habit: an as-yet-incomplete today is skipped, not counted as a break.
 *
 * `longest` scans from the first recorded day to today. Historical days are
 * judged against today's habit count (per-day counts aren't stored), so it is
 * a close estimate rather than an exact replay.
 */
export function overallStreaks(
  habits: Habit[],
  todayKey: string,
): { current: number; longest: number } {
  if (habits.length === 0) return { current: 0, longest: 0 };
  const counts = markCounts(habits);
  const threshold = Math.ceil(habits.length / 2);
  const good = (day: string) => (counts.get(day) ?? 0) >= threshold;

  let cursor = good(todayKey) ? todayKey : addDays(todayKey, -1);
  let current = 0;
  while (good(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const days = [...counts.keys()].sort();
  const first = days[0];
  let longest = 0;
  if (first) {
    let run = 0;
    let d = first;
    while (d <= todayKey) {
      if (good(d)) {
        run += 1;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
      d = addDays(d, 1);
    }
  }

  return { current, longest };
}

export type ConsistencyDay = { day: string; count: number; fraction: number };

/** Trailing `count` days, each with the share of habits done — the heatmap. */
export function consistencySeries(
  habits: Habit[],
  todayKey: string,
  count: number,
): ConsistencyDay[] {
  const counts = markCounts(habits);
  const n = Math.max(1, habits.length);
  return windowDays(todayKey, count).map((day) => {
    const c = counts.get(day) ?? 0;
    return { day, count: c, fraction: c / n };
  });
}

/** Average daily completion for the current month, and the best month on record. */
export function monthlyConsistency(
  habits: Habit[],
  todayKey: string,
): { thisMonth: number; bestMonth: number } {
  if (habits.length === 0) return { thisMonth: 0, bestMonth: 0 };
  const counts = markCounts(habits);
  const n = habits.length;

  const days = [...counts.keys()].sort();
  const start = days[0] ?? todayKey;

  const perMonth = new Map<string, { sum: number; days: number }>();
  let d = `${monthKey(start)}-01`;
  while (d <= todayKey) {
    const mk = monthKey(d);
    const rec = perMonth.get(mk) ?? { sum: 0, days: 0 };
    rec.sum += (counts.get(d) ?? 0) / n;
    rec.days += 1;
    perMonth.set(mk, rec);
    d = addDays(d, 1);
  }

  const pct = (r: { sum: number; days: number }) => (r.days ? r.sum / r.days : 0);
  const thisRec = perMonth.get(monthKey(todayKey));
  const thisMonth = thisRec ? pct(thisRec) : 0;
  let bestMonth = 0;
  for (const rec of perMonth.values()) bestMonth = Math.max(bestMonth, pct(rec));

  return { thisMonth, bestMonth };
}

export type WeeklyBar = { day: string; count: number };

/** Habits completed on each of the trailing 7 days — the weekly bar chart. */
export function weeklyProgress(habits: Habit[], todayKey: string): WeeklyBar[] {
  const counts = markCounts(habits);
  return windowDays(todayKey, 7).map((day) => ({
    day,
    count: counts.get(day) ?? 0,
  }));
}
