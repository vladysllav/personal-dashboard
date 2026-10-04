"use client";

import { useMemo } from "react";
import {
  WEEKDAY_SHORT,
  addDays,
  formatLongDate,
  formatShortDate,
  weekdayIndex,
} from "@/lib/dates";
import { dayStats, overallStats, overallStreaks, weekStats } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { BarChart, type Bar } from "./BarChart";
import { Donut } from "./Donut";
import { Card, CardHead } from "./ui";

/** Days shown, ending on today. */
const DAYS = 4;
/** Weeks shown, ending on this one. */
const WEEKS = 3;

/**
 * Every habit at once, in three readings that sit on one line.
 *
 * The ring is "am I keeping my word" — everything the plans asked of me so far
 * against everything that landed. The daily bars are the week you are actually
 * standing in. The weekly bars are "did I hit my quotas", and they are the only
 * one of the three that scores a 4×/week habit correctly, because a week is the
 * smallest window in which "4× a week" is even a question.
 *
 * Both charts are centred on now rather than trailing behind it. A short window
 * with every bar labelled answers "how is it going" faster than a long one you
 * have to scan, and the days and weeks still to come give the commitment a
 * shape you are inside of rather than a record you are behind.
 */
export function HabitOverview({
  habits,
  today,
}: {
  habits: Habit[];
  today: string;
}) {
  const overall = useMemo(() => overallStats(habits, today), [habits, today]);
  const streaks = useMemo(() => overallStreaks(habits, today), [habits, today]);

  const days = useMemo(
    () => dayStats(habits, addDays(today, -(DAYS - 1)), today),
    [habits, today],
  );
  const weeks = useMemo(
    () => weekStats(habits, today, WEEKS),
    [habits, today],
  );

  const dayBars: Bar[] = days.map((d) => {
    // Nothing running is the only bar without a reading now that the window
    // stops at today — an empty track there means "no habit covered this day",
    // not "a day you have not lived yet".
    const pending = d.active === 0;
    return {
      key: d.day,
      value: d.pct,
      tick: WEEKDAY_SHORT[weekdayIndex(d.day)]!,
      readout: pending ? undefined : `${Math.round(d.pct * 100)}%`,
      emphasis: d.day === today,
      pending,
      detail: pending
        ? `${formatLongDate(d.day)} — nothing running`
        : `${formatLongDate(d.day)} — ${d.done} of ${d.active} habits · ${Math.round(d.pct * 100)}%`,
    };
  });

  const weekBars: Bar[] = weeks.map((w) => {
    const pending = w.target <= 0;
    return {
      key: w.weekStart,
      value: w.pct,
      tick: formatShortDate(w.weekStart),
      readout: pending ? undefined : `${Math.round(w.pct * 100)}%`,
      emphasis: w.current,
      pending,
      detail: pending
        ? `Week of ${formatShortDate(w.weekStart)} — nothing running`
        : `Week of ${formatShortDate(w.weekStart)} — ${w.done} of ${round1(w.target)} planned · ${Math.round(w.pct * 100)}%${w.current ? " (in progress)" : ""}`,
    };
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="flex flex-col" aria-labelledby="overall-heading">
        <CardHead
          id="overall-heading"
          title="All habits"
          right={
            <span className="text-[11.5px] text-ink-3 tnum">
              {overall.markedToday} of {overall.dueToday} marked today
            </span>
          }
        />
        <div className="flex flex-1 flex-wrap items-center justify-center gap-5 p-4 sm:p-5">
          <Donut
            progress={overall.adherence}
            plannedProgress={0}
            // Always the accent. The ring reports a share, not a verdict:
            // habits lost their ahead/behind reading everywhere else on this
            // screen, and a colour that turns amber below some threshold would
            // quietly put it back.
            status="on-pace"
            size={140}
            caption="kept so far"
          />
          <dl className="flex min-w-[112px] flex-1 flex-col gap-3">
            <Metric
              label="Days kept"
              value={String(overall.done)}
              // A tile is no place for a fraction: the exact figure is in the note.
              unit={`of ${Math.round(overall.expected)} asked`}
            />
            {/* The whole-board streak replaces the finished-plans count that
                used to sit here. Habits have no finish line any more, and
                "how many days running did I show up" is the figure that reads
                as an achievement rather than as a balance sheet. */}
            <Metric
              label="Showing up"
              value={String(streaks.current)}
              unit={`day${streaks.current === 1 ? "" : "s"} running · best ${streaks.longest}`}
            />
          </dl>
        </div>
      </Card>

      <Card className="flex flex-col" aria-labelledby="daily-heading">
        <CardHead
          id="daily-heading"
          title="By day"
          hint={`Share of your habits kept, the last ${DAYS} days`}
        />
        <BarChart bars={dayBars} label={`Share of habits kept on each of the last ${DAYS} days`} />
      </Card>

      <Card
        className="flex flex-col md:col-span-2 xl:col-span-1"
        aria-labelledby="weekly-heading"
      >
        <CardHead
          id="weekly-heading"
          title="By week"
          hint={`Quota met, this week and the ${WEEKS - 1} before it`}
        />
        <BarChart
          bars={weekBars}
          label={`Share of the weekly quota met, this week and the ${WEEKS - 1} before it`}
        />
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-3">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink tnum">
          {value}
        </span>
        <span className="truncate text-[11.5px] text-ink-3">{unit}</span>
      </dd>
    </div>
  );
}

/** One decimal, and no trailing ".0" — expectations are fractional, counts are not. */
function round1(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}
