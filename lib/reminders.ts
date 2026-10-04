import { formatRate, formatValue } from "./format";
import { deriveGoal } from "./goals";
import { habitDay } from "./habits";
import type { Goal, Habit } from "./types";

/**
 * What today actually asks of you.
 *
 * The dashboard used to open with four percentages, which answer "how am I
 * doing" and not "what do I do now" — you still had to read two lists and do
 * the arithmetic yourself. This turns the plan into the second answer: one list
 * of the things due today, derived rather than stored, so it can never drift
 * out of step with the habits and goals it is made of.
 *
 * The habit half of that question is answered by `habitDay` in `lib/habits.ts`
 * — the same function the habits screen builds its own day list from. Goals are
 * the part that lives here.
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

/**
 * One habit's claim on today, in the shape this list speaks.
 *
 * `habitDay` already decides whether a habit is late, due, merely available or
 * handled; the only translation needed is dropping the days it has no claim on
 * at all, which this list has no row for.
 */
function habitReminder(habit: Habit, todayKey: string): Reminder | null {
  const { status, detail } = habitDay(habit, todayKey);
  if (status === "off") return null;
  return {
    id: `habit:${habit.id}`,
    kind: "habit",
    title: habit.name,
    habitId: habit.id,
    detail: habit.description.trim() || detail,
    urgency: status,
  };
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
