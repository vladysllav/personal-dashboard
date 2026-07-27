"use client";

import Link from "next/link";
import { useState } from "react";
import { formatLongDate } from "@/lib/dates";
import { describeGoal } from "@/lib/describe";
import { formatRange, formatValue } from "@/lib/format";
import { sortByUrgency, type GoalDerived } from "@/lib/goals";
import { useStore } from "@/lib/store";
import type { Goal, GoalView } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { Donut } from "./Donut";
import { GoalForm } from "./GoalForm";
import { Icon } from "./Icon";
import { PaceBar } from "./PaceBar";
import { TickChip } from "./TickChip";
import styles from "./GoalSection.module.css";

export function GoalSection({ today }: { today: string }) {
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
    <section aria-labelledby="goals-heading">
      <div className="section-head">
        <h2 className="section-title" id="goals-heading">
          Goals
        </h2>
        <div className={styles.headActions}>
          {ranked.length > 0 && (
            <ViewToggle
              value={view}
              onChange={(v) => dispatch({ type: "setGoalView", view: v })}
            />
          )}
          {!adding && !editing && (
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setAdding(true)}
            >
              <Icon name="plus" size={16} />
              Add goal
            </button>
          )}
        </div>
      </div>

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
        <p className={styles.hint}>
          No goals yet. Add one with a start value, a target, and the number of
          steps to get there.
        </p>
      ) : view === "ring" ? (
        <ul className={styles.ringGrid}>
          {ranked.map(({ goal, derived }) => (
            <RingCard
              key={goal.id}
              goal={goal}
              derived={derived}
              onEdit={() => setEditingId(goal.id)}
              onDelete={() => setPendingDelete(goal)}
            />
          ))}
        </ul>
      ) : (
        <ul className={styles.list}>
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
    </section>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: GoalView;
  onChange: (v: GoalView) => void;
}) {
  return (
    <div className={styles.viewToggle} role="group" aria-label="Goal layout">
      <button
        type="button"
        className={styles.viewBtn}
        data-active={value === "bar"}
        aria-pressed={value === "bar"}
        onClick={() => onChange("bar")}
      >
        <Icon name="bars" size={16} />
        <span className="visually-hidden">Pace bars</span>
      </button>
      <button
        type="button"
        className={styles.viewBtn}
        data-active={value === "ring"}
        aria-pressed={value === "ring"}
        onClick={() => onChange("ring")}
      >
        <Icon name="ring" size={16} />
        <span className="visually-hidden">Rings</span>
      </button>
    </div>
  );
}

/** The edit + delete cluster shared by both layouts. */
function RowActions({
  goal,
  onEdit,
  onDelete,
  className,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div className={`${styles.act} ${className ?? ""}`}>
      <button
        type="button"
        className={styles.iconBtn}
        onClick={onEdit}
        aria-label={`Edit ${goal.name}`}
      >
        <Icon name="edit" size={15} />
      </button>
      <button
        type="button"
        className={styles.iconBtn}
        onClick={onDelete}
        aria-label={`Delete ${goal.name}`}
      >
        <Icon name="close" size={14} />
      </button>
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
    <li className={styles.rowWrap}>
      <div className={styles.row}>
        <div className={styles.name}>
          <h3 className={styles.title}>
            <Link href={`/goals/${goal.id}`} className={styles.nameLink}>
              {goal.name}
              <Icon name="chevronRight" size={15} className={styles.nameChevron} />
            </Link>
          </h3>
          <p className={`${styles.position} num`}>
            {formatRange(derived.current, goal.pointB, goal.unit)}
          </p>
        </div>

        <div className={styles.bar}>
          <PaceBar
            progress={derived.progress}
            plannedProgress={derived.plannedProgress}
            status={derived.status}
            label={copy.aria}
          />
          <div className={`${styles.barMeta} num`}>
            <span className={styles.barMetaPlan}>{copy.plan}</span>
            <span>{formatLongDate(derived.deadline)}</span>
          </div>
        </div>

        <div className={styles.pace}>
          <p className={styles.paceHead} data-tone={derived.status}>
            <span>{copy.headline}</span>
            {copy.points && (
              <span className={`${styles.points} num`}>{copy.points}</span>
            )}
          </p>
          <p className={`${styles.detail} num`}>{copy.detail}</p>
        </div>

        <RowActions goal={goal} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {goal.kind === "milestone" && goal.milestones.length > 0 && (
        <ul className={styles.milestones}>
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

function RingCard({
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
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <Link href={`/goals/${goal.id}`} className={styles.nameLink}>
            {goal.name}
            <Icon name="chevronRight" size={15} className={styles.nameChevron} />
          </Link>
        </h3>
        <RowActions
          goal={goal}
          onEdit={onEdit}
          onDelete={onDelete}
          className={styles.cardAct}
        />
      </div>

      <div className={styles.cardBody}>
        <Donut
          progress={derived.progress}
          plannedProgress={derived.plannedProgress}
          status={derived.status}
          size={124}
          caption={copy.headline}
        />
        <div className={styles.cardFigures}>
          <span className={`${styles.bigTarget} num`}>
            {formatValue(goal.pointB, goal.unit)}
          </span>
          <span className={styles.bigTargetLabel}>target</span>
          <p className={`${styles.cardDetail} num`} data-tone={derived.status}>
            {copy.detail}
          </p>
        </div>
      </div>
    </li>
  );
}
