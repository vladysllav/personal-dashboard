import {
  addDays,
  daysBetween,
  endOfMonth,
  monthKey,
  startOfWeek,
  weekdayIndex,
} from "./dates";
import type { Frequency, Habit } from "./types";

/**
 * The habit model.
 *
 * A habit is a cadence and a start date: "every day", "4× a week on Mon, Tue,
 * Thu and Sat", "twice a month". That is the whole commitment — there is no
 * end date and no total, because a habit is not a project. What it answers is
 * "is this due today" and "how much of what I asked of myself landed".
 *
 * What it deliberately does not answer is "am I ahead or behind". Goals carry
 * that reading because a goal is one quantity moving toward one number; a
 * habit is a thing you did or did not do today, and a verdict attached to
 * every missed Sunday is how a tracker stops being opened.
 *
 * Every figure below is derived from `marks` on read. Nothing about progress is
 * stored, so editing the cadence re-scores the history honestly rather than
 * leaving a stale number behind.
 */

/** Days in an average month. Used only to put a monthly cadence on a daily rate. */
const DAYS_PER_MONTH = 30.44;

/**
 * A stored cadence, made safe to compute with.
 *
 * Everything downstream divides by these numbers, so a hand-edited row or an
 * older record can never produce a zero, a fraction or a count of twelve a
 * week. Fixed weekdays win over the count: picking three days *is* saying
 * three times a week, and the two must not be able to disagree.
 */
export function normalizeFrequency(raw: Frequency | undefined): Frequency {
  const unit = raw?.unit === "week" || raw?.unit === "month" ? raw.unit : "day";

  const weekdays =
    unit === "week" && Array.isArray(raw?.weekdays)
      ? [...new Set(raw.weekdays)].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort()
      : [];

  if (unit === "day") return { count: 1, unit, weekdays: [] };
  if (weekdays.length > 0) return { count: weekdays.length, unit, weekdays };

  const max = unit === "week" ? 7 : 28;
  const count = Math.min(max, Math.max(1, Math.round(raw?.count ?? 1)));
  return { count, unit, weekdays };
}

export type HabitPlan = {
  frequency: Frequency;
  isDaily: boolean;
  startDate: string;
  /**
   * Marks the plan asks for per calendar day, fractional on purpose. A 4×/week
   * habit is owed 0.571 a day: rounding here would invent a miss on a
   * Wednesday and hide one on a Sunday.
   */
  perDay: number;
  /** The same rate over a week — what the weekly chart scores against. */
  perWeek: number;
};

export function habitPlan(habit: Habit): HabitPlan {
  const frequency = normalizeFrequency(habit.frequency);
  const perDay =
    frequency.unit === "day"
      ? 1
      : frequency.unit === "week"
        ? frequency.count / 7
        : frequency.count / DAYS_PER_MONTH;

  return {
    frequency,
    isDaily: frequency.unit === "day",
    startDate: habit.startDate,
    perDay,
    perWeek: perDay * 7,
  };
}

/** True when `day` falls inside the commitment — the window marks are counted in. */
export function inPlan(plan: HabitPlan, day: string): boolean {
  return day >= plan.startDate;
}

/**
 * Days the plan has *closed* — everything from the start up to yesterday.
 *
 * Today is deliberately excluded. An unfinished day is not a missed one, and
 * counting it would leave every perfectly kept daily habit reading "behind by
 * one" from midnight until the moment it is ticked.
 */
function closedDays(plan: HabitPlan, todayKey: string): number {
  if (todayKey <= plan.startDate) return 0;
  return daysBetween(plan.startDate, todayKey);
}

/** Marks the plan has asked for so far, fractional. */
function expectedByNow(plan: HabitPlan, todayKey: string): number {
  return closedDays(plan, todayKey) * plan.perDay;
}

/* ---------- Cadence in words ---------- */

const DAY_NAME = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** ISO weekday, 1 = Monday … 7 = Sunday. `weekdayIndex` is 0-based from Monday. */
export function isoWeekday(dateKey: string): number {
  return weekdayIndex(dateKey) + 1;
}

export function weekdayNames(days: number[]): string {
  return days.map((d) => DAY_NAME[d - 1] ?? "").filter(Boolean).join(", ");
}

/** "Every day", "Mon, Wed, Fri", "4× a week", "Twice a month". */
export function cadenceLabel(frequency: Frequency): string {
  const f = normalizeFrequency(frequency);
  if (f.unit === "day") return "Every day";
  if (f.weekdays.length === 7) return "Every day";
  if (f.weekdays.length > 0) return weekdayNames(f.weekdays);
  const per = f.unit === "week" ? "a week" : "a month";
  if (f.count === 1) return `Once ${per}`;
  if (f.count === 2) return `Twice ${per}`;
  return `${f.count}× ${per}`;
}

