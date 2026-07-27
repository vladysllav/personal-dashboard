import { stepsElapsed, toDateKey } from "./dates";
import type { Goal } from "./types";

/**
 * One point per step boundary (0..N) for the goal detail chart.
 *
 * Two readings live on every point so the same series drives both chart modes:
 *   - `stepValue`  — what was logged *during* that step (the per-log view).
 *   - `cumulative` — the running progress value at the end of that step.
 *
 * `planned` is the reference ("эталон") line: where the original plan, fixed at
 * creation, expects you to be at that step. It is a pure function of A, B and N,
 * so it never moves once the goal exists.
 */
export type SeriesPoint = {
  step: number;
  /** Value attributed to this step. Null when nothing was logged in it. */
  stepValue: number | null;
  cumulative: number;
  planned: number;
  /** True once this step is in the past (a real log could exist for it). */
  elapsed: boolean;
};

export type GoalSeries = {
  points: SeriesPoint[];
  pointA: number;
  pointB: number;
  totalSteps: number;
  elapsedSteps: number;
  /** The reference amount to move each step: |B − A| / N. */
  referencePerStep: number;
  /** Weight loss, debt paydown — target below start. Same maths, mirrored read. */
  descending: boolean;
};

/**
 * Sort each entry into the step it was recorded in. An entry made before the
 * first step closes belongs to step 1 (the work of the first step), so the
 * bucket index is `stepsElapsed + 1`, clamped into 1..N.
 */
function bucketEntries(goal: Goal, totalSteps: number): number[][] {
  const buckets: number[][] = Array.from({ length: totalSteps + 1 }, () => []);
  for (const entry of goal.entries) {
    const key = toDateKey(new Date(entry.at));
    const raw = stepsElapsed(goal.startDate, key, goal.stepUnit) + 1;
    const index = Math.min(totalSteps, Math.max(1, raw));
    buckets[index]?.push(entry.value);
  }
  return buckets;
}

/**
 * Build the full step series. Only meaningful for `accumulate` and `measure` —
 * milestones have no per-step timing, so the detail screen charts those two and
 * renders the milestone list instead.
 */
export function goalSeries(goal: Goal, todayKey: string): GoalSeries {
  const N = Math.max(1, goal.totalSteps);
  const span = goal.pointB - goal.pointA;
  const elapsed = Math.min(stepsElapsed(goal.startDate, todayKey, goal.stepUnit), N);
  const buckets = bucketEntries(goal, N);

  const points: SeriesPoint[] = [];
  let running = goal.pointA; // accumulate: running total
  let lastReading = goal.pointA; // measure: carried forward until the next reading

  for (let s = 0; s <= N; s += 1) {
    const vals = buckets[s] ?? [];
    let stepValue: number | null = null;

    if (s > 0 && vals.length > 0) {
      if (goal.kind === "accumulate") {
        const sum = vals.reduce((a, b) => a + b, 0);
        running += sum;
        stepValue = sum;
      } else if (goal.kind === "measure") {
        lastReading = vals[vals.length - 1] as number;
        stepValue = lastReading;
      }
    }

    const cumulative = goal.kind === "measure" ? lastReading : running;
    const planned = goal.pointA + span * (s / N);
    points.push({ step: s, stepValue, cumulative, planned, elapsed: s <= elapsed });
  }

  return {
    points,
    pointA: goal.pointA,
    pointB: goal.pointB,
    totalSteps: N,
    elapsedSteps: elapsed,
    referencePerStep: Math.abs(span) / N,
    descending: span < 0,
  };
}
