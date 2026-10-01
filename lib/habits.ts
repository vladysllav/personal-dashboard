import { addDays, daysBetween, startOfWeek } from "./dates";
import type { Habit } from "./types";

/**
 * The habit model.
 *
 * A habit is a *commitment*, not a checkbox: a cadence ("4× a week"), a start
 * date, and optionally a length ("for 12 weeks"). That turns it into a total —
 * 4 × 12 is 48 sessions — so "how much of this have I done" has an answer.
 *
 * What it deliberately does not answer is "am I ahead or behind". Goals carry
 * that reading because a goal is one quantity moving toward one number; a
 * habit is a thing you did or did not do today, and a verdict attached to
 * every missed Sunday is how a tracker stops being opened.
 *
 * Every figure below is derived from `marks` on read. Nothing about progress is
 * stored, so editing the cadence or the length re-scores the history honestly
 * rather than leaving a stale number behind.
 */

/** A habit's intended cadence, 1–7 days a week. Missing/legacy = daily (7). */
function habitTarget(habit: Habit): number {
  const t = habit.weeklyTarget;
  if (!t || !Number.isFinite(t)) return 7;
  return Math.min(7, Math.max(1, Math.round(t)));
}

export type HabitPlan = {
  /** Times a week, 1–7. */
  target: number;
  isDaily: boolean;
  startDate: string;
  /** Null for an open-ended habit. */
  durationWeeks: number | null;
  /** Inclusive last day of the commitment. Null when open-ended. */
  endDate: string | null;
  /** Marks the whole plan asks for. Null when open-ended. */
  totalTarget: number | null;
};

export function habitPlan(habit: Habit): HabitPlan {
  const target = habitTarget(habit);
  const duration =
    habit.durationWeeks && Number.isFinite(habit.durationWeeks)
      ? Math.max(1, Math.round(habit.durationWeeks))
      : null;

  return {
    target,
    isDaily: target >= 7,
    startDate: habit.startDate,
    durationWeeks: duration,
    endDate: duration === null ? null : addDays(habit.startDate, duration * 7 - 1),
    totalTarget: duration === null ? null : duration * target,
  };
}

/** True when `day` falls inside the commitment — the window marks are counted in. */
export function inPlan(plan: HabitPlan, day: string): boolean {
  if (day < plan.startDate) return false;
  return plan.endDate === null || day <= plan.endDate;
}

/**
 * Days of the plan already spent, today included and capped at the plan's
 * length. This is calendar time — how much of the commitment is gone — and it
 * must never run past the finish line, or a finished habit would look like it
 * were still slipping.
 */
function elapsedDays(plan: HabitPlan, todayKey: string): number {
  if (todayKey < plan.startDate) return 0;
  const last = plan.endDate !== null && todayKey > plan.endDate ? plan.endDate : todayKey;
  return daysBetween(plan.startDate, last) + 1;
}

/**
 * Days the plan has *closed* — everything up to yesterday.
 *
 * Today is deliberately excluded. An unfinished day is not a missed one, and
 * counting it would leave every perfectly kept daily habit reading "behind by
 * one" from midnight until the moment it is ticked. It is the same grace the
 * streak rule gives today, applied to the pace arithmetic.
 */
function closedDays(plan: HabitPlan, todayKey: string): number {
  const elapsed = elapsedDays(plan, todayKey);
  // A finished plan has no day still in progress — every one of its days counts.
  const finished = plan.endDate !== null && todayKey > plan.endDate;
  return finished ? elapsed : Math.max(0, elapsed - 1);
}

/**
 * Marks the plan has asked for so far — fractional on purpose. A 4×/week habit
 * three closed days in is owed 1.7 sessions, not 2: rounding here would invent
 * a miss on a Wednesday and hide one on a Sunday.
 */
function expectedByNow(plan: HabitPlan, todayKey: string): number {
  return (closedDays(plan, todayKey) * plan.target) / 7;
}

