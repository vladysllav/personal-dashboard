import { ON_PACE_TOLERANCE } from "./constants";
import { deadlineKey, stepsElapsed } from "./dates";
import type { Goal, GoalStatus } from "./types";

export type GoalDerived = {
  /** Value recorded so far, in the goal's own unit. */
  current: number;
  /** pointB - pointA. Negative for descending goals (weight loss, debt paydown). */
  span: number;
  /** 0..1+, normalised so descending goals progress upward like any other. */
  progress: number;
  /** 0..1. Where the original plan says you should be by now. */
  plannedProgress: number;
  /** The value the plan expects right now. */
  expectedValue: number;
  elapsedSteps: number;
  remainingSteps: number;
  /** Steps ahead (+) or behind (-). The headline number. */
  stepsDelta: number;
  /** Percentage points of the whole goal, ahead (+) or behind (-). */
  pointsDelta: number;
  /** The pace set when the goal was created. */
  originalRate: number;
  /** The pace required from here to still land on target. Null once no steps remain. */
  adaptedRate: number | null;
  /** How much is left to cover. Negative once the target is passed. */
  remaining: number;
  status: GoalStatus;
  deadline: string;
};

/**
 * Everything the UI needs to render a goal honestly.
 *
 * Worked example (the confirmed brief's reference case):
 *   A=0, B=12, N=12 days, 3 steps elapsed, 6 recorded
 *   → originalRate 1/day, expectedValue 3, stepsDelta +3, pointsDelta +25,
 *     adaptedRate (12-6)/(12-3) = 0.67/day
 */
export function deriveGoal(goal: Goal, todayKey: string): GoalDerived {
  const span = goal.pointB - goal.pointA;
  const N = Math.max(0, goal.totalSteps);

  const current = currentValue(goal);

  const elapsedSteps = Math.min(
    stepsElapsed(goal.startDate, todayKey, goal.stepUnit),
    N,
  );
  const remainingSteps = N - elapsedSteps;

  // Guard the degenerate goal (A === B) rather than dividing by zero.
  const progress = span === 0 ? 1 : (current - goal.pointA) / span;
  const plannedProgress = N === 0 ? 1 : elapsedSteps / N;
  const expectedValue = goal.pointA + span * plannedProgress;

  const stepsDelta = (progress - plannedProgress) * N;
  const pointsDelta = (progress - plannedProgress) * 100;

  const originalRate = N === 0 ? 0 : span / N;
  const remaining = goal.pointB - current;
  // Once the deadline is reached there are no steps left to spread the
  // remainder over. Report null rather than dividing by zero.
  const adaptedRate = remainingSteps > 0 ? remaining / remainingSteps : null;

  return {
    current,
    span,
    progress,
    plannedProgress,
    expectedValue,
    elapsedSteps,
    remainingSteps,
    stepsDelta,
    pointsDelta,
    originalRate,
    adaptedRate,
    remaining,
    status: deriveStatus({
      progress,
      elapsedSteps,
      remainingSteps,
      stepsDelta,
      entries: goal.entries.length,
    }),
    deadline: deadlineKey(goal.startDate, N, goal.stepUnit),
  };
}

function deriveStatus(input: {
  progress: number;
  elapsedSteps: number;
  remainingSteps: number;
  stepsDelta: number;
  entries: number;
}): GoalStatus {
  if (input.progress >= 1) return "complete";
  if (input.remainingSteps <= 0) return "overdue";
  // Before the first step closes, the plan expects nothing — so nothing can be
  // "behind". Without this, every new goal opens on a -0% / divide-by-zero read.
  if (input.elapsedSteps === 0) return "not-started";
  if (input.stepsDelta > ON_PACE_TOLERANCE) return "ahead";
  if (input.stepsDelta < -ON_PACE_TOLERANCE) return "behind";
  return "on-pace";
}

export function currentValue(goal: Goal): number {
  switch (goal.kind) {
    case "accumulate":
      return goal.entries.reduce((sum, e) => sum + e.value, goal.pointA);
    case "measure": {
      if (goal.entries.length === 0) return goal.pointA;
      // The latest reading is the one with the most recent date, not the one
      // added last — entries can be backdated or edited out of order. ISO
      // strings in one format compare chronologically.
      const latest = goal.entries.reduce((a, b) => (a.at >= b.at ? a : b));
      return latest.value;
    }
    case "milestone":
      return goal.milestones.filter((m) => m.done).length;
  }
}

/** Sorted most-behind-first: the screen answers "what needs me" by position. */
export function sortByUrgency(
  goals: Goal[],
  todayKey: string,
): Array<{ goal: Goal; derived: GoalDerived }> {
  const RANK: Record<GoalStatus, number> = {
    overdue: 0,
    behind: 1,
    "on-pace": 2,
    ahead: 3,
    "not-started": 4,
    complete: 5,
  };
  return goals
    .map((goal) => ({ goal, derived: deriveGoal(goal, todayKey) }))
    .sort((a, b) => {
      const byRank = RANK[a.derived.status] - RANK[b.derived.status];
      if (byRank !== 0) return byRank;
      return a.derived.stepsDelta - b.derived.stepsDelta;
    });
}

/** Clamped to 0..1 for rendering. The text always reports the unclamped truth. */
export function barFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
