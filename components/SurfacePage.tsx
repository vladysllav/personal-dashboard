"use client";

import { useMemo } from "react";
import { ON_PACE_TOLERANCE } from "@/lib/constants";
import { pluralSteps } from "@/lib/format";
import { deriveGoal } from "@/lib/goals";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { Goal } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { GoalSection } from "./GoalSection";
import { HabitsBoard } from "./HabitsBoard";
import { DeltaPill, StatTile } from "./ui";

/**
 * The Goals tab renders the goals section at full page scope, under a row of
 * the four figures that describe the whole set. The Habits tab is its own
 * dashboard — the plan ring, daily and weekly completion, and a month calendar
 * per habit. Each goal links through to its own detail surface at /goals/[id].
 */
export function SurfacePage({ surface }: { surface: "goals" | "habits" }) {
  const { state, ready } = useStore();
  const today = useToday();

  if (!ready || !today) return null;

  if (surface === "habits") return <HabitsBoard today={today} />;

  return (
    <>
      <PageHeader title="Goals" />
      <div className="flex flex-col gap-4">
        {state.goals.length > 0 && (
          <GoalMetrics goals={state.goals} today={today} />
        )}
        <GoalSection today={today} title="All goals" />
      </div>
    </>
  );
}

/**
 * The set as a whole. "Net pace" is the sum of every goal's drift in steps —
 * the one figure that says whether the whole plan is gaining or slipping, and
 * the one a per-goal list cannot show you.
 */
function GoalMetrics({ goals, today }: { goals: Goal[]; today: string }) {
  const rows = useMemo(
    () => goals.map((goal) => ({ goal, derived: deriveGoal(goal, today) })),
    [goals, today],
  );

  const behind = rows.filter(
    ({ derived }) => derived.status === "behind" || derived.status === "overdue",
  ).length;
  const done = rows.filter(({ derived }) => derived.status === "complete").length;
  const ahead = rows.filter(({ derived }) => derived.status === "ahead").length;

  // Steps are only comparable within one step unit, so the net figure is taken
  // over the largest group rather than adding days to months.
  const byUnit = new Map<string, number>();
  for (const { goal, derived } of rows) {
    byUnit.set(goal.stepUnit, (byUnit.get(goal.stepUnit) ?? 0) + derived.stepsDelta);
  }
  const counts = new Map<string, number>();
  for (const { goal } of rows) {
    counts.set(goal.stepUnit, (counts.get(goal.stepUnit) ?? 0) + 1);
  }
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const netSteps = dominant ? byUnit.get(dominant[0]) ?? 0 : 0;
  // The same tolerance the badges use, so "level" here and "on pace" there
  // can never disagree about the same set of goals.
  const level = Math.abs(netSteps) <= ON_PACE_TOLERANCE;

  const soonest = [...rows]
    .filter(({ derived }) => derived.status !== "complete")
    .sort((a, b) => a.derived.remainingSteps - b.derived.remainingSteps)[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Tracking"
        value={String(goals.length)}
        caption={goals.length === 1 ? "goal" : "goals"}
      />
      <StatTile
        label="On pace or ahead"
        value={`${goals.length - behind}/${goals.length}`}
        caption={ahead > 0 ? `${ahead} running ahead` : "level with plan"}
        delta={
          <DeltaPill tone={behind === 0 ? "good" : "bad"}>
            {behind === 0 ? "clear" : `${behind} behind`}
          </DeltaPill>
        }
      />
      <StatTile
        label="Net pace"
        // The figure and its direction are split: "3 days ahead" set at 28px
        // wraps to two lines and stops being a number you can glance at.
        value={
          !dominant
            ? "—"
            : level
              ? "Level"
              : pluralSteps(Math.abs(netSteps), dominant[0] as Goal["stepUnit"])
        }
        caption={
          dominant
            ? `across ${dominant[1]} ${dominant[1] === 1 ? "goal" : "goals"} measured in ${dominant[0]}s`
            : "nothing to compare"
        }
        delta={
          dominant && !level ? (
            <DeltaPill tone={netSteps > 0 ? "good" : "bad"}>
              {netSteps > 0 ? "ahead" : "behind"}
            </DeltaPill>
          ) : undefined
        }
      />
      <StatTile
        label="Finished"
        value={`${done}/${goals.length}`}
        caption={
          soonest ? `next: ${soonest.goal.name}` : "every goal complete"
        }
      />
    </div>
  );
}
