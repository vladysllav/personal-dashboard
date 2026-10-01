import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  goalEntries,
  goals,
  habitMarks,
  habits,
  milestones,
  preferences,
} from "@/lib/db/schema";
import type { DashboardState, Goal, Habit } from "@/lib/types";

export const DEFAULT_PREFS = { goalView: "bar" } as const;

export const EMPTY_STATE: DashboardState = {
  goals: [],
  habits: [],
  prefs: { ...DEFAULT_PREFS },
};

/**
 * Reads one user's entire dashboard back into the shape the client reducer
 * expects. Six flat queries stitched in memory rather than nested joins: the
 * row counts here are personal-scale, and this keeps ordering explicit.
 */
export async function loadState(userId: string): Promise<DashboardState> {
  const [goalRows, habitRows, prefRow] = await Promise.all([
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.seq)),
    db.select().from(habits).where(eq(habits.userId, userId)).orderBy(asc(habits.seq)),
    db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1),
  ]);

  const goalIds = goalRows.map((g) => g.id);
  const habitIds = habitRows.map((h) => h.id);

  const [entryRows, milestoneRows, markRows] = await Promise.all([
    goalIds.length
      ? db
          .select()
          .from(goalEntries)
          .where(inArray(goalEntries.goalId, goalIds))
          .orderBy(asc(goalEntries.seq))
      : Promise.resolve([]),
    goalIds.length
      ? db
          .select()
          .from(milestones)
          .where(inArray(milestones.goalId, goalIds))
          .orderBy(asc(milestones.position))
      : Promise.resolve([]),
    habitIds.length
      ? db
          .select()
          .from(habitMarks)
          .where(inArray(habitMarks.habitId, habitIds))
          .orderBy(asc(habitMarks.dateKey))
      : Promise.resolve([]),
  ]);

  const entriesByGoal = groupBy(entryRows, (row) => row.goalId);
  const milestonesByGoal = groupBy(milestoneRows, (row) => row.goalId);
  const marksByHabit = groupBy(markRows, (row) => row.habitId);

  const builtGoals: Goal[] = goalRows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    unit: row.unit,
    pointA: row.pointA,
    pointB: row.pointB,
    stepUnit: row.stepUnit,
    totalSteps: row.totalSteps,
    startDate: row.startDate,
    createdAt: row.createdAt,
    entries: (entriesByGoal.get(row.id) ?? []).map((entry) => ({
      id: entry.id,
      at: entry.at,
      value: entry.value,
    })),
    milestones: (milestonesByGoal.get(row.id) ?? []).map((milestone) => ({
      id: milestone.id,
      label: milestone.label,
      done: milestone.done,
    })),
  }));

  const builtHabits: Habit[] = habitRows.map((row) => {
    const marks = (marksByHabit.get(row.id) ?? []).map((mark) => mark.dateKey);
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      // The client model omits the field for daily habits rather than storing 7.
      ...(row.weeklyTarget === null ? {} : { weeklyTarget: row.weeklyTarget }),
      startDate: row.startDate ?? fallbackStart(row.createdAt, marks),
      durationWeeks: row.durationWeeks,
      marks,
    };
  });

  return {
    goals: builtGoals,
    habits: builtHabits,
    prefs: { goalView: prefRow[0]?.goalView ?? DEFAULT_PREFS.goalView },
  };
}

/**
 * Where a habit written before the plan fields existed is taken to begin.
 *
 * The creation day is the obvious answer, but it is not always the earliest
 * one: a mark can be backdated, and a start date later than its own history
 * would push those marks outside the commitment window, where they stop being
 * counted. So the earliest of the two wins — a start that is a day early costs
 * one day of expectation and can be edited; a start that is late silently
 * discards days you actually did.
 *
 * `createdAt` is a UTC instant, so slicing its date can land a day before the
 * local one near midnight. That error runs in the safe direction, and the
 * server has no way to know the viewer's timezone anyway.
 */
function fallbackStart(createdAt: string, marks: string[]): string {
  const created = createdAt.slice(0, 10);
  const earliestMark = marks.length ? marks.reduce((a, b) => (a < b ? a : b)) : null;
  return earliestMark !== null && earliestMark < created ? earliestMark : created;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}
