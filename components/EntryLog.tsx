"use client";

import { useState } from "react";
import { formatLongDate, toDateKey, withDate } from "@/lib/dates";
import { formatValue } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Goal, GoalEntry } from "@/lib/types";
import { Icon } from "./Icon";
import styles from "./EntryLog.module.css";

/**
 * Every entry ever logged against a goal, newest first, each one editable in
 * place (value + date) or removable. Milestone goals keep no value entries, so
 * this renders nothing for them.
 */
export function EntryLog({ goal }: { goal: Goal }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (goal.kind === "milestone") return null;

  // A copy sorted by date desc; the stored array keeps insertion order so
  // "undo last" elsewhere still means "the one just added".
  const entries = [...goal.entries].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <section className={styles.section} aria-labelledby="log-history">
      <div className={styles.head}>
        <h2 id="log-history" className={styles.title}>
          Log history
        </h2>
        {entries.length > 0 && (
          <span className={`${styles.count} num`}>{entries.length}</span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>
          No entries yet. Everything you log against this goal shows up here.
        </p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) =>
            editingId === entry.id ? (
              <EditRow
                key={entry.id}
                goal={goal}
                entry={entry}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <ViewRow
                key={entry.id}
                goal={goal}
                entry={entry}
                onEdit={() => setEditingId(entry.id)}
              />
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function formatEntry(goal: Goal, value: number): string {
  if (goal.kind === "measure") return formatValue(value, goal.unit);
  // Accumulate: a delta reads as a signed change.
  const sign = value < 0 ? "−" : "+";
  return `${sign}${formatValue(Math.abs(value), goal.unit)}`;
}

function ViewRow({
  goal,
  entry,
  onEdit,
}: {
  goal: Goal;
  entry: GoalEntry;
  onEdit: () => void;
}) {
  const { dispatch } = useStore();

  return (
    <li className={styles.row}>
      <span className={`${styles.value} num`}>{formatEntry(goal, entry.value)}</span>
      <span className={`${styles.date} num`}>
        {formatLongDate(toDateKey(new Date(entry.at)))}
      </span>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onEdit}
          aria-label="Edit entry"
        >
          <Icon name="edit" size={15} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() =>
            dispatch({ type: "removeEntry", goalId: goal.id, entryId: entry.id })
          }
          aria-label="Delete entry"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </li>
  );
}

function EditRow({
  goal,
  entry,
  onDone,
}: {
  goal: Goal;
  entry: GoalEntry;
  onDone: () => void;
}) {
  const { dispatch } = useStore();
  const [value, setValue] = useState(String(entry.value));
  const [date, setDate] = useState(toDateKey(new Date(entry.at)));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isFinite(n) || value.trim() === "") return;
    dispatch({
      type: "editEntry",
      goalId: goal.id,
      entryId: entry.id,
      value: n,
      // Editing only the value keeps the original time-of-day; changing the
      // date carries that time onto the new day.
      at: date === toDateKey(new Date(entry.at)) ? entry.at : withDate(entry.at, date),
    });
    onDone();
  }

  return (
    <li className={styles.row}>
      <form className={styles.editForm} onSubmit={save}>
        <input
          className="input num"
          type="number"
          step="any"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Value"
          autoFocus
        />
        <input
          className="input num"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
        />
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        <button type="button" className="btn btn-quiet" onClick={onDone}>
          Cancel
        </button>
      </form>
    </li>
  );
}
