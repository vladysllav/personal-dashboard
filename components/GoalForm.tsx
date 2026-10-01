"use client";

import { useId, useState } from "react";
import { todayKey } from "@/lib/dates";
import { newId, type GoalPatch } from "@/lib/store";
import type { Goal, GoalKind, Milestone, StepUnit } from "@/lib/types";
import { Alert, Button, Field, Input, Select, Textarea } from "./ui";

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
 *
 * It opens inside the card it belongs to, on `surface-2`, so the row it will
 * become stays in view instead of being replaced by a modal.
 */
export function GoalForm({
  mode,
  initial,
  onCancel,
  onAdd,
  onEdit,
  className = "border-b border-line bg-surface-2 p-4 sm:p-5",
}: {
  mode: "add" | "edit";
  initial?: Goal;
  onCancel: () => void;
  onAdd?: (goal: Goal) => void;
  onEdit?: (patch: GoalPatch) => void;
  /** The form always sits inside the card it belongs to; only the seam differs. */
  className?: string;
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
    <form className={className} onSubmit={handleSubmit} noValidate>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Name" htmlFor={`${uid}-name`} className="sm:col-span-2">
          <Input
            id={`${uid}-name`}
            size="lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emergency fund"
            autoFocus
          />
        </Field>

        <Field
          label="How it’s recorded"
          htmlFor={`${uid}-kind`}
          className="sm:col-span-2 xl:col-span-1"
          hint={
            isEdit ? "Fixed once the goal holds data." : undefined
          }
        >
          <Select
            id={`${uid}-kind`}
            size="lg"
            value={kind}
            disabled={isEdit}
            onChange={(e) => setKind(e.target.value as GoalKind)}
          >
            {(Object.keys(KIND_LABEL) as GoalKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>

        {isMilestone ? (
          <Field
            label="Milestones — one per line"
            htmlFor={`${uid}-milestones`}
            className="sm:col-span-2 xl:col-span-3"
          >
            <Textarea
              id={`${uid}-milestones`}
              value={milestoneText}
              onChange={(e) => setMilestoneText(e.target.value)}
              placeholder={"Draft the outline\nWrite chapter one\nSend to editor"}
            />
          </Field>
        ) : (
          <>
            <Field label="Unit" htmlFor={`${uid}-unit`}>
              <Input
                id={`${uid}-unit`}
                size="lg"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="€, kg, km"
              />
            </Field>
            <Field label="Start (point A)" htmlFor={`${uid}-a`}>
              <Input
                id={`${uid}-a`}
                size="lg"
                type="number"
                step="any"
                value={pointA}
                onChange={(e) => setPointA(e.target.value)}
              />
            </Field>
            <Field label="Target (point B)" htmlFor={`${uid}-b`}>
              <Input
                id={`${uid}-b`}
                size="lg"
                type="number"
                step="any"
                value={pointB}
                onChange={(e) => setPointB(e.target.value)}
                placeholder="6000"
              />
            </Field>
          </>
        )}

        <Field label="Steps" htmlFor={`${uid}-steps`}>
          <Input
            id={`${uid}-steps`}
            size="lg"
            type="number"
            min={1}
            step={1}
            value={totalSteps}
            onChange={(e) => setTotalSteps(e.target.value)}
          />
        </Field>

        <Field label="Measured by" htmlFor={`${uid}-step-unit`}>
          <Select
            id={`${uid}-step-unit`}
            size="lg"
            value={stepUnit}
            onChange={(e) => setStepUnit(e.target.value as StepUnit)}
          >
            <option value="day">Days</option>
            <option value="week">Weeks</option>
            <option value="month">Months</option>
          </Select>
        </Field>

        <Field label="Starts" htmlFor={`${uid}-start`}>
          <Input
            id={`${uid}-start`}
            size="lg"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
      </div>

      <p className="mt-3 max-w-[68ch] text-[11.5px] leading-relaxed text-ink-3">
        Steps are how the goal is divided. {totalSteps || "0"}{" "}
        {stepUnit === "day" ? "days" : stepUnit === "week" ? "weeks" : "months"}{" "}
        sets both the deadline and the pace you&rsquo;ll be measured against.
      </p>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">
          {isEdit ? "Save changes" : "Add goal"}
        </Button>
      </div>
    </form>
  );
}
