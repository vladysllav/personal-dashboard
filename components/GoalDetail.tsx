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
import { ConfirmDialog } from "./ConfirmDialog";
import { Donut } from "./Donut";
import { EntryLog } from "./EntryLog";
import { GoalChart } from "./GoalChart";
import { GoalForm } from "./GoalForm";
import { Icon } from "./Icon";
import { TickChip } from "./TickChip";
import styles from "./GoalDetail.module.css";

export function GoalDetail({ goalId }: { goalId: string }) {
  const { state, ready, dispatch } = useStore();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  if (!ready || !today) return null;

  const goal = state.goals.find((g) => g.id === goalId);

  if (!goal) {
    return (
      <div className={styles.missing}>
        <Link href="/goals" className={styles.back}>
          <Icon name="arrowLeft" size={16} />
          Goals
        </Link>
        <h1 className={styles.missingTitle}>This goal doesn&rsquo;t exist.</h1>
        <p className={styles.missingBody}>
          It may have been deleted. Head back to the list to pick another.
        </p>
      </div>
    );
  }

  const derived = deriveGoal(goal, today);
  const copy = describeGoal(goal, derived);
  const rate = (n: number) => formatRate(n, goal.unit, goal.stepUnit);
  const [stepSingular] = STEP_NOUN[goal.stepUnit];

  return (
    <div className={styles.page}>
      <Link href="/goals" className={styles.back}>
        <Icon name="arrowLeft" size={16} />
        Goals
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.name}>{goal.name}</h1>
          <p className={`${styles.sub} num`}>
            {formatValue(goal.pointA, goal.unit)} →{" "}
            {formatValue(goal.pointB, goal.unit)} · {goal.totalSteps}{" "}
            {STEP_NOUN[goal.stepUnit][1]} · ends {formatLongDate(derived.deadline)}
          </p>
        </div>
        {!editing && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setEditing(true)}
            >
              <Icon name="edit" size={16} />
              Edit
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setPendingDelete(true)}
            >
              <Icon name="close" size={16} />
              Delete
            </button>
          </div>
        )}
      </header>

      {editing && (
        <GoalForm
          mode="edit"
          initial={goal}
          onCancel={() => setEditing(false)}
          onEdit={(patch) => {
            dispatch({ type: "editGoal", goalId: goal.id, patch });
            setEditing(false);
          }}
        />
      )}

      {/* Hero: the big figures — percent in the ring, target and current beside it. */}
      <section className={styles.hero}>
        <Donut
          progress={derived.progress}
          plannedProgress={derived.plannedProgress}
          status={derived.status}
          size={168}
        />
        <div className={styles.heroFigures}>
          <div className={styles.figureBlock}>
            <span className={`${styles.figure} num`}>
              {formatValue(derived.current, goal.unit)}
            </span>
            <span className={styles.figureLabel}>now</span>
          </div>
          <div className={styles.figureDivider} aria-hidden="true" />
          <div className={styles.figureBlock}>
            <span className={`${styles.figure} num`}>
              {formatValue(goal.pointB, goal.unit)}
            </span>
            <span className={styles.figureLabel}>target</span>
          </div>
          <div className={styles.figureDivider} aria-hidden="true" />
          <div className={styles.figureBlock}>
            <span className={`${styles.figure} num`} data-tone={derived.status}>
              {copy.headline}
            </span>
            <span className={styles.figureLabel}>
              {derived.status === "on-pace" || derived.status === "complete"
                ? "pace"
                : formatPoints(derived.pointsDelta) + " on the goal"}
            </span>
          </div>
        </div>
      </section>

      {/* Requirement 5: reference pace (fixed at creation) vs the pace needed now. */}
      <section className={styles.paces}>
        <PaceTile
          label="Reference pace"
          hint="Fixed when the goal was created"
          big={rate(derived.originalRate)}
          foot={`Should be at ${formatValue(derived.expectedValue, goal.unit)} by now`}
        />
        <PaceTile
          label="Needed from here"
          hint="Recomputed from what you’ve done"
          big={derived.adaptedRate === null ? `Final ${stepSingular}` : rate(derived.adaptedRate)}
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
      </section>

      <section className={styles.logSection}>
        <LogControl goal={goal} today={today} />
      </section>

      {goal.kind === "milestone" ? (
        <section className={styles.milestoneSection}>
          <h2 className={styles.sectionLabel}>Milestones</h2>
          <ul className={styles.milestoneList}>
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
        </section>
      ) : (
        <section className={styles.chartSection}>
          <GoalChart
            series={goalSeries(goal, today)}
            unit={goal.unit}
            kind={goal.kind}
            stepUnit={goal.stepUnit}
          />
        </section>
      )}

      <EntryLog goal={goal} />

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${goal.name}”?`}
          body="This removes the goal and every entry logged against it. It can’t be undone."
          confirmLabel="Delete goal"
          onCancel={() => setPendingDelete(false)}
          onConfirm={() => dispatch({ type: "removeGoal", goalId: goal.id })}
        />
      )}
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
    <div className={styles.tile} data-emphasise={emphasise}>
      <div className={styles.tileHead}>
        <span className={styles.tileLabel}>{label}</span>
        <span className={styles.tileHint}>{hint}</span>
      </div>
      <span className={`${styles.tileBig} num`}>{big}</span>
      <span className={`${styles.tileFoot} num`}>{foot}</span>
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
    <form className={styles.log} onSubmit={submit}>
      <div className={`field ${styles.logField}`}>
        <label className="label" htmlFor="log-value">
          {isMeasure ? "New reading" : "Add progress"}
        </label>
        <input
          id="log-value"
          className="input num"
          type="number"
          step="any"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isMeasure ? "Latest measurement" : `Amount in ${goal.unit || "units"}`}
        />
      </div>
      <div className={`field ${styles.logDate}`}>
        <label className="label" htmlFor="log-date">
          Date
        </label>
        <input
          id="log-date"
          className="input num"
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={value.trim() === ""}>
        <Icon name="plus" size={16} />
        Log
      </button>
      {hasEntries && (
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => dispatch({ type: "undoLastEntry", goalId: goal.id })}
        >
          <Icon name="undo" size={16} />
          Undo last
        </button>
      )}
    </form>
  );
}
