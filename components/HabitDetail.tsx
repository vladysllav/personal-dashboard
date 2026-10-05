"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addMonths, formatLongDate, monthKey } from "@/lib/dates";
import { cadenceLabel, deriveHabitStats } from "@/lib/habits";
import { swatch } from "@/lib/palette";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { HabitPatch } from "@/lib/sync";
import { PageHeader } from "./AppShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { Donut } from "./Donut";
import { HabitCalendar } from "./HabitCalendar";
import { HabitForm } from "./HabitForm";
import { Icon } from "./Icon";
import { Card, CardHead } from "./ui";

/**
 * One habit, opened from its card: what it is, how well it has been kept since
 * it started, and every day of it on a calendar you can still tick.
 *
 * Editing lives behind the pencil in the header rather than on the card. The
 * card is tapped twenty times a week to tick it; this screen is where you come
 * on purpose, which is the right distance for changing what the habit asks.
 */
export function HabitDetail({ habitId }: { habitId: string }) {
  const { state, ready, dispatch } = useStore();
  const today = useToday();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [month, setMonth] = useState<string | null>(null);

  if (!ready || !today) return null;

  const habit = state.habits.find((h) => h.id === habitId);

  if (!habit) {
    return (
      <>
        <PageHeader
          title="This habit doesn’t exist."
          back={{ href: "/habits", label: "Habits" }}
        />
        <Card className="p-5">
          <p className="max-w-[68ch] text-[13px] leading-relaxed text-ink-2">
            It may have been deleted. Head back to the list to pick another.
          </p>
          <Link
            href="/habits"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-700 hover:text-accent-600"
          >
            <Icon name="arrowLeft" size={15} />
            All habits
          </Link>
        </Card>
      </>
    );
  }

  const stats = deriveHabitStats(habit, today);
  const { plan } = stats;
  const face = swatch(habit.color);
  const shown = month ?? monthKey(today);

  // The ring's two halves, in whole marks. "Planned" is what the cadence has
  // asked for on the days already closed — today is not a miss until it is over.
  const planned = Math.round(stats.expected);
  const kept = Math.min(stats.done, planned);
  const missed = Math.max(0, planned - stats.done);
  const extra = Math.max(0, stats.done - planned);

  const submit = (patch: HabitPatch) => {
    dispatch({ type: "editHabit", habitId: habit.id, patch });
    setEditing(false);
  };

  return (
    <>
      <PageHeader
        back={{ href: "/habits", label: "Habits" }}
        title={
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              style={{ backgroundColor: face.fill }}
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[17px] leading-none"
            >
              {habit.icon}
            </span>
            <span className="truncate">{habit.name}</span>
            {/* Beside the name rather than in the controls, so it never wraps
                onto a line of its own on a phone. */}
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${habit.name}`}
              title="Edit"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-2 hover:bg-line hover:text-ink"
            >
              <Icon name="edit" size={16} />
            </button>
          </span>
        }
        subtitle={`${cadenceLabel(plan.frequency)} · since ${formatLongDate(plan.startDate)}`}
      />

      <div className="flex flex-col gap-4">
        {habit.description.trim() && (
          <Card className="px-4 py-3.5 sm:px-5">
            <p className="max-w-[68ch] whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">
              {habit.description}
            </p>
          </Card>
        )}

        <div className="grid items-start gap-4 md:grid-cols-2">
          <Card aria-labelledby="consistency-heading">
            <CardHead
              id="consistency-heading"
              title="Consistency"
              hint={`Kept against planned, from ${formatLongDate(plan.startDate)} to today`}
            />
            <div className="flex flex-wrap items-center justify-center gap-5 p-4 sm:p-5">
              <Donut
                progress={stats.adherence}
                plannedProgress={0}
                // A share, not a verdict — the same accent the overview ring uses.
                status="on-pace"
                size={140}
                caption="consistency"
              />
              <dl className="flex min-w-[128px] flex-1 flex-col gap-3">
                <Legend swatchClass="bg-accent-500 border border-accent-700" label="Tracked" value={kept} />
                <Legend swatchClass="bg-surface-3 border border-line-strong" label="Missed" value={missed} />
                <Legend
                  swatchClass="border border-dashed border-line-strong"
                  label="Planned"
                  value={planned}
                  note={extra > 0 ? `+${extra} beyond plan` : undefined}
                />
              </dl>
            </div>
            <dl className="grid grid-cols-2 gap-2 border-t border-line px-4 py-3 sm:px-5">
              <Figure
                label="Current streak"
                value={`${stats.streak} ${stats.streakUnit}${stats.streak === 1 ? "" : "s"}`}
              />
              <Figure
                label="Best streak"
                value={`${stats.bestStreak} ${stats.streakUnit}${stats.bestStreak === 1 ? "" : "s"}`}
              />
            </dl>
          </Card>

          <Card aria-labelledby="calendar-heading">
            <CardHead id="calendar-heading" title="Calendar" hint="Tap a day to mark or unmark it" />
            <div className="px-4 py-4 sm:px-5">
              <HabitCalendar
                name={habit.name}
                month={shown}
                marks={new Set(habit.marks)}
                plan={plan}
                today={today}
                onToggle={(day) =>
                  dispatch({ type: "toggleHabit", habitId: habit.id, dateKey: day })
                }
                onMonthChange={(delta) => setMonth(monthKey(addMonths(shown, delta)))}
              />
            </div>
          </Card>
        </div>
      </div>

      {editing && !pendingDelete && (
        <HabitForm
          key={habit.id}
          mode="edit"
          today={today}
          initial={habit}
          onCancel={() => setEditing(false)}
          onDelete={() => setPendingDelete(true)}
          onSubmit={submit}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${habit.name}”?`}
          body="This removes the habit and its whole history of marks. It can’t be undone."
          confirmLabel="Delete habit"
          onCancel={() => setPendingDelete(false)}
          onConfirm={() => {
            dispatch({ type: "removeHabit", habitId: habit.id });
            router.replace("/habits");
          }}
        />
      )}
    </>
  );
}

function Legend({
  swatchClass,
  label,
  value,
  note,
}: {
  swatchClass: string;
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden="true" className={`size-3 shrink-0 rounded-[4px] ${swatchClass}`} />
      <dt className="text-[12.5px] text-ink-2">{label}</dt>
      <dd className="ml-auto flex items-baseline gap-1.5">
        {note && <span className="text-[11px] text-ink-3">{note}</span>}
        <span className="text-[17px] font-semibold leading-none tracking-[-0.01em] text-ink tnum">
          {value}
        </span>
      </dd>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="mt-1 truncate text-[11.5px] text-ink-3">{label}</dt>
      <dd className="text-[17px] font-semibold leading-none tracking-[-0.01em] text-ink tnum">{value}</dd>
    </div>
  );
}
