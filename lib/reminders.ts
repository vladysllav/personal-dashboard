import { habitDay } from "./habits";
import type { Habit } from "./types";

/**
 * What today actually asks of you.
 *
 * The dashboard used to open with four percentages, which answer "how am I
 * doing" and not "what do I do now" — you still had to read two lists and do
 * the arithmetic yourself. This turns the plan into the second answer: one list
 * of the things due today, derived rather than stored, so it can never drift
 * out of step with the habits and goals it is made of.
 *
 * Only habits are on it. Each one is answered by `habitDay` in
 * `lib/habits.ts` — the same function the habits screen builds its own day
 * list from. Goals are logged from their own screen and stay off this list.
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
  title: string;
  /** Why it is on the list — the plan behind it, in a few words. */
  detail: string;
  urgency: Urgency;
  habitId: string;
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
  // "Optional" is a quota habit whose spacing says not yet — e.g. the gym the
  // day after a session. It is not today's business, so it is not on the list.
  if (status === "off" || status === "optional") return null;
  return {
    id: `habit:${habit.id}`,
    title: habit.name,
    habitId: habit.id,
    detail: habit.description.trim() || detail,
    urgency: status,
  };
}

/**
 * Today's list, ordered by how much it matters: what is late, then what is
 * due, then what is merely available, then what is already handled.
 */
export function todaysReminders(habits: Habit[], todayKey: string): Reminder[] {
  const items: Reminder[] = [];
  for (const habit of habits) {
    const r = habitReminder(habit, todayKey);
    if (r) items.push(r);
  }

  return items.sort((a, b) => {
    const byUrgency = ORDER[a.urgency] - ORDER[b.urgency];
    if (byUrgency !== 0) return byUrgency;
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
