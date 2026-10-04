import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { goalEntries, goals, habitMarks, habits, milestones } from "@/lib/db/schema";
import type { Goal, Habit } from "@/lib/types";

/** The handle drizzle hands to a `db.transaction` callback. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Writes a goal and its children. Caller supplies the transaction. */
export async function insertGoal(tx: Tx, userId: string, goal: Goal): Promise<void> {
  await tx.insert(goals).values({
    id: goal.id,
    userId,
    name: goal.name,
    kind: goal.kind,
    unit: goal.unit,
    pointA: goal.pointA,
    pointB: goal.pointB,
    stepUnit: goal.stepUnit,
    totalSteps: goal.totalSteps,
    startDate: goal.startDate,
    createdAt: goal.createdAt,
  });

  if (goal.entries.length) {
    await tx.insert(goalEntries).values(
      goal.entries.map((entry) => ({
        id: entry.id,
        goalId: goal.id,
        at: entry.at,
        value: entry.value,
      })),
    );
  }

  await replaceMilestones(tx, goal.id, goal.milestones);
}

/** Writes a habit and its marks. Caller supplies the transaction. */
/**
 * Weekdays to a column. Sorted and deduped on the way in, so the stored string
 * is canonical whatever order the form collected the checkboxes in, and an
 * empty selection is null rather than "" — one way to say "no fixed days".
 */
export function serializeWeekdays(days: number[] | undefined): string | null {
  if (!days || days.length === 0) return null;
  const clean = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort();
  return clean.length ? clean.join(",") : null;
}

export async function insertHabit(tx: Tx, userId: string, habit: Habit): Promise<void> {
  await tx.insert(habits).values({
    id: habit.id,
    userId,
    name: habit.name,
    description: habit.description,
    icon: habit.icon,
    color: habit.color,
    freqCount: habit.frequency.count,
    freqUnit: habit.frequency.unit,
    startDate: habit.startDate,
    weekdays: serializeWeekdays(habit.frequency.weekdays),
    createdAt: habit.createdAt,
  });

  if (habit.marks.length) {
    await tx.insert(habitMarks).values(
      // Dedupe: the composite primary key would reject a repeated date, and a
      // hand-edited or imported payload can carry one.
      [...new Set(habit.marks)].map((dateKey) => ({ habitId: habit.id, dateKey })),
    );
  }
}

/**
 * Milestones have no stable identity across an edit — the form hands back a
 * whole new list — so they are replaced wholesale rather than diffed.
 */
export async function replaceMilestones(
  tx: Tx,
  goalId: string,
  list: Goal["milestones"],
): Promise<void> {
  await tx.delete(milestones).where(eq(milestones.goalId, goalId));
  if (!list.length) return;
  await tx.insert(milestones).values(
    list.map((milestone, position) => ({
      id: milestone.id,
      goalId,
      position,
      label: milestone.label,
      done: milestone.done,
    })),
  );
}
