"use client";

import { useMemo } from "react";
import {
  WEEKDAY_SHORT,
  addDays,
  dayOfMonth,
  formatLongDate,
  formatMonthYear,
  startOfWeek,
  weekdayIndex,
} from "@/lib/dates";
import { habitsForDay } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { Icon } from "./Icon";

/**
 * The week, as seven targets.
 *
 * It does two jobs at once and that is the point: it picks the day the list
 * below is about, and it says how each day went before you pick it. A filled
 * tile is a day where everything asked of you landed, a pale one is a day half
 * kept — so the week reads as a shape rather than as seven dates you would
 * have to open one at a time.
 *
 * Monday-first and a whole week at a time, because a habit's quota is a week
 * ("4× a week"), and a rolling seven-day window would cut that quota in half
 * across two columns.
 */
export function WeekStrip({
  habits,
  selected,
  today,
  onSelect,
}: {
  habits: Habit[];
  selected: string;
  today: string;
  onSelect: (day: string) => void;
}) {
  const weekStart = startOfWeek(selected);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        const items = habitsForDay(habits, day);
        const done = items.filter((item) => item.day.status === "done").length;
        return { day, done, total: items.length };
      }),
    [habits, weekStart],
  );

  // The month of the day on show, not of the week's Monday: a week that
  // straddles the turn of a month would otherwise be labelled September while
  // you are looking at the 2nd of October.
  const label = formatMonthYear(selected);
  const nextWeek = addDays(weekStart, 7);

  return (
    <section aria-label="Week" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13.5px] font-medium text-ink">{label}</h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelect(addDays(selected, -7))}
            aria-label="Previous week"
            className="rounded-[var(--radius-badge)] p-1.5 text-ink-3 hover:bg-surface-3 hover:text-ink"
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          {/* Nothing has happened in a week that has not started, so the strip
              stops at the one containing today rather than walking into empty
              grids. */}
          <button
            type="button"
            onClick={() => onSelect(addDays(selected, 7))}
            disabled={nextWeek > today}
            aria-label="Next week"
            className="rounded-[var(--radius-badge)] p-1.5 text-ink-3 hover:bg-surface-3 hover:text-ink disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:bg-transparent"
          >
            <Icon name="chevronRight" size={16} />
          </button>
          {weekStart !== startOfWeek(today) && (
            <button
              type="button"
              onClick={() => onSelect(today)}
              className="ml-1 rounded-[var(--radius-badge)] px-2 py-1 text-[12.5px] text-ink-2 hover:bg-surface-3 hover:text-ink"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-7 gap-1.5">
        {days.map(({ day, done, total }) => (
          <li key={day}>
            <DayTile
              day={day}
              done={done}
              total={total}
              selected={day === selected}
              isToday={day === today}
              future={day > today}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DayTile({
  day,
  done,
  total,
  selected,
  isToday,
  future,
  onSelect,
}: {
  day: string;
  done: number;
  total: number;
  selected: boolean;
  isToday: boolean;
  future: boolean;
  onSelect: (day: string) => void;
}) {
  const complete = total > 0 && done === total;
  const partial = total > 0 && done > 0 && !complete;

  // Selection outranks the reading: you need to know which day the list below
  // belongs to more than you need yesterday's score while looking at it.
  const tone = selected
    ? "bg-ink text-surface"
    : complete
      ? "bg-accent-600 text-ink"
      : partial
        ? "bg-accent-50 text-accent-700"
        : future
          ? "bg-surface-2 text-ink-3"
          : "bg-surface-3 text-ink-2";

  const state = future
    ? "nothing yet"
    : total === 0
      ? "nothing due"
      : `${done} of ${total} kept`;

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-pressed={selected}
      aria-label={`${formatLongDate(day)} — ${state}`}
      title={`${formatLongDate(day)} — ${state}`}
      className={`flex w-full flex-col items-center gap-0.5 rounded-[var(--radius-control)] px-1 py-2.5 ${tone}`}
    >
      <span aria-hidden="true" className="text-[17px] font-semibold leading-none tnum">
        {dayOfMonth(day)}
      </span>
      <span aria-hidden="true" className="text-[11px] leading-none">
        {WEEKDAY_SHORT[weekdayIndex(day)]}
      </span>
      {/* Today is marked whether or not it is the day on show, so the strip
          never loses its anchor while you look back through the week. */}
      <span
        aria-hidden="true"
        className={
          "mt-0.5 size-1 rounded-full " + (isToday ? "bg-current" : "bg-transparent")
        }
      />
    </button>
  );
}
