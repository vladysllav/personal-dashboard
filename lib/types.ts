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
  /**
   * The local date the commitment starts on. Separate from `createdAt`, which
   * is the instant the row was made: you can start a habit on Monday having
   * added it on Saturday, and the plan has to count from Monday.
   */
  startDate: string;
  /**
   * How many weeks the commitment runs for — the "I'll do this for 12 weeks"
   * part. `null` is an open-ended habit: it still has a weekly cadence, but no
   * finish line, so it is measured against what the plan asked for *so far*
   * rather than against a whole-plan total.
   */
  durationWeeks: number | null;
  /**
   * The days of the week this habit is due on, as ISO weekday numbers
   * (1 = Monday … 7 = Sunday). Empty means no fixed days: the commitment is a
   * quota — "4× a week, whenever" — and the reminder paces it out instead.
   *
   * Independent of `weeklyTarget`, which stays the source of truth for how many
   * times a week is expected; picking days simply says *which* ones, and the
   * two are kept in step by the form.
   */
  weekdays: number[];
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
