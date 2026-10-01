"use client";

import { useMemo } from "react";
import { formatLongDate } from "@/lib/dates";
import { deriveGoal } from "@/lib/goals";
import { overallStats, weekOverWeek } from "@/lib/habits";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { DashboardState } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { GoalSection } from "./GoalSection";
import { HabitSection } from "./HabitSection";
import { TodayBand } from "./TodayBand";
import { Button, Card, DeltaPill, StatTile } from "./ui";

export function Dashboard() {
  const { state, ready, loadSample } = useStore();
  const today = useToday();

  if (!ready || !today) return <DashboardSkeleton />;

  const isFirstRun = state.goals.length === 0 && state.habits.length === 0;

  return (
    <>
      <PageHeader title={formatLongDate(today)} />

      {isFirstRun ? (
        <Card className="animate-rise p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
            Nothing recorded yet.
          </h2>
          <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-ink-2">
            A goal here is a start value, a target, and the number of steps you
            have to get there. That&rsquo;s what lets the dashboard show whether
            you&rsquo;re ahead or behind the pace you set — not just a percentage
            that always looks fine. Habits are simpler: how often, for how long,
            and a month you tick off.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={loadSample}>
              Load sample data
            </Button>
            <span className="max-w-[52ch] text-[11.5px] leading-relaxed text-ink-3">
              Five goals and four habits you can edit or delete. Or add your own
              below.
            </span>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <MetricRow state={state} today={today} />
          <TodayBand today={today} />
          <GoalSection today={today} title="Goals" />
          <HabitSection today={today} />
        </div>
      )}
    </>
  );
}

/**
 * The four figures the whole product exists to produce, above everything else
 * on the screen. Each is a count against its own total rather than a bare
 * number — "4" means nothing, "4 of 5" is a state.
 */
function MetricRow({ state, today }: { state: DashboardState; today: string }) {
  const habits = state.habits;
  const goals = state.goals;

  const overall = useMemo(() => overallStats(habits, today), [habits, today]);
  const wow = useMemo(() => weekOverWeek(habits, today), [habits, today]);

  const paced = useMemo(
    () =>
      goals.map((goal) => ({ goal, derived: deriveGoal(goal, today) })),
    [goals, today],
  );
  const behind = paced.filter(
    ({ derived }) => derived.status === "behind" || derived.status === "overdue",
  );
  const worst = [...behind].sort(
    (a, b) => a.derived.stepsDelta - b.derived.stepsDelta,
  )[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Habits today"
        value={habits.length ? `${overall.markedToday}/${habits.length}` : "—"}
        caption={habits.length ? "marked so far today" : "no habits yet"}
      />
      <StatTile
        label="Plan kept"
        value={habits.length ? `${Math.round(overall.adherence * 100)}%` : "—"}
        caption={habits.length ? "of what your habits asked" : "no habits yet"}
        delta={
          wow ? (
            <DeltaPill
              tone={wow.delta > 0.005 ? "good" : wow.delta < -0.005 ? "bad" : "flat"}
              title="Last full week against the one before it"
            >
              {`${wow.delta >= 0 ? "+" : "−"}${Math.abs(Math.round(wow.delta * 100))}%`}
            </DeltaPill>
          ) : undefined
        }
      />
      <StatTile
        label="Goals on pace"
        value={goals.length ? `${goals.length - behind.length}/${goals.length}` : "—"}
        caption={goals.length ? "ahead of or level with plan" : "no goals yet"}
      />
      <StatTile
        label="Needs attention"
        value={goals.length ? String(behind.length) : "—"}
        caption={
          !goals.length
            ? "no goals yet"
            : worst
              ? worst.goal.name
              : "every goal on pace"
        }
        delta={
          goals.length ? (
            <DeltaPill tone={behind.length === 0 ? "good" : "bad"}>
              {behind.length === 0 ? "clear" : "behind"}
            </DeltaPill>
          ) : undefined
        }
      />
    </div>
  );
}

/**
 * A placeholder of the same shape as the real thing, so the page does not jump
 * when the store hydrates. No spinner: this is a wait of one frame, not a load.
 */
function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="pt-4 lg:pt-5">
      <div className="h-[32px] w-[220px] rounded-[var(--radius-input)] bg-surface-3" />
      <div className="mt-2 h-[16px] w-[280px] rounded-[var(--radius-badge)] bg-surface-3" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[116px] rounded-[var(--radius-card)] border border-line bg-surface"
          />
        ))}
      </div>
      <div className="mt-4 h-[320px] rounded-[var(--radius-card)] border border-line bg-surface" />
    </div>
  );
}
