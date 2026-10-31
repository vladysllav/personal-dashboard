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

/**
 * Every habit on a given day, each with what that day asks of it — the habits
 * board, which is a list of everything you keep rather than of what is due.
 * Same order as `habitsForDay`, with the habits the day does not ask for last.
 */
export function allHabitsForDay(habits: Habit[], dayKey: string): HabitOnDay[] {
  return habits
    .map((habit) => ({ habit, day: habitDay(habit, dayKey) }))
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

/**
 * What one day asked of one habit, read as it stood *on* that day.
 *
 * Later marks are hidden first, so last Tuesday is judged on what had happened
 * by last Tuesday — a gym session on Friday cannot retroactively make Tuesday
 * "already done for the week". A habit counts when it was due (or late) that
 * day, or when it was marked anyway: a session you did on an optional day is
 * still a session, and leaving it out would let a day read above 100%.
 */
export function dueOn(habit: Habit, day: string): { counts: boolean; done: boolean } {
  if (day < habit.startDate) return { counts: false, done: false };
  const asOf = { ...habit, marks: habit.marks.filter((m) => m <= day) };
  const status = habitDay(asOf, day).status;
  const done = status === "done";
  return { counts: done || status === "due" || status === "overdue", done };
}

export type DayStat = {
  day: string;
  /** Habits marked on this day. */
  done: number;
  /** Habits this day asked for — due, late, or marked anyway. */
  due: number;
  /** `done / due`, 0–1. Zero when nothing was asked. */
  pct: number;
};

/**
 * Completion for each day in a range — the daily chart.
 *
 * The denominator is what each day actually asked for, not every habit you
 * keep. With the gym already done three times this week and today not a
 * shaving day, four of six habits are due, and three of them ticked is 75% —
 * not 50% for failing to do things nobody asked of you.
 */
export function dayStats(habits: Habit[], fromKey: string, toKey: string): DayStat[] {
  const out: DayStat[] = [];
  for (let day = fromKey; day <= toKey; day = addDays(day, 1)) {
    let done = 0;
    let due = 0;
    for (const habit of habits) {
      const d = dueOn(habit, day);
      if (!d.counts) continue;
      due += 1;
      if (d.done) done += 1;
    }
    out.push({ day, done, due, pct: due === 0 ? 0 : done / due });
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
  /** Not lived yet. */
  future: boolean;
};

/**
 * Quota completion week by week, every week from `fromKey`'s to `toKey`'s.
 *
 * Unlike the daily view this scores cadence exactly: four gym sessions out of
 * four is 100%, whichever days they landed on.
 */
export function weekStatsBetween(
  habits: Habit[],
  fromKey: string,
  toKey: string,
  todayKey: string,
): WeekStat[] {
  const plans = habits.map((habit) => ({
    plan: habitPlan(habit),
    marks: new Set(habit.marks),
  }));
  const thisWeek = startOfWeek(todayKey);
  const out: WeekStat[] = [];

  for (let weekStart = startOfWeek(fromKey); weekStart <= toKey; weekStart = addDays(weekStart, 7)) {
    let done = 0;
    let target = 0;
    for (const { plan, marks } of plans) {
      // Only the days of this week the commitment actually covers count, so a
      // habit starting on Thursday is not judged on Monday to Wednesday.
      for (let d = 0; d < 7; d += 1) {
        const day = addDays(weekStart, d);
        if (!inPlan(plan, day)) continue;
        target += owedOn(plan, day);
        if (marks.has(day)) done += 1;
      }
    }
    out.push({
      weekStart,
      done,
      target,
      pct: target <= 0 ? 0 : Math.min(1, done / target),
      current: weekStart === thisWeek,
      future: weekStart > todayKey,
    });
  }
  return out;
}

/** The last `weeks` weeks, ending on the one containing `endKey`. */
export function weekStats(
  habits: Habit[],
  endKey: string,
  weeks: number,
  todayKey: string = endKey,
): WeekStat[] {
  const last = startOfWeek(endKey);
  return weekStatsBetween(habits, addDays(last, -(weeks - 1) * 7), last, todayKey);
}

/**
 * Marks one plan asks of one day, fractional for quotas. Fixed weekdays are
 * exact — a Mon/Thu habit owes a whole mark on Thursday and none on Friday —
 * and a monthly quota is spread over that month's real length.
 */
function owedOn(plan: HabitPlan, day: string): number {
  const f = plan.frequency;
  if (f.unit === "day") return 1;
  if (f.weekdays.length > 0) return f.weekdays.includes(isoWeekday(day)) ? 1 : 0;
  if (f.unit === "week") return f.count / 7;
  return f.count / Number(endOfMonth(day).slice(8, 10));
}

export type MonthStats = {
  /** YYYY-MM. */
  month: string;
  /** Marks landed this month, across every habit, inside its own window. */
  done: number;
  /** Marks the plans asked for this month so far, fractional. */
  expected: number;
  /** Marks the plans ask for across the whole month, today and after included. */
  total: number;
  /** `done / expected`, 0–1. */
  adherence: number;
  /** The month still being lived. */
  current: boolean;
};

/**
 * The headline figures, scored one calendar month at a time.
 *
 * A lifetime ratio stops moving after a few months: one good week barely
 * shifts it and one bad one barely dents it. Starting the count fresh on the
 * 1st makes the ring answer "how is this month going", which is a question you
 * can still do something about.
 *
 * Same rule as everywhere else for today: an open day is not a missed one, so
 * it only joins the expectation once the habit has been marked on it.
 */
export function monthStats(
  habits: Habit[],
  anyDayInMonth: string,
  todayKey: string,
): MonthStats {
  const month = monthKey(anyDayInMonth);
  const monthStart = `${month}-01`;
  const monthEnd = endOfMonth(monthStart);
  const current = month === monthKey(todayKey);

  let done = 0;
  let expected = 0;
  let total = 0;

  for (const habit of habits) {
    const plan = habitPlan(habit);
    const marks = new Set(habit.marks);
    const from = plan.startDate > monthStart ? plan.startDate : monthStart;

    for (let day = from; day <= monthEnd; day = addDays(day, 1)) {
      const owed = owedOn(plan, day);
      total += owed;
      if (day > todayKey) continue;
      const marked = marks.has(day);
      if (marked) done += 1;
      // Closed days only, plus today once it has been marked.
      if (day < todayKey || marked) expected += owed;
    }
  }

  return {
    month,
    done,
    expected,
    total,
    adherence: expected <= 0 ? (done > 0 ? 1 : 0) : Math.min(1, done / expected),
    current,
  };
}
