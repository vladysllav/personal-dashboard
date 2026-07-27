"use client";

import { useState, type CSSProperties } from "react";
import { HABIT_WINDOW } from "@/lib/constants";
import { formatShortDate } from "@/lib/dates";
import { deriveHabit, windowDays } from "@/lib/habits";
import { newId, useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { Icon } from "./Icon";
import styles from "./HabitSection.module.css";

export function HabitSection({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const days = windowDays(today, HABIT_WINDOW);

  return (
    <section aria-labelledby="habits-heading">
      <div className="section-head">
        <h2 className="section-title" id="habits-heading">
          Consistency
        </h2>
        {!adding && (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setAdding(true)}
          >
            <Icon name="plus" size={16} />
            Add habit
          </button>
        )}
      </div>

      {state.habits.length === 0 ? (
        <p className={styles.hint}>
          No habits yet. Each one becomes a row of the last {HABIT_WINDOW} days.
        </p>
      ) : (
        <div
          className={styles.wrap}
          style={{ "--habit-days": HABIT_WINDOW } as CSSProperties}
        >
          <div className={styles.head}>
            <p className={styles.headSpan}>
              <span>{formatShortDate(days[0] ?? today)}</span>
              <span>Today</span>
            </p>
            <p className={styles.headStreak}>Streak</p>
          </div>

          {state.habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              today={today}
              days={days}
              onToggle={(dateKey) =>
                dispatch({ type: "toggleHabit", habitId: habit.id, dateKey })
              }
              onRemove={() =>
                dispatch({ type: "removeHabit", habitId: habit.id })
              }
            />
          ))}
        </div>
      )}

      {adding && (
        <AddHabitForm
          onCancel={() => setAdding(false)}
          onSubmit={(name) => {
            dispatch({
              type: "addHabit",
              habit: {
                id: newId(),
                name,
                marks: [],
                createdAt: new Date().toISOString(),
              },
            });
            setAdding(false);
          }}
        />
      )}
    </section>
  );
}

function HabitRow({
  habit,
  today,
  days,
  onToggle,
  onRemove,
}: {
  habit: Habit;
  today: string;
  days: string[];
  onToggle: (dateKey: string) => void;
  onRemove: () => void;
}) {
  const marks = new Set(habit.marks);
  const { streak, hits, broken } = deriveHabit(habit, today, HABIT_WINDOW);

  return (
    <div className={styles.row}>
      <div className={styles.nameCell}>
        <h3 className={styles.name} title={habit.name}>
          {habit.name}
        </h3>
        <button type="button" className={styles.remove} onClick={onRemove}>
          <Icon name="close" size={12} />
          <span className="visually-hidden">Remove {habit.name}</span>
        </button>
      </div>

      <div className={styles.days}>
        {days.map((day) => {
          const done = marks.has(day);
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              className={styles.day}
              data-done={done}
              data-today={isToday}
              aria-pressed={done}
              onClick={() => onToggle(day)}
            >
              <span className="visually-hidden">
                {habit.name}, {isToday ? "today" : formatShortDate(day)} —{" "}
                {done ? "done" : "not marked"}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.streak}>
        <p className={styles.streakTop}>
          <span
            className={`${styles.streakNum} num ${streak === 0 ? styles.streakZero : ""}`}
          >
            {streak}
          </span>
          <span className={styles.streakLabel}>
            {streak === 1 ? "day" : "days"}
          </span>
        </p>
        <p className={styles.streakSub}>
          {broken ? (
            "start again"
          ) : (
            <span className="num">
              {hits} of {HABIT_WINDOW}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function AddHabitForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSubmit(trimmed);
      }}
    >
      <div className={`field ${styles.formField}`}>
        <label className="label" htmlFor="habit-name">
          Habit name
        </label>
        <input
          id="habit-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Morning pages"
          autoFocus
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={!trimmed}>
        Add
      </button>
      <button type="button" className="btn btn-quiet" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
