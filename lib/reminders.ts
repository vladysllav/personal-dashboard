import { addDays, daysBetween, startOfWeek, weekdayIndex } from "./dates";
import { formatRate, formatValue } from "./format";
import { deriveGoal } from "./goals";
import { habitPlan, inPlan } from "./habits";
import type { Goal, Habit } from "./types";

/**
 * What today actually asks of you.
 *
 * The dashboard used to open with four percentages, which answer "how am I
 * doing" and not "what do I do now" — you still had to read two lists and do
 * the arithmetic yourself. This turns the plan into the second answer: one list
 * of the things due today, derived rather than stored, so it can never drift
 * out of step with the habits and goals it is made of.
 */

export type Urgency =
  /** Past its day, or past its deadline. */
  | "overdue"
  /** Due today. */
  | "due"
  /** Not required today, but available and would put you ahead. */
  | "optional"
  /** Already handled today. */
  | "done";

export type Reminder = {
  id: string;
  kind: "habit" | "goal";
  title: string;
  /** Why it is on the list — the plan behind it, in a few words. */
  detail: string;
  urgency: Urgency;
  habitId?: string;
  goalId?: string;
};

const ORDER: Record<Urgency, number> = { overdue: 0, due: 1, optional: 2, done: 3 };

/** ISO weekday, 1 = Monday … 7 = Sunday. `weekdayIndex` is 0-based from Monday. */
function isoWeekday(dateKey: string): number {
  return weekdayIndex(dateKey) + 1;
}

const DAY_NAME = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Marks inside the Monday–Sunday week that contains `todayKey`. */
function marksThisWeek(habit: Habit, todayKey: string): string[] {
  const from = startOfWeek(todayKey);
  const to = addDays(from, 6);
  return habit.marks.filter((m) => m >= from && m <= to);
}

/**
 * One habit's claim on today.
 *
 * Two shapes, because a commitment can be made two ways. With fixed days the
 * answer is a lookup — Thursday or not. With a bare quota it is a question of
 * pacing, and the rule is the one a person actually uses: spread the sessions
 * out, and if the week is running out of room, stop spreading and go today.
 */
function habitReminder(habit: Habit, todayKey: string): Reminder | null {
  const plan = habitPlan(habit);
  if (!inPlan(plan, todayKey)) return null;

  const base = { id: `habit:${habit.id}`, kind: "habit" as const, title: habit.name, habitId: habit.id };
  const doneToday = habit.marks.includes(todayKey);

  if (habit.weekdays.length > 0) {
    const due = habit.weekdays.includes(isoWeekday(todayKey));
    const dayList = habit.weekdays.map((d) => DAY_NAME[d - 1]).join(", ");
    if (doneToday) return { ...base, detail: dayList, urgency: "done" };
    if (!due) {
      // A day off is not a task. Showing it as "optional" would put five
      // non-items on a list whose whole job is to be short.
      return null;
    }
    return { ...base, detail: `Scheduled — ${dayList}`, urgency: "due" };
  }

  const target = plan.target;

  /**
   * A daily habit has no quota to catch up on: every day stands on its own, and
   * a missed Monday cannot be made good by doing two on Tuesday. Running it
   * through the weekly arithmetic below made it "7 needed, 6 days left" and so
   * permanently overdue from Tuesday morning — every daily habit red, all week,
   * which is the fastest way to teach someone to ignore the list.
   */
  if (plan.isDaily) {
    return doneToday
      ? { ...base, detail: "Every day", urgency: "done" }
      : { ...base, detail: "Every day", urgency: "due" };
  }

  const done = marksThisWeek(habit, todayKey).length;
  const left = target - done;

  if (doneToday) {
    return {
      ...base,
      detail: left <= 0 ? "Week complete" : `${done} of ${target} this week`,
      urgency: "done",
    };
  }

  if (left <= 0) return null;

  // Today included: Sunday is one day left, not zero.
  const daysLeft = 7 - weekdayIndex(todayKey);

  if (left >= daysLeft) {
    return {
      ...base,
      detail:
        left === daysLeft
          ? `${left} left and ${daysLeft} ${daysLeft === 1 ? "day" : "days"} to do ${left === 1 ? "it" : "them"}`
          : `${left} left, only ${daysLeft} ${daysLeft === 1 ? "day" : "days"} of the week remain`,
      urgency: left > daysLeft ? "overdue" : "due",
    };
  }

  /**
   * Spacing. Three times a week is a session about every other day, so a habit
   * is due once that gap has passed since the last one. This is what makes
   * "you were not at the gym yesterday" turn into a task today rather than a
   * silent debt that only surfaces on Sunday.
   */
  const gap = Math.max(1, Math.floor(7 / target));
  const last = [...habit.marks].filter((m) => m < todayKey).sort().pop();
  const since = last ? daysBetween(last, todayKey) : Infinity;

  if (since >= gap) {
    return {
      ...base,
      detail: last
        ? `${target}× a week · last ${since === 1 ? "yesterday" : `${since} days ago`}`
        : `${target}× a week · not started yet`,
      urgency: "due",
    };
  }

  return { ...base, detail: `${done} of ${target} this week`, urgency: "optional" };
}

