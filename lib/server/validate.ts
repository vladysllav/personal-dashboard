import { z } from "zod";

/*
 * Server actions are a public HTTP surface: anything the browser can call, an
 * attacker with your session can call with arbitrary arguments. Every field is
 * bounded so a hostile payload cannot become an unbounded write.
 */

const id = z.string().min(1).max(128);
const label = z.string().min(1).max(200);
const timestamp = z.string().min(1).max(64);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const finite = z.number().finite();

const stepUnit = z.enum(["day", "week", "month"]);
const goalKind = z.enum(["accumulate", "measure", "milestone"]);
const goalView = z.enum(["bar", "ring"]);
/** ISO weekday numbers, deduped and ordered by the writer, not by the sender. */
const weekdays = z.array(z.number().int().min(1).max(7)).max(7);

const entrySchema = z.object({ id, at: timestamp, value: finite });

const milestoneSchema = z.object({ id, label, done: z.boolean() });

export const goalSchema = z.object({
  id,
  name: label,
  kind: goalKind,
  unit: z.string().max(24),
  pointA: finite,
  pointB: finite,
  stepUnit,
  totalSteps: z.number().int().min(1).max(100_000),
  startDate: dateKey,
  createdAt: timestamp,
  entries: z.array(entrySchema).max(10_000),
  milestones: z.array(milestoneSchema).max(500),
});

/** Ten years of weeks. Far past any real commitment, short of an unbounded write. */
const durationWeeks = z.number().int().min(1).max(520).nullable();

export const habitSchema = z.object({
  id,
  name: label,
  marks: z.array(dateKey).max(10_000),
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  startDate: dateKey,
  durationWeeks,
  weekdays,
  createdAt: timestamp,
});

const habitPatchSchema = z.object({
  name: label,
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  startDate: dateKey,
  durationWeeks,
  weekdays,
});

const goalPatchSchema = z
  .object({
    name: label,
    kind: goalKind,
    unit: z.string().max(24),
    pointA: finite,
    pointB: finite,
    stepUnit,
    totalSteps: z.number().int().min(1).max(100_000),
    startDate: dateKey,
    milestones: z.array(milestoneSchema).max(500),
  })
  .partial();

const stateSchema = z.object({
  goals: z.array(goalSchema).max(500),
  habits: z.array(habitSchema).max(500),
  prefs: z.object({ goalView, pinnedGoalIds: z.array(id).max(2) }),
});

export const syncActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("addGoal"), goal: goalSchema }),
  z.object({ type: z.literal("editGoal"), goalId: id, patch: goalPatchSchema }),
  z.object({ type: z.literal("addEntry"), goalId: id, entry: entrySchema }),
  z.object({
    type: z.literal("editEntry"),
    goalId: id,
    entryId: id,
    value: finite,
    at: timestamp,
  }),
  z.object({ type: z.literal("removeEntry"), goalId: id, entryId: id }),
  z.object({
    type: z.literal("setMilestone"),
    goalId: id,
    milestoneId: id,
    done: z.boolean(),
  }),
  z.object({ type: z.literal("removeGoal"), goalId: id }),
  z.object({ type: z.literal("addHabits"), habits: z.array(habitSchema).max(50) }),
  z.object({
    type: z.literal("editHabit"),
    habitId: id,
    patch: habitPatchSchema,
  }),
  z.object({
    type: z.literal("setHabitMark"),
    habitId: id,
    dateKey,
    done: z.boolean(),
  }),
  z.object({ type: z.literal("removeHabit"), habitId: id }),
  z.object({ type: z.literal("setGoalView"), view: goalView }),
  z.object({ type: z.literal("setPinnedGoals"), goalIds: z.array(id).max(2) }),
  z.object({ type: z.literal("replace"), state: stateSchema }),
]);
