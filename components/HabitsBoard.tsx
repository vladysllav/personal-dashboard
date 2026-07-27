"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  WEEKDAY_INITIALS,
  addDays,
  formatLongDate,
  formatMonthAbbr,
  formatShortDate,
  monthKey,
  startOfWeek,
  weekdayIndex,
} from "@/lib/dates";
import {
  deriveHabitCard,
  markCounts,
  monthlyConsistency,
  overallStreaks,
  weeklyProgress,
  windowDays,
  type HabitCard as HabitCardData,
} from "@/lib/habits";
import { newId, useStore } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { Donut } from "./Donut";
import { Icon } from "./Icon";
import styles from "./HabitsBoard.module.css";

const HEATMAP_WEEKS = 18;

export function HabitsBoard({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const habits = state.habits;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);

  const overall = useMemo(() => overallStreaks(habits, today), [habits, today]);
  const monthly = useMemo(() => monthlyConsistency(habits, today), [habits, today]);
  const markedToday = habits.filter((h) => h.marks.includes(today)).length;

  const editing = editingId
    ? habits.find((h) => h.id === editingId) ?? null
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Habits</h1>
          {habits.length > 0 && (
            <p className={`${styles.sub} num`}>
              {markedToday} of {habits.length} marked today
              {overall.current > 0 &&
                ` · ${overall.current}-day streak`}
            </p>
          )}
        </div>
        {!adding && !editing && (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setAdding(true)}
          >
            <Icon name="plus" size={16} />
            Add habit
          </button>
        )}
      </header>

      {adding && (
        <HabitForm
          mode="add"
          onCancel={() => setAdding(false)}
          onSubmit={({ name, weeklyTarget }) => {
            dispatch({
              type: "addHabit",
              habit: {
                id: newId(),
                name,
                marks: [],
                weeklyTarget,
                createdAt: new Date().toISOString(),
              },
            });
            setAdding(false);
          }}
        />
      )}

      {editing && (
        <HabitForm
          mode="edit"
          initial={editing}
          onCancel={() => setEditingId(null)}
          onSubmit={({ name, weeklyTarget }) => {
            dispatch({
              type: "editHabit",
              habitId: editing.id,
              name,
              weeklyTarget,
            });
            setEditingId(null);
          }}
        />
      )}

      {habits.length === 0 && !adding ? (
        <div className={styles.emptyBlock}>
          <p className={styles.empty}>
            No habits yet. Add one and it becomes a ring you tick each day —
            daily, or a few times a week.
          </p>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => dispatch({ type: "seedSampleHabits" })}
          >
            Load sample habits
          </button>
        </div>
      ) : (
        habits.length > 0 && (
          <>
            <div className={styles.topGrid}>
              <ConsistencyCard habits={habits} today={today} monthly={monthly} />
              <div className={styles.streakCol}>
                <div className={`${styles.streakCard} ${styles.currentCard}`}>
                  <span className={styles.streakKicker}>Current streak</span>
                  <div className={styles.streakBig}>
                    <span className={`${styles.streakNum} num`}>
                      {overall.current}
                    </span>
                    <span className={styles.streakUnit}>
                      {overall.current === 1 ? "day" : "days"}
                    </span>
                    <Icon name="flame" size={30} className={styles.flame} />
                  </div>
                  <p className={styles.streakNote}>
                    Days at least half your habits were kept.
                  </p>
                </div>
                <div className={styles.streakCard}>
                  <span className={styles.streakKicker}>Longest streak</span>
                  <div className={styles.longestRow}>
                    <Icon name="trophy" size={22} className={styles.trophy} />
                    <span className={`${styles.longestNum} num`}>
                      {overall.longest}
                    </span>
                    <span className={styles.streakUnit}>
                      {overall.longest === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <section aria-labelledby="modules-heading">
              <h2 id="modules-heading" className={styles.sectionLabel}>
                Your habits
              </h2>
              <ul className={styles.cardGrid}>
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
            </section>

            <div className={styles.bottomGrid}>
              <StreaksList habits={habits} today={today} />
              <WeeklyProgress habits={habits} today={today} />
            </div>
          </>
        )
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
          }}
        />
      )}
    </div>
  );
}

/* ---------- Consistency heatmap ---------- */

function level(fraction: number): number {
  if (fraction <= 0) return 0;
  if (fraction < 0.25) return 1;
  if (fraction < 0.5) return 2;
  if (fraction < 0.75) return 3;
  if (fraction < 1) return 4;
  return 5;
}

