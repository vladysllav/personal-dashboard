"use client";

import { useMemo, useState } from "react";
import {
  WEEKDAY_SHORT,
  addDays,
  addMonths,
  dayOfMonth,
  endOfMonth,
  formatLongDate,
  formatShortDate,
  fromDateKey,
  monthKey,
  weekdayIndex,
} from "@/lib/dates";
import { dayStats, monthStats, weekStats, weekStatsBetween, type WeekStat } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { AxisChart, type AxisBar } from "./AxisChart";
import { BarChart, type Bar } from "./BarChart";
import { Donut } from "./Donut";
import { Card, CardHead, IconButton, Seg } from "./ui";

/** Days shown in the compact view, ending on the month's last lived day. */
const DAYS = 4;
/** Weeks shown in the compact view. */
const WEEKS = 3;
/** Months in one window of the weekly chart with axes. */
const QUARTER = 3;

type View = "bars" | "chart";
const VIEWS = [
  { value: "bars", label: "Bars" },
  { value: "chart", label: "Chart" },
] as const;

const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", { month: "short" });
const MONTH_SHORT_YEAR = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });
const shortMonth = (key: string) => MONTH_SHORT.format(fromDateKey(key));
const shortMonthYear = (key: string) => MONTH_SHORT_YEAR.format(fromDateKey(key));

/**
 * Every habit at once, for one calendar month: the ring and the two figures
 * beside it, the days, and the weeks. The month is chosen on the page, so
 * stepping back a month moves all of it together.
 */
export function HabitOverview({
  habits,
  today,
  month,
}: {
  habits: Habit[];
  today: string;
  /** First day of the month on show. */
  month: string;
}) {
  const monthEnd = endOfMonth(month);
  const current = monthKey(month) === monthKey(today);
  // The last day of the month that has been lived: today, or the month's end.
  const lastDay = monthEnd < today ? monthEnd : today;

  const monthly = useMemo(() => monthStats(habits, month, today), [habits, month, today]);

  const [dayView, setDayView] = useState<View>("bars");
  const [weekView, setWeekView] = useState<View>("bars");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="flex flex-col" aria-labelledby="overall-heading">
        <CardHead id="overall-heading" title="Overall" />
        <div className="flex flex-1 flex-wrap items-center justify-center gap-5 p-4 sm:p-5">
          <Donut
            progress={monthly.adherence}
            plannedProgress={0}
            // Always the accent. The ring reports a share, not a verdict.
            status="on-pace"
            size={140}
          />
          <dl className="flex min-w-[112px] flex-1 flex-col gap-4">
            {/* Where the month should be by now, against where it will end:
                the first moves with every day, the second only with marks. */}
            <Metric
              label="So far"
              value={`${monthly.done}/${Math.round(monthly.expected)}`}
            />
            <Metric label="Month" value={`${monthly.done}/${Math.round(monthly.total)}`} />
          </dl>
        </div>
      </Card>

      <Card className="flex flex-col" aria-labelledby="daily-heading">
        <CardHead
          id="daily-heading"
          title="By day"
          right={<Seg label="Daily chart view" value={dayView} onChange={setDayView} options={VIEWS} />}
        />
        {dayView === "bars" ? (
          <DayBars habits={habits} lastDay={lastDay} today={today} />
        ) : (
          <DayAxes habits={habits} month={month} today={today} />
        )}
      </Card>

      <Card
        className="flex flex-col md:col-span-2 xl:col-span-1"
        aria-labelledby="weekly-heading"
      >
        <CardHead
          id="weekly-heading"
          title="By week"
          right={<Seg label="Weekly chart view" value={weekView} onChange={setWeekView} options={VIEWS} />}
        />
        {weekView === "bars" ? (
          <WeekBars habits={habits} lastDay={lastDay} today={today} />
        ) : (
          // Keyed on the month so the page's arrows bring the window back to it.
          <WeekAxes key={month} habits={habits} month={month} today={today} />
        )}
      </Card>
    </div>
  );
}

/* ---------- By day ---------- */

function dayDetail(day: string, done: number, due: number, pct: number): string {
  return due === 0
    ? `${formatLongDate(day)} — nothing due`
    : `${formatLongDate(day)} — ${done} of ${due} due · ${Math.round(pct * 100)}%`;
}

