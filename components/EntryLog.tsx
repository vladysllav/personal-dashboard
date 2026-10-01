"use client";

import { useState } from "react";
import { formatLongDate, formatShortDate, toDateKey, withDate } from "@/lib/dates";
import { formatValue } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Goal, GoalEntry } from "@/lib/types";
import { Button, Card, CardHead, Empty, IconButton, Input } from "./ui";

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
    <Card className="overflow-hidden" aria-labelledby="log-history">
      <CardHead
        id="log-history"
        title="Log history"
        right={
          entries.length > 0 ? (
            <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[12.5px] text-ink-2 tnum">
              {entries.length}
            </span>
          ) : undefined
        }
      />

      {entries.length === 0 ? (
        <Empty>
          No entries yet. Everything you log against this goal shows up here.
        </Empty>
      ) : (
        <ul className="divide-y divide-dashed divide-line">
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
    </Card>
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

  const day = toDateKey(new Date(entry.at));

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-5">
      <span className="min-w-[72px] shrink-0 text-[13px] font-medium text-ink tnum sm:min-w-[104px]">
        {formatEntry(goal, entry.value)}
      </span>
      {/* A date clipped to "Saturday 19 Septem…" says less than the short form
          it had room for, so the phone gets the short form outright. */}
      <span className="min-w-0 flex-1 text-[13px] text-ink-3 tnum">
        <span className="sm:hidden">{formatShortDate(day)}</span>
        <span className="hidden sm:inline">{formatLongDate(day)}</span>
      </span>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton name="edit" label="Edit entry" onClick={onEdit} />
        <IconButton
          name="close"
          size={14}
          label="Delete entry"
          onClick={() =>
            dispatch({ type: "removeEntry", goalId: goal.id, entryId: entry.id })
          }
        />
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
    <li className="bg-accent-50/60 px-4 py-2.5 sm:px-5">
      <form className="flex flex-wrap items-center gap-2" onSubmit={save}>
        <div className="w-[120px]">
          <Input
            type="number"
            step="any"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Value"
            autoFocus
          />
        </div>
        <div className="w-[160px]">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
          />
        </div>
        <Button type="submit" variant="primary">
          Save
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </form>
    </li>
  );
}
