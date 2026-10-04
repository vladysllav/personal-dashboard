"use client";

import {
  WEEKDAY_ABBR,
  dayOfMonth,
  formatLongDate,
  formatMonthYear,
  monthGrid,
  monthKey,
} from "@/lib/dates";
import { inPlan, type HabitPlan } from "@/lib/habits";
import { Icon } from "./Icon";

/**
 * One month of one habit, every day a target you can hit.
 *
 * A day has four readings and each gets its own visual weight rather than a
 * shade of the same one: **kept** is a filled accent tile, **missed** is a grey
 * tile, **outside the commitment** is a dashed outline and takes no click, and
 * **today** carries a ring whether or not it is kept. That ordering matters —
 * a month of kept days should read as a block of colour at a glance, and the
 * gaps in it should be the thing your eye lands on.
 *
 * Whole weeks are always drawn, so the columns stay under their weekday
 * headings; days spilling in from the neighbouring months are dimmed but stay
 * live, because fixing "I forgot to tick last Sunday" should not require
 * paging backwards.
 */
export function HabitCalendar({
  name,
  month,
  marks,
  plan,
  today,
  onToggle,
  onMonthChange,
}: {
  name: string;
  /** The month on show, as a date key or "YYYY-MM". */
  month: string;
  marks: Set<string>;
  plan: HabitPlan;
  today: string;
  onToggle: (day: string) => void;
  onMonthChange: (delta: number) => void;
}) {
  const cells = monthGrid(month);
  const mk = monthKey(month);
  const atCurrentMonth = mk >= monthKey(today);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          aria-label={`${name}: previous month`}
          className="rounded-[8px] p-1 text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <h4 className="text-[12.5px] font-medium text-ink-2">
          {formatMonthYear(mk)}
        </h4>
        <button
          type="button"
          onClick={() => onMonthChange(1)}
          // There is nothing to mark ahead of today, so the forward arrow stops
          // at the current month instead of walking into empty grids.
          disabled={atCurrentMonth}
          aria-label={`${name}: next month`}
          className="rounded-[8px] p-1 text-ink-3 hover:bg-surface-3 hover:text-ink disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:bg-transparent"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      <div
        aria-hidden="true"
        className="mt-2 grid grid-cols-7 gap-1 text-center text-[11.5px] text-ink-3"
      >
        {WEEKDAY_ABBR.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div
        className="mt-1 grid grid-cols-7 gap-1"
        role="group"
        aria-label={`${name}: ${formatMonthYear(mk)}`}
      >
        {cells.map(({ day, inMonth }) => (
          <DayCell
            key={day}
            day={day}
            inMonth={inMonth}
            done={marks.has(day)}
            isToday={day === today}
            covered={inPlan(plan, day)}
            future={day > today}
            name={name}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  done,
  isToday,
  covered,
  future,
  name,
  onToggle,
}: {
  day: string;
  inMonth: boolean;
  done: boolean;
  isToday: boolean;
  covered: boolean;
  future: boolean;
  name: string;
  onToggle: (day: string) => void;
}) {
  // A day already kept stays interactive whatever the plan says — the mark is
  // recorded history, and the one thing the calendar must never do is hide a
  // day you actually did because the commitment was later edited around it.
  // Only an empty day outside the window, or one that has not arrived, is inert.
  const outside = !covered;
  const locked = future || (outside && !done);

  const base =
    "relative flex aspect-square items-center justify-center rounded-[8px] text-[12.5px] tnum";

  const tone = locked
    ? "border border-dashed border-line text-ink-3 cursor-not-allowed"
    : done
      ? outside
        // Kept, but it does not count toward this plan: the accent says "done",
        // the dashed edge and the lighter step say "not part of the target".
        ? "border border-dashed border-accent-700 bg-accent-100 font-medium text-accent-700 hover:bg-accent-200"
        : "border border-accent-700 bg-accent-500 font-medium text-ink hover:bg-accent-pressed"
      : "bg-surface-3 text-ink-2 hover:bg-line-strong hover:text-ink";

  // The today ring is drawn inside the tile so it never nudges the grid.
  const ring = isToday ? " ring-2 ring-inset ring-ink" : "";
  const dim = inMonth ? "" : " opacity-45";

  const state = done
    ? outside
      ? "kept, outside the plan"
      : "kept"
    : future
      ? "not yet"
      : outside
        ? "outside the plan"
        : "not marked";

  if (locked) {
    return (
      <span className={`${base} ${tone}${ring}${dim}`} title={`${formatLongDate(day)} — ${state}`}>
        <span aria-hidden="true">{dayOfMonth(day)}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={() => onToggle(day)}
      title={`${formatLongDate(day)} — ${state}`}
      className={`${base} ${tone}${ring}${dim}`}
    >
      <span aria-hidden="true">{dayOfMonth(day)}</span>
      <span className="visually-hidden">
        {name}, {isToday ? "today, " : ""}
        {formatLongDate(day)} — {state}
      </span>
    </button>
  );
}
