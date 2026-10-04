"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { HabitPatch } from "@/lib/sync";
import type { Habit } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { HabitCard } from "./HabitCard";
import { HabitForm } from "./HabitForm";
import { HabitOverview } from "./HabitOverview";
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

  if (!ready || !today) return null;

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
          <HabitOverview habits={habits} today={today} />

          <ul className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                today={today}
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