/* ---------- Streaks ----------
 *
 * Nothing on screen reads these right now: the habit card and the overview
 * both dropped the streak while its place in the product is being decided.
 * The derivation is kept rather than deleted because the rules in it — the
 * grace an unfinished today gets, and what a run even means for a habit that
 * is not daily — are the hard part, and they are settled. It costs one scan
 * per card and nothing at all where it is not called.
 */

/** Consecutive marked days ending today — or yesterday, when today is still open. */
function currentDayStreak(marks: Set<string>, todayKey: string): number {
  let cursor = marks.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (marks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive marked days ever recorded. */
function bestDayStreak(sortedMarks: string[]): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sortedMarks) {
    run = prev !== null && daysBetween(prev, day) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return best;
}

function marksInWeek(marks: Set<string>, weekStartKey: string): number {
  let count = 0;
  for (let i = 0; i < 7; i += 1) if (marks.has(addDays(weekStartKey, i))) count += 1;
  return count;
}

/**
 * Consecutive *successful weeks* ending with the current one. A 4×/week habit
 * cannot have a run of days, so this is its streak. The week in progress only
 * joins the run once it has already reached the target — the same grace an
 * unfinished today gets in the daily rule.
 */
function currentWeekStreak(
  marks: Set<string>,
  weekStart: string,
  target: number,
): number {
  let streak = marksInWeek(marks, weekStart) >= target ? 1 : 0;
  let week = addDays(weekStart, -7);
  while (marksInWeek(marks, week) >= target) {
    streak += 1;
    week = addDays(week, -7);
  }
  return streak;
}

function bestWeekStreak(
  marks: Set<string>,
  firstMark: string,
  weekStart: string,
  target: number,
): number {
  let best = 0;
  let run = 0;
  for (let week = startOfWeek(firstMark); week <= weekStart; week = addDays(week, 7)) {
    if (marksInWeek(marks, week) >= target) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/* ---------- Per-habit derivation ---------- */

export type HabitStats = {
  plan: HabitPlan;
  markedToday: boolean;

  /** Marks that fall inside the commitment window. */
  done: number;
  /** What the whole plan asks for. Null when open-ended. */
  totalTarget: number | null;
  /** `done / totalTarget`, 0–1. Null when open-ended. */
  goalProgress: number | null;
  /** Marks owed by today, fractional. */
  expected: number;
  /** `done / expected`, 0–1 — adherence so far. The figure open-ended habits use. */
  adherence: number;

  /** Whole days left before the finish line, today excluded. Null when open-ended. */
  daysLeft: number | null;
  /** Marks landed in the current Monday–Sunday week. */
  weekMarks: number;

  /** Streak in the habit's own unit: days when daily, weeks when cadence-based. */
  streak: number;
  streakUnit: "day" | "week";
  bestStreak: number;
  /** The run ended before today, and is not merely unfinished. Stated, not scolded. */
  broken: boolean;
};

export function deriveHabitStats(habit: Habit, todayKey: string): HabitStats {
  const plan = habitPlan(habit);
  const marks = new Set(habit.marks);
  const sorted = [...marks].sort();

  const done = sorted.filter((day) => inPlan(plan, day)).length;
  const expected = expectedByNow(plan, todayKey);

  const totalTarget = plan.totalTarget;
  const goalProgress =
    totalTarget === null ? null : Math.min(1, done / Math.max(1, totalTarget));
  const adherence = expected <= 0 ? 0 : Math.min(1, done / expected);

  const daysLeft =
    plan.endDate === null ? null : Math.max(0, daysBetween(todayKey, plan.endDate));

  const weekStart = startOfWeek(todayKey);
  const weekMarks = marksInWeek(marks, weekStart);

  // Only the streak in the habit's own unit is worked out. `bestWeekStreak`
  // walks every week since the first mark, and running it for a daily habit
  // whose answer is counted in days is a scan for nothing.
  const first = sorted[0];
  const streak = plan.isDaily
    ? currentDayStreak(marks, todayKey)
    : currentWeekStreak(marks, weekStart, plan.target);
  const bestStreak = plan.isDaily
    ? bestDayStreak(sorted)
    : first
      ? bestWeekStreak(marks, first, weekStart, plan.target)
      : 0;

  const lastMark = sorted.at(-1);

  // "Broken" costs a habit its streak badge, so the bar is set where a miss is
  // unambiguous: two clear days for a daily habit, two clear weeks for a
  // cadence one. An empty Monday morning is not yet a failure.
  const staleAfter = plan.isDaily ? 1 : 13;
  const broken =
    streak === 0 &&
    lastMark !== undefined &&
    daysBetween(lastMark, todayKey) > staleAfter;

  return {
    plan,
    markedToday: marks.has(todayKey),
    done,
    totalTarget,
    goalProgress,
    expected,
    adherence,
    daysLeft,
    weekMarks,
    streak,
    streakUnit: plan.isDaily ? "day" : "week",
    bestStreak,
    broken,
  };
}

/* ---------- Cross-habit aggregates ---------- */

export type DayStat = {
  day: string;
  /** Habits marked on this day. */
  done: number;
  /** Habits whose commitment covers this day at all. */
  active: number;
  /** `done / active`, 0–1. Zero when nothing was running. */
  pct: number;
};

/**
 * Completion for each day in a range — the daily bar chart.
 *
 * The denominator is habits *running* that day, not habits that owed you that
 * day: a 4×/week habit has no opinion about which four. So a perfect week of
 * gym still shows gaps here, and that is the honest reading of "what share of
 * my habits did I do today". The weekly chart is where quotas are scored.
 */
export function dayStats(
  habits: Habit[],
  fromKey: string,
  toKey: string,
): DayStat[] {
  const plans = habits.map((habit) => ({
    plan: habitPlan(habit),
    marks: new Set(habit.marks),
  }));

  const out: DayStat[] = [];
  for (let day = fromKey; day <= toKey; day = addDays(day, 1)) {
    let done = 0;
    let active = 0;
    for (const { plan, marks } of plans) {
      if (!inPlan(plan, day)) continue;
      active += 1;
      if (marks.has(day)) done += 1;
    }
    out.push({ day, done, active, pct: active === 0 ? 0 : done / active });
  }
  return out;
}

export type WeekStat = {
  /** Monday of the week. */
  weekStart: string;
  /** Marks landed across every running habit. */
  done: number;
  /** Sum of the weekly targets of the habits running that week. */
  target: number;
  /** `done / target`, 0–1. */
  pct: number;
  /** The week containing today — still in progress. */
  current: boolean;
};

/**
 * Quota completion week by week — the weekly bar chart.
 *
 * The window ends on the week you are standing in — there is nothing to read
 * in a week that has not happened. The last bar is therefore always partial,
 * filling up as the week goes.
 *
 * Unlike the daily view this scores cadence exactly: four gym sessions out of
 * four is 100%, whichever days they landed on.
 */
export function weekStats(
  habits: Habit[],
  todayKey: string,
  weeks: number,
): WeekStat[] {
  const plans = habits.map((habit) => ({
    plan: habitPlan(habit),
    marks: new Set(habit.marks),
  }));
  const thisWeek = startOfWeek(todayKey);

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(thisWeek, -(weeks - 1 - i) * 7);
    let done = 0;
    let target = 0;

    for (const { plan, marks } of plans) {
      // Only the days of this week the commitment actually covers count, so a
      // habit starting on Thursday is not judged on Monday to Wednesday.
      let coveredDays = 0;
      for (let d = 0; d < 7; d += 1) {
        const day = addDays(weekStart, d);
        if (!inPlan(plan, day)) continue;
        coveredDays += 1;
        if (marks.has(day)) done += 1;
      }
      if (coveredDays === 0) continue;
      target += (plan.target * coveredDays) / 7;
    }

    return {
      weekStart,
      done,
      target,
      pct: target <= 0 ? 0 : Math.min(1, done / target),
      current: weekStart === thisWeek,
    };
  });
}

/**
 * The last two *completed* weeks, for a week-over-week reading.
 *
 * Deliberately not "this week versus last": the week you are standing in is
 * half-lived, and comparing it to a finished one reports a collapse every
 * Monday morning. Both weeks here are closed, so the difference between them
 * is a real change in behaviour rather than an artefact of the calendar.
 *
 * Returns null until there are two closed weeks to compare.
 */
export function weekOverWeek(
  habits: Habit[],
  todayKey: string,
): { last: number; previous: number; delta: number } | null {
  if (habits.length === 0) return null;
  const weeks = weekStats(habits, todayKey, 3);
  const last = weeks[1];
  const previous = weeks[0];
  if (!last || !previous || last.target <= 0 || previous.target <= 0) return null;
  return {
    last: last.pct,
    previous: previous.pct,
    delta: last.pct - previous.pct,
  };
}

export type OverallStats = {
  habits: number;
  markedToday: number;
  /** Marks landed, across every habit, inside its own window. */
  done: number;
  /** Marks owed by today, across every habit. */
  expected: number;
  /** `done / expected`, 0–1 — the headline figure. */
  adherence: number;
  /** Share of the *whole* plan done, for habits that have a finish line. */
  planProgress: number | null;
  /** How many habits have a finish line at all. */
  planned: number;
  /** Habits that reached their whole-plan target. */
  completed: number;
};

/**
 * The single number for the donut: of everything the plans asked of you so far,
 * how much landed. Adherence rather than whole-plan progress, because a habit
 * started yesterday would otherwise drag the figure to nearly zero and say
 * nothing about how you are actually doing.
 */
export function overallStats(habits: Habit[], todayKey: string): OverallStats {
  let done = 0;
  let expected = 0;
  let planDone = 0;
  let planTarget = 0;
  let planned = 0;
  let completed = 0;
  let markedToday = 0;

  for (const habit of habits) {
    const stats = deriveHabitStats(habit, todayKey);
    done += stats.done;
    expected += stats.expected;
    if (stats.markedToday) markedToday += 1;
    if (stats.totalTarget !== null) {
      planned += 1;
      planDone += Math.min(stats.done, stats.totalTarget);
      planTarget += stats.totalTarget;
      if (stats.goalProgress !== null && stats.goalProgress >= 1) completed += 1;
    }
  }

  return {
    habits: habits.length,
    markedToday,
    done,
    expected,
    adherence: expected <= 0 ? 0 : Math.min(1, done / expected),
    planProgress: planTarget <= 0 ? null : Math.min(1, planDone / planTarget),
    planned,
    completed,
  };
}

/**
 * The whole-board streak. A day counts when at least half the habits running
 * that day were marked — the "did I show up" line. Today gets the same grace a
 * single habit gets: an as-yet-incomplete today is skipped, not counted a break.
 */
export function overallStreaks(
  habits: Habit[],
  todayKey: string,
): { current: number; longest: number } {
  if (habits.length === 0) return { current: 0, longest: 0 };

  const plans = habits.map((habit) => ({
    plan: habitPlan(habit),
    marks: new Set(habit.marks),
  }));

  const good = (day: string): boolean => {
    let done = 0;
    let active = 0;
    for (const { plan, marks } of plans) {
      if (!inPlan(plan, day)) continue;
      active += 1;
      if (marks.has(day)) done += 1;
    }
    return active > 0 && done >= Math.ceil(active / 2);
  };

  let cursor = good(todayKey) ? todayKey : addDays(todayKey, -1);
  let current = 0;
  while (good(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const first = habits
    .map((habit) => habit.startDate)
    .sort()
    .at(0);

  let longest = 0;
  if (first) {
    let run = 0;
    for (let day = first; day <= todayKey; day = addDays(day, 1)) {
      if (good(day)) {
        run += 1;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
    }
  }

  return { current, longest };
}
