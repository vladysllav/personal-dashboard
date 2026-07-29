"use client";

import { useMemo, useRef, useState } from "react";
import { formatShortDate, isoAtDate } from "@/lib/dates";
import { formatValue } from "@/lib/format";
import { currentValue, deriveGoal } from "@/lib/goals";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { Icon } from "./Icon";
import { TickChip } from "./TickChip";
import styles from "./TodayBand.module.css";

export function TodayBand({ today }: { today: string }) {
  const { state, dispatch, syncError } = useStore();
  const marked = state.habits.filter((h) => h.marks.includes(today)).length;

  return (
    <section className={styles.band} aria-labelledby="today-heading">
      <h2 id="today-heading" className="visually-hidden">
        Log today
      </h2>

      {syncError && (
        <p className={styles.alert} role="alert">
          <span className={styles.alertMark} aria-hidden="true">
            !
          </span>
          {syncError}
        </p>
      )}

      <div className={styles.pane}>
        <div className={styles.paneHead}>
          <h3 className={styles.paneTitle}>Habits today</h3>
          {state.habits.length > 0 && (
            <p className={`${styles.paneMeta} num`}>
              {marked} of {state.habits.length} marked
            </p>
          )}
        </div>

        {state.habits.length === 0 ? (
          <p className={styles.empty}>
            Add a habit below and it will appear here every day.
          </p>
        ) : (
          <ul className={styles.chips}>
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
      </div>

      <div className={`${styles.pane} ${styles.log}`}>
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
      <>
        <div className={styles.paneHead}>
          <h3 className={styles.paneTitle}>Log progress</h3>
        </div>
        <p className={styles.empty}>
          Nothing to log yet — add a goal and it becomes available here.
        </p>
      </>
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
    <>
      <div className={styles.paneHead}>
        <h3 className={styles.paneTitle}>Log progress</h3>
      </div>

      <form className={styles.form} onSubmit={commitValue} noValidate>
        <div className="field">
          <label className="label" htmlFor="log-goal">
            Goal
          </label>
          <select
            id="log-goal"
            className="input"
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
          </select>
        </div>

        {selected.kind === "milestone" ? (
          nextMilestone ? (
            <>
              <p className={styles.nextMilestone}>
                Next up: <strong>{nextMilestone.label}</strong>
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={commitMilestone}
              >
                <Icon name="check" size={16} />
                Mark done
              </button>
            </>
          ) : (
            <p className={styles.empty}>Every milestone is done.</p>
          )
        ) : (
          <>
            <div className={styles.inline}>
              <div className={`field ${styles.inlineGrow}`}>
                <label className="label" htmlFor="log-value">
                  {selected.kind === "accumulate" ? "Add" : "New reading"}
                </label>
                <input
                  id="log-value"
                  ref={valueRef}
                  className="input num"
                  type="number"
                  step="any"
                  inputMode="decimal"
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
              </div>
              {selected.unit && (
                <span className={styles.suffix}>{selected.unit}</span>
              )}
              <div className={`field ${styles.dateField}`}>
                <label className="label" htmlFor="log-date">
                  Date
                </label>
                <input
                  id="log-date"
                  className="input num"
                  type="date"
                  max={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Log
              </button>
            </div>

            {error && (
              <p className={styles.alert} role="alert">
                <span className={styles.alertMark} aria-hidden="true">
                  !
                </span>
                {error}
              </p>
            )}
          </>
        )}

        {receipt && (
          <p className={styles.receipt}>
            <span className={styles.receiptText}>{receipt.text}</span>
            <button
              type="button"
              className="btn btn-quiet"
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
    </>
  );
}
