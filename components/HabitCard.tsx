"use client";

import { useState } from "react";
import { addMonths, formatShortDate, monthKey } from "@/lib/dates";
import { cadenceLabel, deriveHabitStats } from "@/lib/habits";
import { swatch } from "@/lib/palette";
import { useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { HabitCalendar } from "./HabitCalendar";
import { Card, IconButton } from "./ui";

/**
 * One habit's history, in full: what you committed to, three figures, and the
 * month you are ticking off across the width of the card.
 *
 * Deliberately no pace verdict. A goal is a quantity you can be ahead of or
 * behind, and saying so is the whole point of it; a habit is a thing you either
 * did today or did not, and a card that opens with "behind" every time you miss
 * a Sunday stops being read. What is left is the count, the percentage, and the
 * month — facts, with the judgement left to the person who kept them.
 */
export function HabitCard({
  habit,
  today,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { dispatch } = useStore();
  const [month, setMonth] = useState(() => monthKey(today));
  const stats = deriveHabitStats(habit, today);
  const { plan } = stats;
  const marks = new Set(habit.marks);
  const face = swatch(habit.color);

  const percent = Math.round(stats.adherence * 100);

  return (
    <Card as="li" className="flex flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-2.5">
          {/* The colour and the icon are how this habit is recognised on the
              habits screen, so they come with it rather than being left behind
              the moment you ask about its history. */}
          <span
            aria-hidden="true"
            style={{ backgroundColor: face.fill }}
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[17px] leading-none"
          >
            {habit.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13.5px] font-medium text-ink" title={habit.name}>
              {habit.name}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-ink-3">
              <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-ink-2">
                {cadenceLabel(plan.frequency)}
              </span>
              <span className="tnum">from {formatShortDate(plan.startDate)}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton name="edit" label={`Edit ${habit.name}`} onClick={onEdit} />
          <IconButton
            name="close"
            size={14}
            label={`Delete ${habit.name}`}
            onClick={onDelete}
          />
        </div>
      </header>

      {/* Three figures that cannot all flatter you at once: a raw count, the
          share of what was asked that landed, and where this week stands. */}
      <dl className="grid grid-cols-3 gap-2 px-4 pt-4 sm:px-5">
        <Stat value={String(stats.done)} label="Days kept" />
        <Stat value={`${percent}%`} label="Of the plan" />
        <Stat value={`${stats.weekMarks}/${stats.weekTarget}`} label="This week" />
      </dl>

      <div className="px-4 py-4 sm:px-5">
        <HabitCalendar
          name={habit.name}
          month={month}
          marks={marks}
          plan={plan}
          today={today}
          onToggle={(day) =>
            dispatch({ type: "toggleHabit", habitId: habit.id, dateKey: day })
          }
          onMonthChange={(delta) => setMonth((m) => monthKey(addMonths(m, delta)))}
        />
      </div>
    </Card>
  );
}

/**
 * `dl` requires the term before its description, but the figure has to read
 * first — so the pair is ordered correctly in the markup and reversed by the
 * layout. A screen reader gets "Days kept, 32"; the eye gets 32.
 */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse rounded-[10px] bg-surface-3 px-2 py-2.5 text-center">
      <dt className="mt-1 truncate text-[11.5px] text-ink-3">{label}</dt>
      <dd className="text-[17px] font-semibold leading-none tracking-[-0.01em] text-ink tnum">
        {value}
      </dd>
    </div>
  );
}
