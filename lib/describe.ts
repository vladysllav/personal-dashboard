import { STEP_NOUN, formatLongDate } from "./dates";
import { formatPace, formatPoints, formatRate, formatValue } from "./format";
import type { GoalDerived } from "./goals";
import type { Goal } from "./types";

export type GoalCopy = {
  /** The pace read: "3 days ahead", "on pace", "Overdue". */
  headline: string;
  /** Percentage points of the whole goal. Null when it would be noise. */
  points: string | null;
  /** The actionable line — usually the recalculated rate. Kept short so the
   *  pace column never wraps to three ragged lines. */
  detail: string;
  /** The original plan, shown under the bar where the comparison belongs. */
  plan: string;
  /** One honest sentence for assistive tech. */
  aria: string;
};

/**
 * All goal-facing copy in one place. Warm and factual: it credits real
 * progress specifically and states a miss plainly, with the number that
 * makes it actionable. No praise, no guilt.
 */
export function describeGoal(goal: Goal, d: GoalDerived): GoalCopy {
  const value = (n: number) => formatValue(n, goal.unit);
  const rate = (n: number) => formatRate(n, goal.unit, goal.stepUnit);
  const [stepSingular] = STEP_NOUN[goal.stepUnit];

  const position = `${value(d.current)} of ${value(goal.pointB)}`;
  const plan = `${rate(d.originalRate)} planned · ${value(d.expectedValue)} by now`;

  if (d.status === "complete") {
    const past = -d.remaining;
    const detail = past > 0.005 ? `${value(past)} past target` : "Landed on target";
    return {
      headline: "Complete",
      points: null,
      detail,
      plan,
      aria: `${goal.name}. Complete. ${position}. ${detail}.`,
    };
  }

  if (d.status === "overdue") {
    const detail = `${value(d.remaining)} short`;
    return {
      headline: "Overdue",
      points: null,
      detail,
      plan,
      aria: `${goal.name}. Overdue. ${position}. ${detail} at the deadline.`,
    };
  }

  if (d.status === "not-started") {
    const detail = `${rate(d.originalRate)} to stay on plan`;
    return {
      headline: "Starts today",
      points: null,
      detail,
      plan,
      aria: `${goal.name}. Starts today. Target ${value(goal.pointB)} by ${formatLongDate(d.deadline)}. ${detail}.`,
    };
  }

  const headline = formatPace(d.stepsDelta, goal.stepUnit);
  const points = d.status === "on-pace" ? null : formatPoints(d.pointsDelta);

  // The recalculated rate is the whole motivational mechanism: it turns a
  // miss into a number you can act on tomorrow.
  const detail =
    d.adaptedRate === null
      ? `Final ${stepSingular}`
      : `${rate(d.adaptedRate)} needed`;

  return {
    headline,
    points,
    detail,
    plan,
    aria: `${goal.name}. ${position}. The plan expects ${value(d.expectedValue)} by now, so you are ${headline}. ${detail}.`,
  };
}
