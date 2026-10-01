"use client";

import { useState } from "react";
import { addDays, formatShortDate } from "@/lib/dates";
import type { HabitPatch } from "@/lib/sync";
import type { Habit } from "@/lib/types";
import { Button, Card, CardHead, Field, Input, Select } from "./ui";

/**
 * What a habit is, stated once: a name, a cadence, a start, and a length.
 *
 * Cadence and length are the two halves of the target — "4× a week for 12
 * weeks" is 48 sessions — so the form does that multiplication out loud
 * underneath. Committing to a number you have not seen is how a plan quietly
 * becomes unreachable.
 */
export function HabitForm({
  mode,
  today,
  initial,
  onCancel,
  onSubmit,
}: {
  mode: "add" | "edit";
  today: string;
  initial?: Habit;
  onCancel: () => void;
  onSubmit: (patch: HabitPatch) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(
    initial?.weeklyTarget && initial.weeklyTarget < 7 ? initial.weeklyTarget : 7,
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  // Held as the raw string so the field can be cleared mid-edit without the
  // value snapping to 0 or NaN under the typing hand.
  const [duration, setDuration] = useState(
    initial ? (initial.durationWeeks === null ? "" : String(initial.durationWeeks)) : "12",
  );

  const trimmed = name.trim();
  // An empty field is the open-ended answer, not a missing one. Anything that
  // is not a usable count of weeks lands there too, so a half-typed value can
  // never be submitted as a plan.
  const parsed = Number(duration);
  const weeks =
    duration.trim() === "" || !Number.isFinite(parsed) || parsed < 1
      ? null
      : Math.min(520, Math.floor(parsed));
  const totalTarget = weeks === null ? null : weeks * target;
  const endDate = weeks === null ? null : addDays(startDate, weeks * 7 - 1);

  return (
    <Card>
      <CardHead
        title={mode === "edit" ? "Edit habit" : "New habit"}
        hint="The cadence and the length are the goal: how often, for how long."
      />
      <form
        className="p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onSubmit({
            name: trimmed,
            // The client model omits the field for daily habits rather than
            // storing 7 — `habitTarget` reads a missing value as daily.
            weeklyTarget: target >= 7 ? undefined : target,
            startDate,
            durationWeeks: weeks,
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Habit name"
            htmlFor="habit-name"
            className="sm:col-span-2 lg:col-span-1"
          >
            <Input
              id="habit-name"
              size="lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Gym"
              autoFocus
            />
          </Field>

          <Field label="How often" htmlFor="habit-target">
            <Select
              id="habit-target"
              size="lg"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            >
              <option value={7}>Every day</option>
              <option value={6}>6× a week</option>
              <option value={5}>5× a week</option>
              <option value={4}>4× a week</option>
              <option value={3}>3× a week</option>
              <option value={2}>2× a week</option>
              <option value={1}>Once a week</option>
            </Select>
          </Field>

          <Field
            label="For how long"
            htmlFor="habit-duration"
            hint="Weeks. Leave empty for no end date."
          >
            <Input
              id="habit-duration"
              type="number"
              inputMode="numeric"
              min={1}
              max={520}
              step={1}
              size="lg"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ongoing"
            />
          </Field>

          <Field label="Starting" htmlFor="habit-start">
            <Input
              id="habit-start"
              type="date"
              size="lg"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value || today)}
            />
          </Field>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-2">
          {totalTarget === null ? (
            <>
              Open-ended, {target >= 7 ? "every day" : `${target}× a week`} from{" "}
              <span className="tnum">{formatShortDate(startDate)}</span>. Measured
              against what the plan asks for so far.
            </>
          ) : (
            <>
              That&rsquo;s{" "}
              <span className="font-medium text-ink tnum">{totalTarget} days</span>{" "}
              to hit — {target >= 7 ? "every day" : `${target}× a week`} for {weeks}{" "}
              {weeks === 1 ? "week" : "weeks"}, ending{" "}
              <span className="tnum">{formatShortDate(endDate!)}</span>.
            </>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" className="py-2.5" disabled={!trimmed}>
            {mode === "edit" ? "Save habit" : "Add habit"}
          </Button>
          <Button className="py-2.5" onClick={onCancel}>
            Cancel
          </Button>
          {mode === "edit" && (
            <span className="text-[11.5px] leading-relaxed text-ink-3">
              Changing the cadence or length re-scores the history you already
              have; no marks are lost.
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
