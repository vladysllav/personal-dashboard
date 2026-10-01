"use client";

import Link from "next/link";
import { useState } from "react";
import { STEP_NOUN, formatLongDate, isoAtDate } from "@/lib/dates";
import { describeGoal } from "@/lib/describe";
import {
  formatPace,
  formatPoints,
  formatRate,
  formatValue,
} from "@/lib/format";
import { deriveGoal } from "@/lib/goals";
import { goalSeries } from "@/lib/series";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { Goal } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { Donut } from "./Donut";
import { EntryLog } from "./EntryLog";
import { GoalChart } from "./GoalChart";
import { GoalForm } from "./GoalForm";
import { Icon } from "./Icon";
import { StatusBadge, statusText } from "./StatusBadge";
import { TickChip } from "./TickChip";
import { Button, Card, CardHead, Field, Input, Note } from "./ui";

export function GoalDetail({ goalId }: { goalId: string }) {
  const { state, ready, dispatch } = useStore();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

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
  const rate = (n: number) => formatRate(n, goal.unit, goal.stepUnit);
  const [stepSingular] = STEP_NOUN[goal.stepUnit];

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

        {/* The one big read: the ring, the two figures it sits between, and
            the state of the plan. */}
        <Card>
          <CardHead
            title="Where you are"
            right={
              <StatusBadge status={derived.status} hint={copy.plan}>
                {copy.headline}
              </StatusBadge>
            }
          />
          {/* The ring sits at the left and the three figures take the rest of
              the width as one strip, divided. Left as a compact cluster they
              left half a wide card empty, which read as a card that had failed
              to load rather than as a deliberate margin. */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-6 p-4 sm:p-6">
            <Donut
              progress={derived.progress}
              plannedProgress={derived.plannedProgress}
              status={derived.status}
              size={168}
            />
            <div className="grid min-w-0 flex-1 basis-[280px] grid-cols-2 gap-y-6 sm:grid-cols-3">
              <Figure
                value={formatValue(derived.current, goal.unit)}
                label="now"
              />
              <Figure
                value={formatValue(goal.pointB, goal.unit)}
                label="target"
                divided
              />
              <Figure
                value={copy.headline}
                valueClass={statusText(derived.status)}
                label={
                  derived.status === "on-pace" || derived.status === "complete"
                    ? "pace"
                    : `${formatPoints(derived.pointsDelta)} on the goal`
                }
                // Two columns on a phone would leave this one alone on the
                // second row with a rule hanging off its left edge.
                className="col-span-2 sm:col-span-1"
                dividedOnWide
              />
            </div>
          </div>
          <Note>{copy.plan}</Note>
        </Card>

        {/* The pace the goal was set at, against the pace it now needs. */}
        <div className="grid gap-4 lg:grid-cols-3">
          <PaceTile
            label="Reference pace"
            hint="Fixed when the goal was created"
            big={rate(derived.originalRate)}
            foot={`Should be at ${formatValue(derived.expectedValue, goal.unit)} by now`}
          />
          <PaceTile
            label="Needed from here"
            hint="Recomputed from what you’ve done"
            big={
              derived.adaptedRate === null
                ? `Final ${stepSingular}`
                : rate(derived.adaptedRate)
            }
            foot={
              derived.remaining > 0
                ? `${formatValue(derived.remaining, goal.unit)} left · ${derived.remainingSteps} ${
                    derived.remainingSteps === 1
                      ? stepSingular
                      : STEP_NOUN[goal.stepUnit][1]
                  } to go`
                : "Target reached"
            }
            emphasise={derived.status === "behind" || derived.status === "overdue"}
          />
          <PaceTile
            label="Against the plan"
            hint={`Measured in ${STEP_NOUN[goal.stepUnit][1]}`}
            big={formatPace(derived.stepsDelta, goal.stepUnit)}
            foot={`Plan expects ${formatValue(derived.expectedValue, goal.unit)} · you have ${formatValue(derived.current, goal.unit)}`}
          />
        </div>

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

/**
 * One fact in the hero strip. The rule between columns is a border on the cell
 * rather than a `<span>` between them, so it stays put when the grid rewraps
 * to two columns on a phone.
 */
function Figure({
  value,
  label,
  valueClass = "text-ink",
  className = "",
  divided = false,
  dividedOnWide = false,
}: {
  value: string;
  label: string;
  valueClass?: string;
  className?: string;
  divided?: boolean;
  dividedOnWide?: boolean;
}) {
  const rule = divided
    ? "border-l border-line pl-5 sm:pl-6"
    : dividedOnWide
      ? "sm:border-l sm:border-line sm:pl-6"
      : "";
  return (
    <div className={`min-w-0 ${rule} ${className}`}>
      <span
        className={`block text-[28px] font-semibold leading-none tracking-[-0.02em] tnum ${valueClass}`}
      >
        {value}
      </span>
      <span className="mt-1.5 block text-[11.5px] text-ink-3">{label}</span>
    </div>
  );
}

function PaceTile({
  label,
  hint,
  big,
  foot,
  emphasise = false,
}: {
  label: string;
  hint: string;
  big: string;
  foot: string;
  emphasise?: boolean;
}) {
  return (
    <Card className={emphasise ? "border-warn-500" : ""}>
      <CardHead title={label} hint={hint} />
      <div className="p-4 sm:p-5">
        <span className="block text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink tnum">
          {big}
        </span>
        <span className="mt-2 block max-w-[68ch] text-[12.5px] leading-relaxed text-ink-3 tnum">
          {foot}
        </span>
      </div>
    </Card>
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
      <form className="flex flex-wrap items-end gap-3 p-4 sm:p-5" onSubmit={submit}>
        <Field
          label={isMeasure ? "New reading" : "Add progress"}
          htmlFor="log-value"
          className="flex-1 basis-[200px]"
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
        <Field label="Date" htmlFor="log-date" className="basis-[164px]">
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
          className="py-2.5"
          disabled={value.trim() === ""}
          icon={<Icon name="plus" size={15} />}
        >
          Log
        </Button>
        {hasEntries && (
          <Button
            className="py-2.5"
            icon={<Icon name="undo" size={15} />}
            onClick={() => dispatch({ type: "undoLastEntry", goalId: goal.id })}
          >
            Undo last
          </Button>
        )}
      </form>
    </Card>
  );
}
