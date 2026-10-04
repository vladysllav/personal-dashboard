"use client";

import { useState } from "react";
import { cadenceLabel, normalizeFrequency } from "@/lib/habits";
import {
  DEFAULT_COLOR,
  DEFAULT_EMOJI,
  HABIT_EMOJI,
  SWATCHES,
  swatch,
  type HabitColor,
} from "@/lib/palette";
import type { HabitPatch } from "@/lib/sync";
import type { Frequency, FrequencyUnit, Habit } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { Button, Field, Input, Select } from "./ui";

const WEEKDAYS: Array<{ day: number; short: string; full: string }> = [
  { day: 1, short: "Mon", full: "Monday" },
  { day: 2, short: "Tue", full: "Tuesday" },
  { day: 3, short: "Wed", full: "Wednesday" },
  { day: 4, short: "Thu", full: "Thursday" },
  { day: 5, short: "Fri", full: "Friday" },
  { day: 6, short: "Sat", full: "Saturday" },
  { day: 7, short: "Sun", full: "Sunday" },
];

/**
 * The cadences worth one tap, and the escape hatch for everything else.
 *
 * Five presets cover what nearly every habit actually is; "Custom" is the
 * Google-Calendar answer — a count, an interval, and optionally the exact days
 * — kept behind a choice so that four controls do not greet someone whose
 * answer was "every day".
 */
const PRESETS: Array<{ id: string; label: string; frequency: Frequency }> = [
  { id: "daily", label: "Every day", frequency: { count: 1, unit: "day", weekdays: [] } },
  { id: "weekly", label: "Once a week", frequency: { count: 1, unit: "week", weekdays: [] } },
  { id: "twice-weekly", label: "Twice a week", frequency: { count: 2, unit: "week", weekdays: [] } },
  { id: "thrice-weekly", label: "3× a week", frequency: { count: 3, unit: "week", weekdays: [] } },
  { id: "monthly", label: "Once a month", frequency: { count: 1, unit: "month", weekdays: [] } },
];

/** Which row of the dropdown an existing habit is already sitting on. */
function presetFor(frequency: Frequency): string {
  if (frequency.weekdays.length > 0) return "custom";
  const hit = PRESETS.find(
    (p) => p.frequency.unit === frequency.unit && p.frequency.count === frequency.count,
  );
  return hit?.id ?? "custom";
}

/**
 * What a habit is, stated once: a name, what doing it means, how often, and
 * the two things that make it findable in a grid — an icon and a colour.
 *
 * There is no end date and no start date. A habit is not a project with a
 * delivery date, and asking when to begin something you are deciding to do
 * right now is a field whose only honest answer is "today".
 */
