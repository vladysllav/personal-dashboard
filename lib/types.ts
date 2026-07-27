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

export type Habit = {
  id: string;
  name: string;
  /** Local dates (YYYY-MM-DD) on which it was marked done. */
  marks: string[];
  /**
   * How many days a week this habit is meant to happen, 1–7. A daily habit is
   * 7; anything less is cadence-based ("4× a week") and its streak is counted
   * in successful weeks rather than consecutive days. Absent = daily (legacy).
   */
  weeklyTarget?: number;
  createdAt: string;
};

/** How the goals list is laid out. "bar" is the pace-bar rows; "ring" is the donut grid. */
export type GoalView = "bar" | "ring";

export type Preferences = {
  goalView: GoalView;
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
