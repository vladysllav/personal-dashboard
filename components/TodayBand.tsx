"use client";

import { useMemo, useRef, useState } from "react";
import { formatShortDate, isoAtDate } from "@/lib/dates";
import { formatValue } from "@/lib/format";
import { currentValue, deriveGoal } from "@/lib/goals";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { Icon } from "./Icon";
import { TickChip } from "./TickChip";
import { Alert, Button, Card, CardHead, Empty, Field, Input, Select } from "./ui";

/**
 * The capture band: the two things done every single day, side by side and
 * above everything that only gets read. Logging is the product, so it gets the
 * best real estate and the shortest path.
 */
export function TodayBand({ today }: { today: string }) {
  const { state, dispatch, syncError } = useStore();
  const marked = state.habits.filter((h) => h.marks.includes(today)).length;

  return (
    <section aria-labelledby="today-heading" className="animate-rise">
      <h2 id="today-heading" className="visually-hidden">
        Log today
      </h2>

      {syncError && (
        <div className="mb-4">
          <Alert>{syncError}</Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead
            title="Habits today"
            right={
              state.habits.length > 0 ? (
                <span className="text-[13px] text-ink-3 tnum">
                  {marked} of {state.habits.length} marked
                </span>
              ) : undefined
            }
          />
          {state.habits.length === 0 ? (
            <Empty>Add a habit below and it will appear here every day.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-2 p-4 sm:p-5">
              {state.habits.map((habit) => (
                <li key={habit.id}>
                  <TickChip
                    done={habit.marks.includes(today)}
                    srSuffix="today"
                    onClick={() =>
                      dispatch({
                        type: "toggleHabit",
                        habitId: habit.id,
                        dateKey: today,
                      })
                    }
                  >
                    {habit.name}
                  </TickChip>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <QuickLog today={today} />
      </div>
    </section>
  );
}

function QuickLog({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const [goalId, setGoalId] = useState<string>("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ goalId: string; text: string } | null>(
    null,
  );
  const valueRef = useRef<HTMLInputElement>(null);

  // Default to whatever needs attention most, so the common case is zero
  // selection work: open the page, type a number, press enter.
  const ordered = useMemo(() => {
    return [...state.goals].sort((a, b) => {
      const da = deriveGoal(a, today);
      const db = deriveGoal(b, today);
      return da.stepsDelta - db.stepsDelta;
    });
  }, [state.goals, today]);

  const selected: Goal | undefined =
    ordered.find((g) => g.id === goalId) ?? ordered[0];

  if (!selected) {
    return (
      <Card>
        <CardHead title="Log progress" />
        <Empty>Nothing to log yet — add a goal and it becomes available here.</Empty>
      </Card>
    );
  }

  const nextMilestone =
    selected.kind === "milestone"
      ? selected.milestones.find((m) => !m.done)
      : undefined;

  function commitValue(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;

    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed)) {
      setError("Enter a number.");
      return;
    }
    if (selected.kind === "accumulate" && parsed === 0) {
      setError("Zero would not change anything.");
      return;
    }

    setError(null);
    dispatch({
      type: "logGoal",
      goalId: selected.id,
      value: parsed,
      at: isoAtDate(date),
    });
    // Pin the selection. Logging changes the pace ranking, and without this
    // the "most behind" default would silently retarget the next entry at a
    // different goal than the one just logged.
    setGoalId(selected.id);
    const when = date === today ? "" : ` on ${formatShortDate(date)}`;
    setReceipt({
      goalId: selected.id,
      text:
        selected.kind === "accumulate"
          ? `Added ${formatValue(parsed, selected.unit)} to ${selected.name}${when}`
          : `${selected.name} set to ${formatValue(parsed, selected.unit)}${when}`,
    });
    setValue("");
    valueRef.current?.focus();
  }

  function commitMilestone() {
    if (!selected || !nextMilestone) return;
    dispatch({
      type: "toggleMilestone",
      goalId: selected.id,
      milestoneId: nextMilestone.id,
    });
    setReceipt(null);
  }

  return (
    <Card>
      <CardHead title="Log progress" />

      <form className="flex flex-col gap-3 p-4 sm:p-5" onSubmit={commitValue} noValidate>
        <Field label="Goal" htmlFor="log-goal">
          <Select
            id="log-goal"
            size="lg"
            value={selected.id}
            onChange={(e) => {
              setGoalId(e.target.value);
              setError(null);
              setReceipt(null);
            }}
          >
            {ordered.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>

        {selected.kind === "milestone" ? (
          nextMilestone ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[13px] text-ink-2">
                Next up: <strong className="font-medium text-ink">{nextMilestone.label}</strong>
              </p>
              <Button
                variant="primary"
                className="ml-auto"
                icon={<Icon name="check" size={15} />}
                onClick={commitMilestone}
              >
                Mark done
              </Button>
            </div>
          ) : (
            <p className="text-[13px] text-ink-3">Every milestone is done.</p>
          )
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <Field
                label={selected.kind === "accumulate" ? "Add" : "New reading"}
                htmlFor="log-value"
                className="flex-1 basis-[140px]"
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="log-value"
                    ref={valueRef}
                    size="lg"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    invalid={Boolean(error)}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      setError(null);
                    }}
                    placeholder={
                      selected.kind === "accumulate"
                        ? "0"
                        : String(currentValue(selected))
                    }
                  />
                  {selected.unit && (
                    <span className="shrink-0 text-[13px] text-ink-3">
                      {selected.unit}
                    </span>
                  )}
                </div>
              </Field>

              <Field label="Date" htmlFor="log-date" className="basis-[152px]">
                <Input
                  id="log-date"
                  size="lg"
                  type="date"
                  max={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>

              <Button type="submit" variant="primary" className="py-2.5">
                Log
              </Button>
            </div>

            {error && <Alert>{error}</Alert>}
          </>
        )}

        {receipt && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[8px] bg-accent-50 px-3 py-2 text-[13px] text-accent-700">
            <span className="min-w-0">{receipt.text}</span>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[13px] font-medium text-accent-700 hover:bg-accent-100"
              onClick={() => {
                dispatch({ type: "undoLastEntry", goalId: receipt.goalId });
                setReceipt(null);
              }}
            >
              <Icon name="undo" size={14} />
              Undo
            </button>
          </p>
        )}
      </form>
    </Card>
  );
}
