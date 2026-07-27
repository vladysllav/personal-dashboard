"use client";

import { useId, useState } from "react";
import { todayKey } from "@/lib/dates";
import { newId, type GoalPatch } from "@/lib/store";
import type { Goal, GoalKind, Milestone, StepUnit } from "@/lib/types";
import styles from "./GoalSection.module.css";

const KIND_LABEL: Record<GoalKind, string> = {
  accumulate: "Count up — each entry adds to a total",
  measure: "Measurement — each entry replaces the last",
  milestone: "Milestones — tick off a list",
};

/**
 * The one form behind both flows. In "add" it mints a fresh Goal; in "edit" it
 * emits a patch and — for milestones — rebuilds the list while preserving which
 * ones were already ticked. `kind` is frozen while editing: it is how every
 * existing entry is interpreted, so changing it would silently reread the data.
 */
export function GoalForm({
  mode,
  initial,
  onCancel,
  onAdd,
  onEdit,
}: {
  mode: "add" | "edit";
  initial?: Goal;
  onCancel: () => void;
  onAdd?: (goal: Goal) => void;
  onEdit?: (patch: GoalPatch) => void;
}) {
  const uid = useId();
  const [kind, setKind] = useState<GoalKind>(initial?.kind ?? "accumulate");
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [pointA, setPointA] = useState(initial ? String(initial.pointA) : "0");
  const [pointB, setPointB] = useState(
    initial && initial.kind !== "milestone" ? String(initial.pointB) : "",
  );
  const [milestoneText, setMilestoneText] = useState(
    initial?.milestones.map((m) => m.label).join("\n") ?? "",
  );
  const [stepUnit, setStepUnit] = useState<StepUnit>(initial?.stepUnit ?? "day");
  const [totalSteps, setTotalSteps] = useState(
    initial ? String(initial.totalSteps) : "30",
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayKey());
  const [error, setError] = useState<string | null>(null);

  const isMilestone = kind === "milestone";
  const isEdit = mode === "edit";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return setError("Give the goal a name.");

    const steps = Number(totalSteps);
    if (!Number.isFinite(steps) || steps < 1) {
      return setError("Steps must be a whole number of 1 or more.");
    }

    const labels = milestoneText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let a = 0;
    let b = 0;
    let milestones: Milestone[] = [];

    if (isMilestone) {
      if (labels.length === 0) {
        return setError("Add at least one milestone, one per line.");
      }
      b = labels.length;
      // Preserve done-state by position so an edit never silently unticks work.
      milestones = labels.map((label, i) => ({
        id: initial?.milestones[i]?.id ?? newId(),
        label,
        done: initial?.milestones[i]?.done ?? false,
      }));
    } else {
      a = Number(pointA);
      b = Number(pointB);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return setError("Start and target both need to be numbers.");
      }
      if (a === b) {
        return setError(
          "Start and target are the same, so there is nothing to track.",
        );
      }
    }

    setError(null);

    if (isEdit) {
      onEdit?.({
        name: trimmed,
        unit: isMilestone ? "" : unit.trim(),
        pointA: a,
        pointB: b,
        stepUnit,
        totalSteps: Math.round(steps),
        startDate,
        ...(isMilestone ? { milestones } : {}),
      });
      return;
    }

    onAdd?.({
      id: newId(),
      name: trimmed,
      kind,
      unit: isMilestone ? "" : unit.trim(),
      pointA: a,
      pointB: b,
      stepUnit,
      totalSteps: Math.round(steps),
      startDate,
      entries: [],
      milestones,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={`field ${styles.formWide}`}>
        <label className="label" htmlFor={`${uid}-name`}>
          Name
        </label>
        <input
          id={`${uid}-name`}
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Emergency fund"
          autoFocus
        />
      </div>

      <div className={`field ${styles.formWide}`}>
        <label className="label" htmlFor={`${uid}-kind`}>
          How it&rsquo;s recorded
        </label>
        <select
          id={`${uid}-kind`}
          className="input"
          value={kind}
          disabled={isEdit}
          onChange={(e) => setKind(e.target.value as GoalKind)}
        >
          {(Object.keys(KIND_LABEL) as GoalKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        {isEdit && (
          <span className={styles.fieldNote}>
            How a goal is recorded is fixed once it holds data.
          </span>
        )}
      </div>

      {isMilestone ? (
        <div className={`field ${styles.formWide}`}>
          <label className="label" htmlFor={`${uid}-milestones`}>
            Milestones — one per line
          </label>
          <textarea
            id={`${uid}-milestones`}
            className={`input ${styles.textarea}`}
            value={milestoneText}
            onChange={(e) => setMilestoneText(e.target.value)}
            placeholder={"Draft the outline\nWrite chapter one\nSend to editor"}
          />
        </div>
      ) : (
        <>
          <div className="field">
            <label className="label" htmlFor={`${uid}-unit`}>
              Unit
            </label>
            <input
              id={`${uid}-unit`}
              className="input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="€, kg, km"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`${uid}-a`}>
              Start (point A)
            </label>
            <input
              id={`${uid}-a`}
              className="input num"
              type="number"
              step="any"
              value={pointA}
              onChange={(e) => setPointA(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`${uid}-b`}>
              Target (point B)
            </label>
            <input
              id={`${uid}-b`}
              className="input num"
              type="number"
              step="any"
              value={pointB}
              onChange={(e) => setPointB(e.target.value)}
              placeholder="6000"
            />
          </div>
        </>
      )}

      <div className="field">
        <label className="label" htmlFor={`${uid}-steps`}>
          Steps
        </label>
        <input
          id={`${uid}-steps`}
          className="input num"
          type="number"
          min={1}
          step={1}
          value={totalSteps}
          onChange={(e) => setTotalSteps(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={`${uid}-step-unit`}>
          Measured by
        </label>
        <select
          id={`${uid}-step-unit`}
          className="input"
          value={stepUnit}
          onChange={(e) => setStepUnit(e.target.value as StepUnit)}
        >
          <option value="day">Days</option>
          <option value="week">Weeks</option>
          <option value="month">Months</option>
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor={`${uid}-start`}>
          Starts
        </label>
        <input
          id={`${uid}-start`}
          className="input num"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <p className={styles.hint}>
        Steps are how the goal is divided. {totalSteps || "0"}{" "}
        {stepUnit === "day" ? "days" : stepUnit === "week" ? "weeks" : "months"}{" "}
        sets both the deadline and the pace you&rsquo;ll be measured against.
      </p>

      {error && (
        <p className={styles.formError} role="alert">
          <span className={styles.formErrorMark} aria-hidden="true">
            !
          </span>
          {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? "Save changes" : "Add goal"}
        </button>
      </div>
    </form>
  );
}
