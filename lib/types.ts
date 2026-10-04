import type { HabitColor } from "./palette";

/** The criterion a goal is measured against. "Step" in the goal model. */
export type StepUnit = "day" | "week" | "month";

/**
 * How progress is recorded.
 * - `accumulate` — each entry adds to a running total (saved, read, run).
 * - `measure`    — each entry replaces the last reading (weight, debt balance).
 * - `milestone`  — progress is the count of completed milestones.
 */
export type GoalKind = "accumulate" | "measure" | "milestone";

export type GoalEntry = {
  id: string;
  /** ISO timestamp of when it was recorded. */
  at: string;
  /** Delta for `accumulate`, absolute reading for `measure`, ignored for `milestone`. */
  value: number;
};

export type Milestone = {
  id: string;
  label: string;
  done: boolean;
};

export type Goal = {
  id: string;
  name: string;
  kind: GoalKind;
  /** Rendered after every figure. Empty string is valid (e.g. counts). */
  unit: string;
  /** Where you started. */
  pointA: number;
  /** Where you're going. May be lower than pointA for descending goals. */
  pointB: number;
  stepUnit: StepUnit;
  /** Total steps between A and B. */
  totalSteps: number;
  /** Local date, YYYY-MM-DD. */
  startDate: string;
  entries: GoalEntry[];
  milestones: Milestone[];
  createdAt: string;
};

/** The interval a habit's count applies to. */
export type FrequencyUnit = "day" | "week" | "month";

/**
 * How often a habit is meant to happen.
 *
 * One shape covers every answer the form can give, from "every day" to "twice
 * a week on Tue and Sat". `count` is how many times, `unit` is what that is
 * per, and `weekdays` optionally says *which* days — the difference between a
 * quota you can spread however you like and a standing appointment.
 *
 * A mark is one boolean per calendar day, so `unit: "day"` only ever carries a
 * count of 1: "twice a day" is not a thing this model can record, and
 * pretending otherwise would put a number on screen that no tick could move.
 */
export type Frequency = {
  /** Times per interval. 1 when `unit` is "day". */
  count: number;
  unit: FrequencyUnit;
  /**
   * ISO weekday numbers (1 = Monday … 7 = Sunday) the habit falls on. Only
   * meaningful for a weekly cadence; empty means "whenever, as long as the
   * count is met", and the reminder paces it out instead.
   */
  weekdays: number[];
};

export type Habit = {
  id: string;
  name: string;
  /** What doing it actually means — "Read 20 pages". Empty string is valid. */
  description: string;
  /** An emoji, chosen from a set. Empty falls back to the default. */
  icon: string;
  /** A label, not a verdict — see `lib/palette.ts`. */
  color: HabitColor;
  frequency: Frequency;
  /** Local dates (YYYY-MM-DD) on which it was marked done. */
  marks: string[];
  /**
   * The local date the commitment starts on. Separate from `createdAt`, which
   * is the instant the row was made: you can start a habit on Monday having
   * added it on Saturday, and the plan has to count from Monday.
   *
   * There is deliberately no end date. A habit is a thing you are trying to
   * become, not a project with a delivery date, and the finish line only ever
   * produced a second percentage saying the same thing as the first.
   */
  startDate: string;
  createdAt: string;
};

/** How the goals list is laid out. "bar" is the pace-bar rows; "ring" is the donut grid. */
export type GoalView = "bar" | "ring";

export type Preferences = {
  goalView: GoalView;
  /**
   * Goals whose rings sit at the top of Today, in order. Capped at two: the
   * point is a glance before anything else loads, and a third ring on a phone
   * pushes the day's actual list below the fold.
   */
  pinnedGoalIds: string[];
};

export type DashboardState = {
  goals: Goal[];
  habits: Habit[];
  prefs: Preferences;
};

export type GoalStatus =
  | "not-started"
  | "ahead"
  | "on-pace"
  | "behind"
  | "complete"
  | "overdue";
