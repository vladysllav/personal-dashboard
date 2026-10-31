"use client";

import { useState } from "react";
import { addMonths, formatMonthYear, monthKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { HabitPatch } from "@/lib/sync";
import type { Habit } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { HabitCard } from "./HabitCard";
import { HabitForm } from "./HabitForm";
import { HabitOverview } from "./HabitOverview";
import { Icon } from "./Icon";
import { Card, CardHead, Empty } from "./ui";

/**
 * Everything the habits screen used to open with, on a screen of its own.
 *
 * The split is not tidying. "What do I do now" and "how have I been doing" are
 * two different questions asked at two different moments, and putting the
 * second one above the first meant scrolling past a ring and two bar charts
 * every morning to reach four checkboxes. Here the charts have the room to be
 * read, and every habit's month is underneath them — still tickable, because
 * the commonest reason to open this page is noticing you forgot Sunday.
 */
export function HabitStats() {
  const { state, ready, dispatch } = useStore();
  const today = useToday();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);
  const [chosenMonth, setMonth] = useState<string | null>(null);

  if (!ready || !today) return null;

  // Every figure on the page reads one calendar month, this one by default.
  const month = chosenMonth ?? `${monthKey(today)}-01`;
  const firstMonth = monthKey(state.habits.map((h) => h.startDate).sort()[0] ?? today);

  const habits = state.habits;
  const editing = editingId ? habits.find((h) => h.id === editingId) ?? null : null;

  const submit = (patch: HabitPatch) => {
    if (!editing) return;
    dispatch({ type: "editHabit", habitId: editing.id, patch });
    setEditingId(null);
  };

  return (
    <>
      <PageHeader
        title="Statistics"
        subtitle={
          habits.length > 0
            ? `${habits.length} ${habits.length === 1 ? "habit" : "habits"} tracked`
            : undefined
        }
        back={{ href: "/habits", label: "Habits" }}
      />

      {habits.length === 0 ? (
        <Card>
          <CardHead title="Nothing to measure yet" />
          <Empty>
            Statistics are made of marks. Add a habit and tick it for a few
            days, and the ring, the daily bars and the weekly quotas will have
            something to say.
          </Empty>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <MonthSwitcher
            month={month}
            canBack={monthKey(month) > firstMonth}
            canForward={monthKey(month) < monthKey(today)}
            onChange={(delta) => setMonth(addMonths(month, delta))}
            onToday={() => setMonth(null)}
          />

          <HabitOverview habits={habits} today={today} month={month} />

          <ul className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                today={today}
                month={month}
                onEdit={() => setEditingId(habit.id)}
                onDelete={() => setPendingDelete(habit)}
              />
            ))}
          </ul>
        </div>
      )}

      {editing && !pendingDelete && (
        <HabitForm
          key={editing.id}
          mode="edit"
          today={today}
          initial={editing}
          onCancel={() => setEditingId(null)}
          onDelete={() => setPendingDelete(editing)}
          onSubmit={submit}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.name}”?`}
          body="This removes the habit and its whole history of marks. It can’t be undone."
          confirmLabel="Delete habit"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            dispatch({ type: "removeHabit", habitId: pendingDelete.id });
            setPendingDelete(null);
            setEditingId(null);
          }}
        />
      )}
    </>
  );
}

/** The month every figure below reads — the one control that moves them all. */
function MonthSwitcher({
  month,
  canBack,
  canForward,
  onChange,
  onToday,
}: {
  month: string;
  canBack: boolean;
  canForward: boolean;
  onChange: (delta: number) => void;
  onToday: () => void;
}) {
  const button =
    "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-surface-3 text-ink hover:bg-line disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-surface-3";
  return (
    <Card className="flex items-center gap-2 p-2">
      <button
        type="button"
        aria-label="Previous month"
        disabled={!canBack}
        onClick={() => onChange(-1)}
        className={button}
      >
        <Icon name="chevronLeft" size={20} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <h2 aria-live="polite" className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {formatMonthYear(month)}
        </h2>
        {canForward ? (
          <button
            type="button"
            onClick={onToday}
            className="text-[11.5px] font-medium text-accent-700 hover:text-ink"
          >
            Back to this month
          </button>
        ) : (
          <span className="text-[11.5px] text-ink-3">This month</span>
        )}
      </div>
      <button
        type="button"
        aria-label="Next month"
        disabled={!canForward}
        onClick={() => onChange(1)}
        className={button}
      >
        <Icon name="chevronRight" size={20} />
      </button>
    </Card>
  );
}
