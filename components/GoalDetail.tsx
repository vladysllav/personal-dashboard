"use client";

import Link from "next/link";
import { useState } from "react";
import { STEP_NOUN, formatLongDate, formatShortDate, isoAtDate } from "@/lib/dates";
import { describeGoal } from "@/lib/describe";
import { formatNumber, formatValue } from "@/lib/format";
import { deriveGoal } from "@/lib/goals";
import { goalSeries } from "@/lib/series";
import { daysLeft, goalWeeks, neededPerWeek, plannedPerWeek } from "@/lib/weekly";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { Goal } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { Donut } from "./Donut";
import { EntryLog } from "./EntryLog";
import { GoalChart } from "./GoalChart";
import { GoalForm } from "./GoalForm";
import { GoalProgressBar } from "./GoalProgressBar";
import { GoalWeekChart } from "./GoalWeekChart";
import { Icon } from "./Icon";
import { StatusBadge } from "./StatusBadge";
import { TickChip } from "./TickChip";
import { Button, Card, CardHead, Field, Input } from "./ui";

export function GoalDetail({ goalId }: { goalId: string }) {
  const { state, ready, dispatch } = useStore();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(false);

  if (!ready || !today) return null;

  const goal = state.goals.find((g) => g.id === goalId);

  if (!goal) {
    return (
      <>
        <PageHeader
          title="This goal doesn’t exist."
          back={{ href: "/goals", label: "Goals" }}
        />
        <Card className="p-5">
          <p className="max-w-[68ch] text-[13px] leading-relaxed text-ink-2">
            It may have been deleted. Head back to the list to pick another.
          </p>
          <Link
            href="/goals"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-700 hover:text-accent-600"
          >
            <Icon name="arrowLeft" size={15} />
            All goals
          </Link>
        </Card>
      </>
    );
  }

  const derived = deriveGoal(goal, today);
  const copy = describeGoal(goal, derived);
  const weekly = neededPerWeek(goal, derived, today);
  const left = daysLeft(derived, today);
  const remaining = Math.max(0, derived.remaining * (Math.sign(derived.span) || 1));
  const finished = Boolean(goal.finishedAt);

  function finish() {
    dispatch({ type: "finishGoal", goalId: goal!.id, finished: true });
    // A finished goal leaves Today too, so it gives up its pinned slot.
    const pinned = state.prefs.pinnedGoalIds;
    if (pinned.includes(goal!.id)) {
      dispatch({
        type: "setPinnedGoals",
        goalIds: pinned.filter((id) => id !== goal!.id),
      });
    }
    setPendingFinish(false);
  }

  return (
    <>
      <PageHeader
        back={{ href: "/goals", label: "Goals" }}
        title={goal.name}
        subtitle={`${formatValue(goal.pointA, goal.unit)} → ${formatValue(
          goal.pointB,
          goal.unit,
        )} · ${goal.totalSteps} ${STEP_NOUN[goal.stepUnit][1]} · ends ${formatLongDate(
          derived.deadline,
        )}`}
        actions={
          !editing ? (
            <>
              {finished ? (
                <Button
                  icon={<Icon name="undo" size={15} />}
                  onClick={() =>
                    dispatch({ type: "finishGoal", goalId: goal.id, finished: false })
                  }
                >
                  Reopen
                </Button>
              ) : (
                <Button
                  icon={<Icon name="trophy" size={15} />}
                  onClick={() => setPendingFinish(true)}
                >
                  Finish
                </Button>
              )}
              <Button
                icon={<Icon name="edit" size={15} />}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                icon={<Icon name="close" size={15} />}
                onClick={() => setPendingDelete(true)}
              >
                Delete
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        {editing && (
          <Card className="overflow-hidden">
            <CardHead title="Edit goal" />
            <GoalForm
              mode="edit"
              initial={goal}
              className="bg-surface-2 p-4 sm:p-5"
              onCancel={() => setEditing(false)}
              onEdit={(patch) => {
                dispatch({ type: "editGoal", goalId: goal.id, patch });
                setEditing(false);
              }}
            />
          </Card>
        )}

        {/* The whole goal on one bar, with the plan's line across it. */}
        <Card>
          <CardHead
            title="Progress"
            right={
              finished ? (
                <span className="rounded-[var(--radius-badge)] bg-accent-50 px-1.5 py-0.5 text-[11px] font-medium text-accent-700">
                  Finished {formatShortDate(goal.finishedAt!.slice(0, 10))}
                </span>
              ) : (
                <StatusBadge status={derived.status} hint={copy.plan}>
                  {copy.headline}
                </StatusBadge>
              )
            }
          />
          <GoalProgressBar goal={goal} derived={derived} label={copy.aria} />
        </Card>

        {/* What each week has to carry, how far along the goal is, and where
            it ends. */}
        <Card>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 sm:gap-6 sm:p-6">
            <Figure
              label="Weekly goal"
              value={formatNumber(weekly)}
              caption={
                left === 0
                  ? "deadline passed"
                  : `${left} ${left === 1 ? "day" : "days"} left`
              }
            />
            <Donut
              progress={derived.progress}
              plannedProgress={derived.plannedProgress}
              status={derived.status}
              size={136}
              caption={
                remaining > 0
                  ? `${formatNumber(remaining)} to go`
                  : "target reached"
              }
            />
            <Figure
              label="Target"
              value={formatNumber(goal.pointB)}
              caption={`by ${formatShortDate(derived.deadline)}`}
            />
          </div>
        </Card>

        {goal.kind !== "milestone" && (
          <GoalWeekChart
            weeks={goalWeeks(goal, today)}
            target={plannedPerWeek(goal, derived)}
          />
        )}

        <LogControl goal={goal} today={today} />

        {goal.kind === "milestone" ? (
          <Card aria-labelledby="milestones-heading">
            <CardHead id="milestones-heading" title="Milestones" />
            <ul className="flex flex-wrap gap-2 p-4 sm:p-5">
              {goal.milestones.map((m) => (
                <li key={m.id}>
                  <TickChip
                    done={m.done}
                    srSuffix={`Milestone of ${goal.name}`}
                    onClick={() =>
                      dispatch({
                        type: "toggleMilestone",
                        goalId: goal.id,
                        milestoneId: m.id,
                      })
                    }
                  >
                    {m.label}
                  </TickChip>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <GoalChart
            series={goalSeries(goal, today)}
            unit={goal.unit}
            kind={goal.kind}
            stepUnit={goal.stepUnit}
          />
        )}

        <EntryLog goal={goal} />
      </div>

      {pendingFinish && (
        <ConfirmDialog
          title={`Finish “${goal.name}”?`}
          body="It leaves your goals and Today. Nothing is deleted."
          confirmLabel="Finish goal"
          destructive={false}
          onCancel={() => setPendingFinish(false)}
          onConfirm={finish}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${goal.name}”?`}
          body="This removes the goal and every entry logged against it. It can’t be undone."
          confirmLabel="Delete goal"
          onCancel={() => setPendingDelete(false)}
          onConfirm={() => dispatch({ type: "removeGoal", goalId: goal.id })}
        />
      )}
    </>
  );
}

/** One side of the ring: a label, the figure, and what it is measured against. */
function Figure({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <span className="block text-[12.5px] text-ink-2 sm:text-[13.5px]">{label}</span>
      <span className="mt-1 block truncate text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink tnum sm:text-[32px]">
        {value}
      </span>
      <span className="mt-0.5 block text-[11.5px] text-ink-3 tnum sm:text-[12.5px]">
        {caption}
      </span>
    </div>
  );
}

function LogControl({ goal, today }: { goal: Goal; today: string }) {
  const { dispatch } = useStore();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);

  if (goal.kind === "milestone") return null;

  const isMeasure = goal.kind === "measure";
  const hasEntries = goal.entries.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isFinite(n) || value.trim() === "") return;
    // isoAtDate stamps the chosen day with the current time-of-day; for "today"
    // that is simply now.
    dispatch({ type: "logGoal", goalId: goal.id, value: n, at: isoAtDate(date) });
    setValue("");
    // The date is left as chosen, so backfilling several past days stays quick.
  }

  return (
    <Card aria-labelledby="log-heading">
      <CardHead id="log-heading" title="Log progress" />
      {/* Value on its own row on a phone, then date and buttons beneath it.
          The date field shrinks and the buttons never do, so the two can't
          end up on top of each other. */}
      <form
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5"
        onSubmit={submit}
      >
        <Field
          label={isMeasure ? "New reading" : "Add progress"}
          htmlFor="log-value"
          className="sm:flex-1"
        >
          <Input
            id="log-value"
            size="lg"
            type="number"
            step="any"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              isMeasure ? "Latest measurement" : `Amount in ${goal.unit || "units"}`
            }
          />
        </Field>
        <div className="flex items-end gap-3">
          <Field label="Date" htmlFor="log-date" className="flex-1 sm:w-[164px] sm:flex-none">
            <Input
              id="log-date"
              size="lg"
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            className="shrink-0 py-2.5"
            disabled={value.trim() === ""}
            icon={<Icon name="plus" size={15} />}
          >
            Log
          </Button>
          {hasEntries && (
            <Button
              className="shrink-0 py-2.5"
              icon={<Icon name="undo" size={15} />}
              aria-label="Undo last entry"
              onClick={() => dispatch({ type: "undoLastEntry", goalId: goal.id })}
            >
              {/* Icon only on a phone, so the date keeps room for itself. */}
              <span className="hidden sm:inline">Undo</span>
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
