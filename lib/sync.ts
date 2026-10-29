import type {
  DashboardState,
  Goal,
  GoalEntry,
  GoalView,
  Habit,
  Challenge,
  Macros,
  NutritionDay,
  Relapse,
  WeightEntry,
} from "./types";

/**
 * The commitment behind a habit — everything the form can change. Marks are
 * never patched here: editing the cadence re-scores the history it already has
 * rather than rewriting it.
 */
export type HabitPatch = Pick<
  Habit,
  "name" | "description" | "icon" | "color" | "frequency" | "startDate"
>;

/** Fields a user may change after creation. Identity, entries and marks are never patched here. */
export type GoalPatch = Partial<
  Pick<
    Goal,
    | "name"
    | "kind"
    | "unit"
    | "pointA"
    | "pointB"
    | "stepUnit"
    | "totalSteps"
    | "startDate"
    | "milestones"
  >
>;

/** Everything about a challenge a form can change. Relapses are never patched here. */
export type ChallengePatch = Pick<Challenge, "name" | "icon" | "startDate" | "endDate" | "benefit">;

/**
 * What a component asks for. Deliberately loose: `logGoal` may omit the
 * timestamp, `toggleHabit` says "flip it" without knowing which way.
 */
export type Intent =
  | { type: "addGoal"; goal: Goal }
  | { type: "editGoal"; goalId: string; patch: GoalPatch }
  | { type: "logGoal"; goalId: string; value: number; at?: string }
  | {
      type: "editEntry";
      goalId: string;
      entryId: string;
      value: number;
      at: string;
    }
  | { type: "removeEntry"; goalId: string; entryId: string }
  | { type: "undoLastEntry"; goalId: string }
  | { type: "toggleMilestone"; goalId: string; milestoneId: string }
  | { type: "removeGoal"; goalId: string }
  | { type: "finishGoal"; goalId: string; finished: boolean }
  | { type: "addHabit"; habit: Habit }
  | { type: "seedSampleHabits" }
  | { type: "editHabit"; habitId: string; patch: HabitPatch }
  | { type: "toggleHabit"; habitId: string; dateKey: string }
  | { type: "removeHabit"; habitId: string }
  | { type: "setGoalView"; view: GoalView }
  | { type: "setPinnedGoals"; goalIds: string[] }
  | { type: "setNutritionPlan"; plan: Macros }
  /** Adds to the day's totals, or with `replace` overwrites them. */
  | { type: "logNutrition"; date: string; macros: Macros; replace?: boolean }
  | { type: "logWeight"; date: string; value: number }
  | { type: "addChallenge"; challenge: Challenge }
  | { type: "editChallenge"; challengeId: string; patch: ChallengePatch }
  | { type: "removeChallenge"; challengeId: string }
  | { type: "finishChallenge"; challengeId: string; finished: boolean }
  | { type: "logRelapse"; challengeId: string; date: string; count: number }
  | { type: "removeRelapse"; challengeId: string; relapseId: string }
  | { type: "replace"; state: DashboardState };

/**
 * What actually travels to the server, and what the reducer applies.
 *
 * Every variant is *sealed* and *idempotent*: ids and timestamps are decided on
 * the client so both sides agree on them, and every toggle has been resolved to
 * an absolute `done` value. That matters because these are fired over the
 * network — a retry, a double-tap, or two devices replaying the same action
 * must land on the same result rather than flipping a bit back and forth.
 */
export type SyncAction =
  | { type: "addGoal"; goal: Goal }
  | { type: "editGoal"; goalId: string; patch: GoalPatch }
  | { type: "addEntry"; goalId: string; entry: GoalEntry }
  | {
      type: "editEntry";
      goalId: string;
      entryId: string;
      value: number;
      at: string;
    }
  | { type: "removeEntry"; goalId: string; entryId: string }
  | { type: "setMilestone"; goalId: string; milestoneId: string; done: boolean }
  | { type: "removeGoal"; goalId: string }
  | { type: "setGoalFinished"; goalId: string; finishedAt: string | null }
  | { type: "addHabits"; habits: Habit[] }
  | { type: "editHabit"; habitId: string; patch: HabitPatch }
  | { type: "setHabitMark"; habitId: string; dateKey: string; done: boolean }
  | { type: "removeHabit"; habitId: string }
  | { type: "setGoalView"; view: GoalView }
  | { type: "setPinnedGoals"; goalIds: string[] }
  | { type: "setNutritionPlan"; plan: Macros }
  /** The day's totals as they should now stand — absolute, so a retry is harmless. */
  | { type: "setNutritionDay"; day: NutritionDay }
  | { type: "addWeight"; entry: WeightEntry }
  | { type: "addChallenge"; challenge: Challenge }
  | { type: "editChallenge"; challengeId: string; patch: ChallengePatch }
  | { type: "removeChallenge"; challengeId: string }
  | { type: "setChallengeFinished"; challengeId: string; finishedAt: string | null }
  | { type: "addRelapse"; challengeId: string; relapse: Relapse }
  | { type: "removeRelapse"; challengeId: string; relapseId: string }
  | { type: "replace"; state: DashboardState };
