"use client";

import { useMemo, useState } from "react";
import { overallStats } from "@/lib/habits";
import { newId, useStore } from "@/lib/store";
import type { HabitPatch } from "@/lib/sync";
import type { Habit } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { HabitCard } from "./HabitCard";
import { HabitForm } from "./HabitForm";
import { HabitOverview } from "./HabitOverview";
import { Icon } from "./Icon";
import { Button, Card, CardHead, Empty } from "./ui";

/**
 * The habits screen: the whole picture first, then one card per habit.
 *
 * That order is deliberate. The aggregate answers "how am I doing" in a second
 * and needs no reading; the cards below are where you act, and each is a month
 * you can tick without leaving the page.
 */
export function HabitsBoard({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const habits = state.habits;

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);

  const overall = useMemo(() => overallStats(habits, today), [habits, today]);
  const editing = editingId ? habits.find((h) => h.id === editingId) ?? null : null;
  const formOpen = adding || editing !== null;

  const closeForm = () => {
    setAdding(false);
    setEditingId(null);
  };

  const submit = (patch: HabitPatch) => {
    if (editing) {
      dispatch({ type: "editHabit", habitId: editing.id, patch });
    } else {
      dispatch({
        type: "addHabit",
        habit: {
          id: newId(),
          marks: [],
          createdAt: new Date().toISOString(),
          ...patch,
        },
      });
    }
    closeForm();
  };

  return (
    <>
      <PageHeader
        title="Habits"
        subtitle={
          habits.length > 0
            ? `${overall.markedToday} of ${habits.length} marked today · ${Math.round(
                overall.adherence * 100,
              )}% of the plan kept so far`
            : undefined
        }
        actions={
          !formOpen ? (
            <Button icon={<Icon name="plus" size={15} />} onClick={() => setAdding(true)}>
              Add habit
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        {formOpen && (
          <HabitForm
            key={editing?.id ?? "new"}
            mode={editing ? "edit" : "add"}
            today={today}
            initial={editing ?? undefined}
            onCancel={closeForm}
            onSubmit={submit}
          />
        )}

        {habits.length === 0 ? (
          !adding && (
            <Card>
              <CardHead title="Nothing tracked yet" />
              <Empty>
                A habit here is a commitment with a shape: how often, and for how
                long. &ldquo;Gym, 4× a week, for 12 weeks&rdquo; is 48 sessions —
                a total you can watch fill up, rather than a tick that only ever
                tells you about today.
              </Empty>
              <div className="border-t border-line px-4 py-3 sm:px-5">
                <Button onClick={() => dispatch({ type: "seedSampleHabits" })}>
                  Load sample habits
                </Button>
              </div>
            </Card>
          )
        ) : (
          <>
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
          </>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.name}”?`}
          body="This removes the habit and its whole history of marks. It can’t be undone."
          confirmLabel="Delete habit"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            dispatch({ type: "removeHabit", habitId: pendingDelete.id });
            setPendingDelete(null);
          }}
        />
      )}
    </>
  );
}