/**
 * One goal's claim on today.
 *
 * A goal does not become due, it drifts, so what it contributes is the amount
 * that keeps it on the line — and the verdict it already carries. A finished
 * goal asks for nothing and is left off entirely.
 */
function goalReminder(goal: Goal, todayKey: string): Reminder | null {
  const derived = deriveGoal(goal, todayKey);
  if (derived.status === "complete") return null;

  const base = { id: `goal:${goal.id}`, kind: "goal" as const, title: goal.name, goalId: goal.id };

  if (goal.kind === "milestone") {
    const next = goal.milestones.find((m) => !m.done);
    if (!next) return null;
    return {
      ...base,
      detail: `Next: ${next.label}`,
      urgency: derived.status === "overdue" ? "overdue" : derived.status === "behind" ? "due" : "optional",
    };
  }

  const loggedToday = goal.entries.some((e) => e.at.slice(0, 10) === todayKey);
  const rate =
    derived.adaptedRate === null
      ? null
      : formatRate(derived.adaptedRate, goal.unit, goal.stepUnit);

  if (derived.status === "overdue") {
    return {
      ...base,
      detail: `Past its deadline — ${formatValue(derived.remaining, goal.unit)} still to go`,
      urgency: "overdue",
    };
  }

  if (derived.status === "behind") {
    return { ...base, detail: rate ? `Behind — ${rate} to catch up` : "Behind plan", urgency: "due" };
  }

  if (loggedToday) {
    return { ...base, detail: "Logged today", urgency: "done" };
  }

  return { ...base, detail: rate ? `On pace — ${rate}` : "On pace", urgency: "optional" };
}

/**
 * Today's list, ordered by how much it matters: what is late, then what is
 * due, then what is merely available, then what is already handled. Within a
 * band, habits come before goals — a habit is a yes/no you can finish in a
 * moment, a goal is a number you sit down to.
 */
export function todaysReminders(
  habits: Habit[],
  goals: Goal[],
  todayKey: string,
): Reminder[] {
  const items: Reminder[] = [];
  for (const habit of habits) {
    const r = habitReminder(habit, todayKey);
    if (r) items.push(r);
  }
  for (const goal of goals) {
    const r = goalReminder(goal, todayKey);
    if (r) items.push(r);
  }

  return items.sort((a, b) => {
    const byUrgency = ORDER[a.urgency] - ORDER[b.urgency];
    if (byUrgency !== 0) return byUrgency;
    if (a.kind !== b.kind) return a.kind === "habit" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** What the header says: how much of today is still outstanding. */
export function reminderCounts(items: Reminder[]) {
  const outstanding = items.filter((i) => i.urgency !== "done" && i.urgency !== "optional");
  return {
    total: items.length,
    outstanding: outstanding.length,
    overdue: items.filter((i) => i.urgency === "overdue").length,
    done: items.filter((i) => i.urgency === "done").length,
  };
}