export function HabitForm({
  mode,
  today,
  initial,
  onCancel,
  onDelete,
  onSubmit,
}: {
  mode: "add" | "edit";
  today: string;
  initial?: Habit;
  onCancel: () => void;
  /** Only in edit mode: deleting belongs with editing, not on the card. */
  onDelete?: () => void;
  onSubmit: (patch: HabitPatch) => void;
}) {
  const start = normalizeFrequency(initial?.frequency);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon || DEFAULT_EMOJI);
  const [color, setColor] = useState<HabitColor>(initial?.color ?? DEFAULT_COLOR);

  const [preset, setPreset] = useState(() => presetFor(start));
  const [unit, setUnit] = useState<FrequencyUnit>(
    start.unit === "day" ? "week" : start.unit,
  );
  // Held as a string so the field can be emptied mid-edit without the value
  // snapping to 0 or NaN under the typing hand.
  const [count, setCount] = useState(String(start.unit === "day" ? 2 : start.count));
  const [weekdays, setWeekdays] = useState<number[]>(start.weekdays);

  const custom = preset === "custom";
  const fixedDays = custom && unit === "week" && weekdays.length > 0;

  const toggleDay = (day: number) =>
    setWeekdays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(),
    );

  const parsed = Number(count);
  const customFrequency: Frequency = normalizeFrequency({
    count: Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1,
    unit,
    weekdays: unit === "week" ? weekdays : [],
  });
  const frequency = custom
    ? customFrequency
    : PRESETS.find((p) => p.id === preset)!.frequency;

  const trimmed = name.trim();
  const face = swatch(color);

  return (
    <Modal
      title={mode === "edit" ? "Edit habit" : "Let's start a new habit"}
      onClose={onCancel}
      footer={
        <div className="flex items-center gap-2">
          {mode === "edit" && onDelete && (
            <Button variant="quiet" className="py-2.5 text-neg-700" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button
            type="submit"
            form="habit-form"
            variant="primary"
            className="flex-1 py-2.5"
            disabled={!trimmed}
          >
            {mode === "edit" ? "Save habit" : "Add habit"}
          </Button>
        </div>
      }
    >
      <form
        id="habit-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return;
          onSubmit({
            name: trimmed,
            description: description.trim(),
            icon,
            color,
            frequency,
            // Today, unless the habit already had a start worth keeping:
            // moving it on an edit would re-score every mark before it.
            startDate: initial?.startDate ?? today,
          });
        }}
      >
        {/* The card as it will appear in the list. Icon and colour are choices
            with no words attached, so the only honest way to present them is
            the thing they produce. */}
        <div
          className="flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3.5"
          style={{ backgroundColor: face.fill, color: face.fg }}
        >
          <span aria-hidden="true" className="text-[26px] leading-none">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold">
              {trimmed || "New habit"}
            </span>
            <span className="block truncate text-[12px] opacity-80">
              {description.trim() || cadenceLabel(frequency)}
            </span>
          </span>
        </div>

        <Field label="Name" htmlFor="habit-name">
          <Input
            id="habit-name"
            size="lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type habit name"
            maxLength={200}
            autoFocus
          />
        </Field>

        <Field
          label="Description"
          htmlFor="habit-description"
          hint="What doing it actually means. Optional."
        >
          <Input
            id="habit-description"
            size="lg"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe a habit"
            maxLength={400}
          />
        </Field>

        <Field label="How often" htmlFor="habit-preset">
          <Select
            id="habit-preset"
            size="lg"
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </Select>
        </Field>

        {custom && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-line bg-surface-2 p-3">
            <div className="flex items-end gap-2">
              <Field label="How many times" htmlFor="habit-count" className="w-[120px]">
                <Input
                  id="habit-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={unit === "week" ? 7 : 28}
                  step={1}
                  size="lg"
                  // Picking days decides the count, so the field shows what
                  // those days add up to rather than a number it is ignoring.
                  value={fixedDays ? String(weekdays.length) : count}
                  onChange={(e) => setCount(e.target.value)}
                  disabled={fixedDays}
                />
              </Field>
              <Field label="Per" htmlFor="habit-unit" className="flex-1">
                <Select
                  id="habit-unit"
                  size="lg"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as FrequencyUnit)}
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </Select>
              </Field>
            </div>

            {/* Fixed days, optional — and only for a weekly cadence, because
                "the 3rd of the month" is a different idea and not one this
                model records. A quota says how many times; this says which
                ones, and only then can a reminder claim "today". */}
            {unit === "week" && (
              <fieldset>
                <legend className="text-[11.5px] text-ink-3">
                  On set days —{" "}
                  <span className="text-ink-3">
                    optional. Picking days sets the count for you.
                  </span>
                </legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {WEEKDAYS.map(({ day, short, full }) => {
                    const on = weekdays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        aria-label={full}
                        onClick={() => toggleDay(day)}
                        className={
                          "min-w-[44px] rounded-[var(--radius-control)] px-3 py-2 text-[13px] " +
                          (on
                            ? "border border-accent-700 bg-accent-600 font-medium text-ink"
                            : "border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink")
                        }
                      >
                        {short}
                      </button>
                    );
                  })}
                  {weekdays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setWeekdays([])}
                      className="rounded-[var(--radius-control)] px-2.5 py-2 text-[13px] text-ink-3 hover:text-ink"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </fieldset>
            )}

            <p className="text-[11.5px] leading-relaxed text-ink-2">
              {cadenceLabel(frequency)} —{" "}
              {frequency.weekdays.length > 0
                ? "those days, every week."
                : `whenever you like, ${frequency.count} ${frequency.count === 1 ? "time" : "times"} per ${frequency.unit}.`}
            </p>
          </div>
        )}

        <fieldset>
          <legend className="text-[11.5px] text-ink-3">Icon</legend>
          <div className="mt-1.5 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {HABIT_EMOJI.map((emoji) => {
              const on = emoji === icon;
              return (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Icon ${emoji}`}
                  onClick={() => setIcon(emoji)}
                  className={
                    "flex aspect-square items-center justify-center rounded-[var(--radius-input)] text-[20px] " +
                    (on
                      ? "border-2 border-ink bg-surface-3"
                      : "border border-line bg-surface hover:bg-surface-2")
                  }
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11.5px] text-ink-3">Colour</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {SWATCHES.map((s) => {
              const on = s.id === color;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={s.label}
                  onClick={() => setColor(s.id)}
                  style={{ backgroundColor: s.fill, color: s.fg }}
                  className={
                    "flex size-9 items-center justify-center rounded-[var(--radius-input)] " +
                    (on ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "")
                  }
                >
                  {on && <Icon name="check" size={15} />}
                </button>
              );
            })}
          </div>
        </fieldset>

        {mode === "edit" && (
          <p className="text-[11.5px] leading-relaxed text-ink-3">
            Changing the cadence re-scores the history you already have; no marks
            are lost.
          </p>
        )}
      </form>
    </Modal>
  );
}