function DayBars({ habits, lastDay, today }: { habits: Habit[]; lastDay: string; today: string }) {
  const days = useMemo(
    () => dayStats(habits, addDays(lastDay, -(DAYS - 1)), lastDay),
    [habits, lastDay],
  );
  const bars: Bar[] = days.map((d) => {
    const pending = d.due === 0;
    return {
      key: d.day,
      value: d.pct,
      tick: WEEKDAY_SHORT[weekdayIndex(d.day)]!,
      readout: pending ? undefined : `${Math.round(d.pct * 100)}%`,
      emphasis: d.day === today,
      pending,
      detail: dayDetail(d.day, d.done, d.due, d.pct),
    };
  });
  return <BarChart bars={bars} label={`Share of what was due, the last ${DAYS} days`} />;
}

function DayAxes({ habits, month, today }: { habits: Habit[]; month: string; today: string }) {
  const days = useMemo(() => dayStats(habits, month, endOfMonth(month)), [habits, month]);
  const bars: AxisBar[] = days.map((d) => ({
    key: d.day,
    // An open today with nothing ticked is not a 0% day yet.
    value: d.day > today || d.due === 0 || (d.day === today && d.done === 0) ? null : d.pct,
    tick: String(dayOfMonth(d.day)),
    emphasis: d.day === today,
    detail: d.day > today ? `${formatLongDate(d.day)} — ahead` : dayDetail(d.day, d.done, d.due, d.pct),
  }));
  return <AxisChart kind="line" bars={bars} label="Share of what was due, each day of the month" />;
}

/* ---------- By week ---------- */

function weekDetail(w: WeekStat): string {
  return w.target <= 0
    ? `Week of ${formatShortDate(w.weekStart)} — nothing running`
    : `Week of ${formatShortDate(w.weekStart)} — ${w.done} of ${round1(w.target)} planned · ${Math.round(w.pct * 100)}%${w.current ? " (in progress)" : ""}`;
}

function WeekBars({ habits, lastDay, today }: { habits: Habit[]; lastDay: string; today: string }) {
  const weeks = useMemo(() => weekStats(habits, lastDay, WEEKS, today), [habits, lastDay, today]);
  const bars: Bar[] = weeks.map((w) => {
    const pending = w.target <= 0;
    return {
      key: w.weekStart,
      value: w.pct,
      tick: formatShortDate(w.weekStart),
      readout: pending ? undefined : `${Math.round(w.pct * 100)}%`,
      emphasis: w.current,
      pending,
      detail: weekDetail(w),
    };
  });
  return <BarChart bars={bars} label={`Share of the weekly quota met, ${WEEKS} weeks`} />;
}

/**
 * Three months of weeks, ending with the month on show; the arrows step a
 * whole window at a time.
 */
function WeekAxes({ habits, month, today }: { habits: Habit[]; month: string; today: string }) {
  const [shift, setShift] = useState(0);
  const lastMonth = addMonths(month, -QUARTER * shift);
  const firstMonth = addMonths(lastMonth, -(QUARTER - 1));
  const end = endOfMonth(lastMonth);

  const weeks = useMemo(
    () => weekStatsBetween(habits, firstMonth, end, today),
    [habits, firstMonth, end, today],
  );
  const earliest = habits.map((h) => h.startDate).sort()[0] ?? today;
  const canBack = monthKey(firstMonth) > monthKey(earliest);

  const bars: AxisBar[] = weeks.map((w) => ({
    key: w.weekStart,
    value: w.future || w.target <= 0 ? null : w.pct,
    tick: formatShortDate(w.weekStart),
    emphasis: w.current,
    detail: w.future ? `Week of ${formatShortDate(w.weekStart)} — ahead` : weekDetail(w),
  }));

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 pt-3 sm:px-5">
        <IconButton
          name="chevronLeft"
          label="Previous three months"
          disabled={!canBack}
          onClick={() => setShift((s) => s + 1)}
          className="disabled:opacity-30"
        />
        <span className="text-[12.5px] font-medium text-ink-2 tnum">
          {shortMonth(firstMonth)} – {shortMonthYear(lastMonth)}
        </span>
        <IconButton
          name="chevronRight"
          label="Next three months"
          disabled={shift === 0}
          onClick={() => setShift((s) => Math.max(0, s - 1))}
          className="disabled:opacity-30"
        />
      </div>
      <AxisChart bars={bars} label="Share of the weekly quota met, week by week over three months" />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-3">{label}</dt>
      <dd className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink tnum">
        {value}
      </dd>
    </div>
  );
}

/** One decimal, and no trailing ".0" — expectations are fractional, counts are not. */
function round1(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}
