"use client";

import Link from "next/link";
import { useState } from "react";
import { formatLongDate } from "@/lib/dates";
import { describeGoal } from "@/lib/describe";
import { formatRange, formatValue } from "@/lib/format";
import { sortByUrgency, type GoalDerived } from "@/lib/goals";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { Donut } from "./Donut";
import { GoalForm } from "./GoalForm";
import { Icon } from "./Icon";
import { PaceBar } from "./PaceBar";
import { StatusBadge, statusText } from "./StatusBadge";
import { TickChip } from "./TickChip";
import { Button, Card, CardHead, Empty, IconButton, Note, Seg } from "./ui";

/**
 * Every goal, ranked by what needs attention first. Two readings of the same
 * data: dense rows with a bullet chart each, or a grid of rings. Both keep the
 * plan visible next to the fact — a percentage on its own always looks fine.
 */
export function GoalSection({
  today,
  title = "Goals",
}: {
  today: string;
  title?: string;
}) {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);
  const view = state.prefs.goalView;

  const ranked = sortByUrgency(state.goals, today);
  const editing = editingId
    ? state.goals.find((g) => g.id === editingId) ?? null
    : null;

  const empty = ranked.length === 0 && !adding && !editing;

  return (
    <Card className="overflow-hidden" aria-labelledby="goals-heading">
      <CardHead
        id="goals-heading"
        title={title}
        right={
          <>
            {ranked.length > 0 && (
              <Seg
                label="Goal layout"
                value={view}
                onChange={(v) => dispatch({ type: "setGoalView", view: v })}
                options={[
                  { value: "bar", label: "Pace", icon: "bars" },
                  { value: "ring", label: "Rings", icon: "ring" },
                ]}
              />
            )}
            {!adding && !editing && (
              <Button
                icon={<Icon name="plus" size={15} />}
                onClick={() => setAdding(true)}
              >
                Add goal
              </Button>
            )}
          </>
        }
      />

      {adding && (
        <GoalForm
          mode="add"
          onCancel={() => setAdding(false)}
          onAdd={(goal) => {
            dispatch({ type: "addGoal", goal });
            setAdding(false);
          }}
        />
      )}

      {editing && (
        <GoalForm
          mode="edit"
          initial={editing}
          onCancel={() => setEditingId(null)}
          onEdit={(patch) => {
            dispatch({ type: "editGoal", goalId: editing.id, patch });
            setEditingId(null);
          }}
        />
      )}

      {empty ? (
        <Empty>
          No goals yet. Add one with a start value, a target, and the number of
          steps to get there.
        </Empty>
      ) : view === "ring" ? (
        <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ goal, derived }) => (
            <RingCell
              key={goal.id}
              goal={goal}
              derived={derived}
              onEdit={() => setEditingId(goal.id)}
              onDelete={() => setPendingDelete(goal)}
            />
          ))}
        </ul>
      ) : (
        <>
          <ul className="divide-y divide-dashed divide-line">
            {ranked.map(({ goal, derived }) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                derived={derived}
                onEdit={() => setEditingId(goal.id)}
                onDelete={() => setPendingDelete(goal)}
              />
            ))}
          </ul>
          <Note>
            The bar is where you are; the upright marker is where the plan
            expects you today. The gap between them is the whole read.
          </Note>
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.name}”?`}
          body="This removes the goal and every entry logged against it. It can’t be undone."
          confirmLabel="Delete goal"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            dispatch({ type: "removeGoal", goalId: pendingDelete.id });
            setPendingDelete(null);
          }}
        />
      )}
    </Card>
  );
}

function GoalLink({ goal }: { goal: Goal }) {
  return (
    <Link
      href={`/goals/${goal.id}`}
      className="group inline-flex items-center gap-1 text-[13.5px] font-medium text-ink hover:text-accent-700"
    >
      <span className="truncate">{goal.name}</span>
      <Icon
        name="chevronRight"
        size={14}
        className="shrink-0 text-ink-3 group-hover:text-accent-600"
      />
    </Link>
  );
}

function RowActions({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <IconButton name="edit" label={`Edit ${goal.name}`} onClick={onEdit} />
      <IconButton
        name="close"
        label={`Delete ${goal.name}`}
        size={14}
        onClick={onDelete}
      />
    </div>
  );
}

function GoalRow({
  goal,
  derived,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  derived: GoalDerived;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { dispatch } = useStore();
  const copy = describeGoal(goal, derived);

  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="grid items-center gap-x-5 gap-y-3 lg:grid-cols-[minmax(150px,1fr)_minmax(180px,1.4fr)_minmax(150px,0.9fr)_auto]">
        <div className="min-w-0">
          <h3 className="min-w-0">
            <GoalLink goal={goal} />
          </h3>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-3 tnum">
            {formatRange(derived.current, goal.pointB, goal.unit)}
          </p>
        </div>

        <div className="min-w-0">
          <PaceBar
            progress={derived.progress}
            plannedProgress={derived.plannedProgress}
            status={derived.status}
            label={copy.aria}
          />
          <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[11.5px] text-ink-3 tnum">
            <span className="truncate">{copy.plan}</span>
            <span>{formatLongDate(derived.deadline)}</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={derived.status} hint={copy.plan}>
              {copy.headline}
            </StatusBadge>
            {copy.points && (
              <span className={`text-[12.5px] tnum ${statusText(derived.status)}`}>
                {copy.points}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[12.5px] text-ink-2 tnum">
            {copy.detail}
          </p>
        </div>

        <div className="justify-self-end">
          <RowActions goal={goal} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      {goal.kind === "milestone" && goal.milestones.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {goal.milestones.map((m) => (
            <li key={m.id}>
              <TickChip
                done={m.done}
                size="sm"
                srSuffix={`Milestone of ${goal.name}`}
                onClick={() =>
                  dispatch({
                    type: "toggleMilestone",
                    goalId: goal.id,
                    milestoneId: m.id,
                  })
                }
              >
                {m.label}
              </TickChip>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function RingCell({
  goal,
  derived,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  derived: GoalDerived;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const copy = describeGoal(goal, derived);

  return (
    <li className="flex flex-col bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0">
          <GoalLink goal={goal} />
        </h3>
        <RowActions goal={goal} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="mt-3 flex items-center gap-4">
        <Donut
          progress={derived.progress}
          plannedProgress={derived.plannedProgress}
          status={derived.status}
          size={116}
        />
        <div className="min-w-0">
          <span className="block text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink tnum">
            {formatValue(goal.pointB, goal.unit)}
          </span>
          <span className="mt-1 block text-[11.5px] text-ink-3">target</span>
          <div className="mt-3">
            <StatusBadge status={derived.status} hint={copy.plan}>
              {copy.headline}
            </StatusBadge>
          </div>
          <p className="mt-1.5 text-[12.5px] text-ink-2 tnum">{copy.detail}</p>
        </div>
      </div>
    </li>
  );
}
