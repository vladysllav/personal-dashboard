"use client";

import { useState } from "react";
import { addMonths, formatShortDate, monthKey } from "@/lib/dates";
import { deriveHabitStats } from "@/lib/habits";
import { useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { HabitCalendar } from "./HabitCalendar";
import { Card, IconButton } from "./ui";

/**
 * One habit, in full: what you committed to, three figures, and the month you
 * are ticking off across the width of the card.
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

  const percent = Math.round((stats.goalProgress ?? stats.adherence) * 100);

  return (
    <Card as="li" className="flex flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="truncate text-[13.5px] font-medium text-ink" title={habit.name}>
            {habit.name}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-ink-3">
            <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-ink-2">
              {plan.isDaily ? "Every day" : `${plan.target}× / week`}
            </span>
            <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-ink-2">
              {plan.durationWeeks === null
                ? "Ongoing"
                : `${plan.durationWeeks} ${plan.durationWeeks === 1 ? "week" : "weeks"}`}
            </span>
            <span className="tnum">
              from {formatShortDate(plan.startDate)}
              {plan.endDate !== null && ` to ${formatShortDate(plan.endDate)}`}
            </span>
          </p>
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
          share of the commitment done, and what is still outstanding. */}
      <dl className="grid grid-cols-3 gap-2 px-4 pt-4 sm:px-5">
        <Stat value={String(stats.done)} label="Days kept" />
        <Stat value={`${percent}%`} label="Completed" />
        {plan.totalTarget !== null ? (
          <Stat value={String(plan.totalTarget)} label="Day goal" />
        ) : (
          <Stat value={`${stats.weekMarks}/${plan.target}`} label="This week" />
        )}
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
