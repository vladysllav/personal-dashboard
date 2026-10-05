"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatLongDate } from "@/lib/dates";
import { allHabitsForDay, type HabitDay } from "@/lib/habits";
import { swatch } from "@/lib/palette";
import { newId, useStore } from "@/lib/store";
import type { HabitPatch } from "@/lib/sync";
import type { Habit } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { HabitForm } from "./HabitForm";
import { Icon } from "./Icon";
import { WeekStrip } from "./WeekStrip";
import { Button, Card, CardHead, Empty } from "./ui";

/**
 * The habits screen: a week, and what that day asks of you.
 *
 * It used to open with the whole picture — a ring, two bar charts, a
 * percentage in the subtitle — and the thing you actually came to do was
 * below all of it. Those readings are not wrong, they are just not the
 * question you open this screen with at eight in the morning; they now live
 * one tap away behind the chart icon, and what is left here is a day you can
 * finish.
 */
export function HabitsBoard({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const habits = state.habits;

  const [selected, setSelected] = useState(today);
  const [adding, setAdding] = useState(false);

  // Every habit, every day — the ones this day does not ask for sit last, still
  // tickable, rather than vanishing from a list you came to see whole.
  const items = useMemo(() => allHabitsForDay(habits, selected), [habits, selected]);

  // The future is not a thing you can have done yet, so its cards are shown
  // but not tickable — the same rule the month calendar has always had.
  const locked = selected > today;
  const done = items.filter((item) => item.day.status === "done").length;
  const asked = items.filter((item) => item.day.status !== "off").length;

  // Editing lives on the habit's own screen, behind the pencil; this board
  // only ever creates.
  const submit = (patch: HabitPatch) => {
    dispatch({
      type: "addHabit",
      habit: {
        id: newId(),
        marks: [],
        createdAt: new Date().toISOString(),
        ...patch,
      },
    });
    setAdding(false);
  };

  return (
    <>
      <PageHeader
        title={
          // The charts sit *beside* the title rather than over in the controls:
          // they are the other half of this screen, not a thing you do to it.
          <span className="flex items-center gap-2.5">
            Habits
            <Link
              href="/habits/stats"
              aria-label="Statistics"
              title="Statistics"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-2 hover:bg-line hover:text-ink"
            >
              <Icon name="chart" size={16} />
            </Link>
          </span>
        }
        actions={
          <Button icon={<Icon name="plus" size={15} />} onClick={() => setAdding(true)}>
            Add habit
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        {habits.length === 0 ? (
          <Card>
            <CardHead title="Nothing tracked yet" />
            <Empty>
              A habit here is a cadence and nothing else: how often, on which
              days. Give it an icon and a colour and the day becomes a handful
              of cards you tick, rather than a list you read.
            </Empty>
            <div className="border-t border-line px-4 py-3 sm:px-5">
              <Button onClick={() => dispatch({ type: "seedSampleHabits" })}>
                Load sample habits
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <WeekStrip
              habits={habits}
              selected={selected}
              today={today}
              onSelect={setSelected}
            />

            <section aria-labelledby="day-heading" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="day-heading" className="text-[13.5px] font-medium text-ink">
                  {selected === today ? "Today" : formatLongDate(selected)}
                </h2>
                {asked > 0 && (
                  <span className="text-[12.5px] text-ink-3 tnum">
                    {done} of {asked} done
                  </span>
                )}
              </div>

              {/* Two columns from the narrowest phone up: a card is an icon, a
                  name and a ring, and one per row left most of it empty. */}
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {items.map(({ habit, day }) => (
                  <HabitTile
                    key={habit.id}
                    habit={habit}
                    day={day}
                    // Nothing to tick ahead of today, or before the habit began.
                    locked={locked || selected < habit.startDate}
                    onToggle={() =>
                      dispatch({
                        type: "toggleHabit",
                        habitId: habit.id,
                        dateKey: selected,
                      })
                    }
                  />
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      {adding && (
        <HabitForm
          key="new"
          mode="add"
          today={today}
          onCancel={() => setAdding(false)}
          onSubmit={submit}
        />
      )}
    </>
  );
}

/**
 * One habit on one day: its icon, its name, what it means, and a ring to fill.
 *
 * Two targets, because there are two things to do with a habit and they are
 * not the same size. The ring is the tick — the action you came for, at the
 * corner your thumb is already near. The rest of the card opens the habit's
 * own screen, where its history, editing and deleting live: a destructive
 * control on a card you tap twenty times a week is a mistake waiting for a
 * Monday morning.
 *
 * A kept habit drops its colour entirely. Greying out is the strongest "this
 * one is finished" available without a badge, and it leaves the colour on the
 * cards that still want something from you.
 */
function HabitTile({
  habit,
  day,
  locked,
  onToggle,
}: {
  habit: Habit;
  day: HabitDay;
  locked: boolean;
  onToggle: () => void;
}) {
  const done = day.status === "done";
  const face = swatch(habit.color);
  const detail = habit.description.trim() || day.detail;

  return (
    <li
      // A kept card is grey by class; an outstanding one is filled by the
      // colour the user picked, which can only arrive as a value.
      style={done ? undefined : { backgroundColor: face.fill, color: face.fg }}
      className={
        "relative flex min-h-[156px] min-w-0 flex-col justify-between gap-3 rounded-[var(--radius-card)] p-3.5 sm:p-4 " +
        (done ? "bg-surface-3 text-ink-3" : "shadow-card")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="text-[24px] leading-none">
            {habit.icon}
          </span>
        </span>

        <button
          type="button"
          onClick={onToggle}
          disabled={locked}
          aria-pressed={done}
          aria-label={`${done ? "Unmark" : "Mark"} ${habit.name}`}
          // Above the card-wide link, so the tick never opens the habit.
          className="relative z-10 -m-1.5 shrink-0 rounded-full p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span
            aria-hidden="true"
            className={
              "flex size-[26px] items-center justify-center rounded-full border-2 " +
              (done ? "border-ink bg-ink text-surface" : "border-current opacity-70")
            }
          >
            {done && <Icon name="check" size={14} />}
          </span>
        </button>
      </div>

      {/* The name is the link, and its ::after stretches over the whole card
          so any tap outside the ring opens the habit. */}
      <Link
        href={`/habits/${habit.id}`}
        className="min-w-0 text-left after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
      >
        <span
          className={
            "block truncate text-[15px] font-semibold tracking-[-0.01em] " +
            (done ? "line-through" : "")
          }
        >
          {habit.name}
        </span>
        <span className="mt-0.5 block truncate text-[12px] opacity-80">{detail}</span>
      </Link>
    </li>
  );
}