function ConsistencyCard({
  habits,
  today,
  monthly,
}: {
  habits: Habit[];
  today: string;
  monthly: { thisMonth: number; bestMonth: number };
}) {
  const n = Math.max(1, habits.length);
  const counts = useMemo(() => markCounts(habits), [habits]);

  // A week-aligned grid: columns are weeks (Monday-first), rows are weekdays.
  const lastMonday = startOfWeek(today);
  const weeks = useMemo(() => {
    const cols: Array<{
      monday: string;
      days: Array<{ day: string; fraction: number; future: boolean }>;
    }> = [];
    for (let w = HEATMAP_WEEKS - 1; w >= 0; w -= 1) {
      const monday = addDays(lastMonday, -w * 7);
      const days = Array.from({ length: 7 }, (_, r) => {
        const day = addDays(monday, r);
        if (day > today) return { day, fraction: 0, future: true };
        return { day, fraction: (counts.get(day) ?? 0) / n, future: false };
      });
      cols.push({ monday, days });
    }
    return cols;
  }, [counts, lastMonday, n, today]);

  return (
    <section className={styles.heatCard} aria-labelledby="consistency-heading">
      <div className={styles.heatHead}>
        <h2 id="consistency-heading" className={styles.sectionLabel}>
          Consistency
        </h2>
        <div className={styles.heatStats}>
          <div className={styles.heatStat}>
            <span className={`${styles.heatPct} num`}>
              {Math.round(monthly.thisMonth * 100)}%
            </span>
            <span className={styles.heatStatLabel}>this month</span>
          </div>
          <div className={styles.heatStat}>
            <span className={`${styles.heatPctQuiet} num`}>
              {Math.round(monthly.bestMonth * 100)}%
            </span>
            <span className={styles.heatStatLabel}>best month</span>
          </div>
        </div>
      </div>

      <div className={styles.heatScroll}>
        <div className={styles.heatGridWrap}>
          <div className={styles.monthRow} aria-hidden="true">
            {weeks.map((col, i) => {
              const prev = weeks[i - 1];
              const show =
                i === 0 || monthKey(col.monday) !== monthKey(prev?.monday ?? "");
              return (
                <span key={col.monday} className={styles.monthLabel}>
                  {show ? formatMonthAbbr(col.monday) : ""}
                </span>
              );
            })}
          </div>

          <div className={styles.heatBody}>
            <div className={styles.weekdayCol} aria-hidden="true">
              {WEEKDAY_INITIALS.map((d, i) => (
                <span key={i} className={styles.weekdayLabel}>
                  {i % 2 === 0 ? d : ""}
                </span>
              ))}
            </div>
            <div className={styles.heatGrid}>
              {weeks.map((col) => (
                <div key={col.monday} className={styles.heatWeek}>
                  {col.days.map((cell) => (
                    <span
                      key={cell.day}
                      className={styles.heatCell}
                      data-level={cell.future ? "future" : level(cell.fraction)}
                      title={
                        cell.future
                          ? undefined
                          : `${formatLongDate(cell.day)} — ${Math.round(cell.fraction * n)} of ${n}`
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.legend} aria-hidden="true">
            <span className={styles.legendText}>Less</span>
            {[0, 1, 2, 3, 4, 5].map((l) => (
              <span key={l} className={styles.heatCell} data-level={l} />
            ))}
            <span className={styles.legendText}>More</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Habit card ---------- */

function targetLabel(card: HabitCardData): string {
  return card.isDaily ? "Daily" : `${card.target}× / week`;
}

function HabitCard({
  habit,
  today,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { dispatch } = useStore();
  const card = deriveHabitCard(habit, today);
  const marks = new Set(habit.marks);
  const week = windowDays(today, 7);

  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitleWrap}>
          <h3 className={styles.cardTitle} title={habit.name}>
            {habit.name}
          </h3>
          <span className={styles.targetBadge}>{targetLabel(card)}</span>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onEdit}
            aria-label={`Edit ${habit.name}`}
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onDelete}
            aria-label={`Delete ${habit.name}`}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      <Donut
        progress={card.adherence}
        plannedProgress={0}
        status={card.adherence >= 1 ? "complete" : "on-pace"}
        size={116}
        caption={`${card.last7} of 7 days`}
      />

      <div className={styles.week7} role="group" aria-label="Last seven days">
        {week.map((day) => {
          const done = marks.has(day);
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              className={styles.week7Cell}
              data-done={done}
              data-today={isToday}
              aria-pressed={done}
              onClick={() =>
                dispatch({ type: "toggleHabit", habitId: habit.id, dateKey: day })
              }
            >
              <span className={styles.week7Label} aria-hidden="true">
                {WEEKDAY_INITIALS[weekdayIndex(day)]}
              </span>
              <span className="visually-hidden">
                {habit.name}, {isToday ? "today" : formatShortDate(day)} —{" "}
                {done ? "done" : "not marked"}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.cardFoot}>
        <span className={styles.streakChip} data-zero={card.streak === 0}>
          <Icon name="flame" size={14} className={styles.chipFlame} />
          <span className="num">{card.streak}</span>{" "}
          {card.streakUnit === "week"
            ? card.streak === 1
              ? "week"
              : "weeks"
            : card.streak === 1
              ? "day"
              : "days"}
        </span>
        {card.broken ? (
          <span className={styles.footNote}>start again</span>
        ) : !card.isDaily ? (
          <span className={`${styles.footNote} num`}>
            {card.weekMarks}/{card.target} this week
          </span>
        ) : null}
      </div>
    </li>
  );
}

/* ---------- Streaks list ---------- */

function StreaksList({ habits, today }: { habits: Habit[]; today: string }) {
  const rows = habits
    .map((h) => ({ habit: h, card: deriveHabitCard(h, today) }))
    .sort((a, b) => b.card.streak - a.card.streak);

  return (
    <section className={styles.panel} aria-labelledby="streaks-heading">
      <h2 id="streaks-heading" className={styles.sectionLabel}>
        Streaks
      </h2>
      <ul className={styles.streakList}>
        {rows.map(({ habit, card }) => (
          <li key={habit.id} className={styles.streakRow}>
            <Icon
              name="flame"
              size={16}
              className={card.streak === 0 ? styles.chipFlameOff : styles.chipFlame}
            />
            <span className={styles.streakName} title={habit.name}>
              {habit.name}
            </span>
            <span className={`${styles.streakCount} num`}>
              {card.streak}{" "}
              <span className={styles.streakCountUnit}>
                {card.streakUnit === "week"
                  ? card.streak === 1
                    ? "week"
                    : "weeks"
                  : card.streak === 1
                    ? "day"
                    : "days"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Weekly progress ---------- */

function WeeklyProgress({ habits, today }: { habits: Habit[]; today: string }) {
  const bars = weeklyProgress(habits, today);
  const n = Math.max(1, habits.length);

  return (
    <section className={styles.panel} aria-labelledby="weekly-heading">
      <h2 id="weekly-heading" className={styles.sectionLabel}>
        Last 7 days
      </h2>
      <div className={styles.bars}>
        {bars.map((bar) => {
          const frac = Math.min(1, bar.count / n);
          const isToday = bar.day === today;
          return (
            <div key={bar.day} className={styles.barCol}>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  data-today={isToday}
                  style={{ "--h": `${Math.round(frac * 100)}%` } as CSSProperties}
                  title={`${formatLongDate(bar.day)} — ${bar.count} of ${n}`}
                />
              </div>
              <span className={styles.barLabel} data-today={isToday}>
                {WEEKDAY_INITIALS[weekdayIndex(bar.day)]}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Add / edit form ---------- */

function HabitForm({
  mode,
  initial,
  onCancel,
  onSubmit,
}: {
  mode: "add" | "edit";
  initial?: Habit;
  onCancel: () => void;
  onSubmit: (v: { name: string; weeklyTarget: number }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(
    initial?.weeklyTarget && initial.weeklyTarget < 7 ? initial.weeklyTarget : 7,
  );
  const trimmed = name.trim();

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSubmit({ name: trimmed, weeklyTarget: target });
      }}
    >
      <div className={`field ${styles.formName}`}>
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
      <div className="field">
        <label className="label" htmlFor="habit-target">
          Cadence
        </label>
        <select
          id="habit-target"
          className="input"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        >
          <option value={7}>Every day</option>
          <option value={6}>6× a week</option>
          <option value={5}>5× a week</option>
          <option value={4}>4× a week</option>
          <option value={3}>3× a week</option>
          <option value={2}>2× a week</option>
          <option value={1}>Once a week</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={!trimmed}>
        {mode === "edit" ? "Save" : "Add"}
      </button>
      <button type="button" className="btn btn-quiet" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