/* ---------- One habit, one day ---------- */

export type DayStatus =
  /** Past due within its own window — the week is running out of room. */
  | "overdue"
  /** Asked for on this day. */
  | "due"
  /** Not required today, but it would put you ahead. */
  | "optional"
  /** Already marked on this day. */
  | "done"
  /** Not part of this day at all: a rest day, or before the habit began. */
  | "off";

export type HabitDay = {
  status: DayStatus;
  /** Why it is on the list — the plan behind it, in a few words. */
  detail: string;
};

/** Marks inside the Monday–Sunday week containing `dayKey`. */
function marksInWeekOf(habit: Habit, dayKey: string): number {
  const from = startOfWeek(dayKey);
  const to = addDays(from, 6);
  return habit.marks.filter((m) => m >= from && m <= to).length;
}

/** Marks inside the calendar month containing `dayKey`. */
function marksInMonthOf(habit: Habit, dayKey: string): number {
  const mk = monthKey(dayKey);
  return habit.marks.filter((m) => monthKey(m) === mk).length;
}

/**
 * A quota's claim on one day: how many are left, how much room is left to do
 * them in, and when the last one was. The same arithmetic scores a weekly and
 * a monthly cadence — only the window changes — so the two cannot drift apart.
 */
function quotaClaim(
  habit: Habit,
  dayKey: string,
  count: number,
  done: number,
  daysLeft: number,
  windowDays: number,
  per: string,
  window: string,
): HabitDay {
  const left = count - done;
  if (left <= 0) return { status: "off", detail: `${per} — done` };

  if (left >= daysLeft) {
    const days = `${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
    return {
      status: left > daysLeft ? "overdue" : "due",
      detail:
        left === daysLeft
          ? `${left} left, ${days} to do ${left === 1 ? "it" : "them"}`
          : `${left} left, only ${days} to go`,
    };
  }

  /**
   * Spacing. Three times a week is a session about every other day, so a habit
   * is due once that gap has passed since the last one. This is what turns
   * "you were not at the gym yesterday" into a task today rather than a silent
   * debt that only surfaces on Sunday.
   */
  const gap = Math.max(1, Math.floor(windowDays / count));
  const last = habit.marks.filter((m) => m < dayKey).sort().pop();
  const since = last ? daysBetween(last, dayKey) : Infinity;

  if (since >= gap) {
    return {
      status: "due",
      detail: last
        ? `${per} · last ${since === 1 ? "yesterday" : `${since} days ago`}`
        : `${per} · not started yet`,
    };
  }

  return { status: "optional", detail: `${done} of ${count} ${window}` };
}

/**
 * What one habit asks of one day.
 *
 * The single source of truth for "is this due": the habits screen builds its
 * day list from it, and Today's reminders are the same answer with goals mixed
 * in. Two implementations of this question would eventually disagree, and the
 * day they did, the app would be lying on one of the two screens.
 */
export function habitDay(habit: Habit, dayKey: string): HabitDay {
  const plan = habitPlan(habit);
  if (!inPlan(plan, dayKey)) return { status: "off", detail: "Not started yet" };

  const f = plan.frequency;
  const done = habit.marks.includes(dayKey);

  if (f.unit === "day") {
    return { status: done ? "done" : "due", detail: "Every day" };
  }

  if (f.weekdays.length > 0) {
    const list = weekdayNames(f.weekdays);
    if (done) return { status: "done", detail: list };
    // A rest day is not a task. Listing it would fill a screen whose whole job
    // is to be short with things you are not meant to do.
    if (!f.weekdays.includes(isoWeekday(dayKey))) {
      return { status: "off", detail: `Rest day — ${list}` };
    }
    return { status: "due", detail: `Scheduled — ${list}` };
  }

  if (f.unit === "week") {
    const inWeek = marksInWeekOf(habit, dayKey);
    const per = `${f.count}× a week`;
    if (done) {
      return {
        status: "done",
        detail: inWeek >= f.count ? "Week complete" : `${inWeek} of ${f.count} this week`,
      };
    }
    return quotaClaim(
      habit,
      dayKey,
      f.count,
      inWeek,
      // Today included: Sunday is one day left, not zero.
      7 - weekdayIndex(dayKey),
      7,
      per,
      "this week",
    );
  }

  const inMonth = marksInMonthOf(habit, dayKey);
  const per = f.count === 1 ? "Once a month" : `${f.count}× a month`;
  if (done) {
    return {
      status: "done",
      detail: inMonth >= f.count ? "Month complete" : `${inMonth} of ${f.count} this month`,
    };
  }
  const monthDays = Number(endOfMonth(dayKey).slice(8, 10));
  const daysLeft = monthDays - Number(dayKey.slice(8, 10)) + 1;
  return quotaClaim(habit, dayKey, f.count, inMonth, daysLeft, monthDays, per, "this month");
}

const DAY_ORDER: Record<DayStatus, number> = {
  overdue: 0,
  due: 1,
  optional: 2,
  done: 3,
  off: 4,
};

export type HabitOnDay = { habit: Habit; day: HabitDay };

/**
 * The habits a given day actually asks for, late first and finished last.
 *
 * Rest days and met quotas drop out entirely: a list of what to do today has
 * to be short enough to be read in one glance, and a row saying "not today"
 * costs exactly as much attention as a row saying "do this".
 */
export function habitsForDay(habits: Habit[], dayKey: string): HabitOnDay[] {
  return habits
    .map((habit) => ({ habit, day: habitDay(habit, dayKey) }))
    .filter(({ day }) => day.status !== "off")
    .sort((a, b) => {
      const byStatus = DAY_ORDER[a.day.status] - DAY_ORDER[b.day.status];
      if (byStatus !== 0) return byStatus;
      return a.habit.name.localeCompare(b.habit.name);
    });
}

/* ---------- Streaks ----------
 *
 * The habit card and the overview both dropped the per-habit streak while its
 * place in the product is being decided. The derivation is kept rather than
 * deleted because the rules in it — the grace an unfinished today gets, and
 * what a run even means for a habit that is not daily — are the hard part, and
 * they are settled. It costs one scan per card and nothing where it is not
 * called.
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
  /** Marks owed by today, fractional. */
  expected: number;
  /** `done / expected`, 0–1 — adherence so far. The habit's headline figure. */
  adherence: number;

  /** Marks landed in the current Monday–Sunday week. */
  weekMarks: number;
  /** What a whole week of this cadence asks for, rounded for display. */
  weekTarget: number;

  /** Streak in the habit's own unit: days when daily, weeks otherwise. */
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

  const weekStart = startOfWeek(todayKey);
  const weekMarks = marksInWeek(marks, weekStart);
  const weekTarget = Math.max(1, Math.round(plan.perWeek));

  // Only the streak in the habit's own unit is worked out. `bestWeekStreak`
  // walks every week since the first mark, and running it for a daily habit
  // whose answer is counted in days is a scan for nothing.
  const first = sorted[0];
  const streak = plan.isDaily
    ? currentDayStreak(marks, todayKey)
    : currentWeekStreak(marks, weekStart, weekTarget);
  const bestStreak = plan.isDaily
    ? bestDayStreak(sorted)
    : first
      ? bestWeekStreak(marks, first, weekStart, weekTarget)
      : 0;

  const lastMark = sorted.at(-1);

  // "Broken" costs a habit its streak badge, so the bar is set where a miss is
  // unambiguous: two clear days for a daily habit, two clear weeks otherwise.
  // An empty Monday morning is not yet a failure.
  const staleAfter = plan.isDaily ? 1 : 13;
  const broken =
    streak === 0 &&
    lastMark !== undefined &&
    daysBetween(lastMark, todayKey) > staleAfter;

  return {
    plan,
    markedToday: marks.has(todayKey),
    done,
    expected,
    adherence: expected <= 0 ? 0 : Math.min(1, done / expected),
    weekMarks,
    weekTarget,
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
      target += plan.perDay * coveredDays;
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
  /** Habits this day actually asked for — the denominator of "marked today". */
  dueToday: number;
  markedToday: number;
  /** Marks landed, across every habit, inside its own window. */
  done: number;
  /** Marks owed by today, across every habit. */
  expected: number;
  /** `done / expected`, 0–1 — the headline figure. */
  adherence: number;
};

/**
 * The single number for the donut: of everything the plans asked of you so far,
 * how much landed. Adherence rather than a lifetime count, because a habit
 * started yesterday would otherwise drag the figure to nearly zero and say
 * nothing about how you are actually doing.
 */
export function overallStats(habits: Habit[], todayKey: string): OverallStats {
  let done = 0;
  let expected = 0;
  let markedToday = 0;
  let dueToday = 0;

  for (const habit of habits) {
    const stats = deriveHabitStats(habit, todayKey);
    done += stats.done;
    expected += stats.expected;
    if (stats.markedToday) markedToday += 1;
    const status = habitDay(habit, todayKey).status;
    if (status !== "off" && status !== "optional") dueToday += 1;
  }

  return {
    habits: habits.length,
    dueToday,
    markedToday,
    done,
    expected,
    adherence: expected <= 0 ? 0 : Math.min(1, done / expected),
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
