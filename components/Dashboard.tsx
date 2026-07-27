"use client";

import { formatLongDate } from "@/lib/dates";
import { deriveGoal } from "@/lib/goals";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { DashboardState } from "@/lib/types";
import { GoalSection } from "./GoalSection";
import { HabitSection } from "./HabitSection";
import { TodayBand } from "./TodayBand";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const { state, ready, loadSample } = useStore();
  const today = useToday();

  if (!ready || !today) return <DashboardSkeleton />;

  const isFirstRun = state.goals.length === 0 && state.habits.length === 0;

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.date}>{formatLongDate(today)}</h1>
        {!isFirstRun && <p className={styles.summary}>{summarise(state, today)}</p>}
      </header>

      {isFirstRun ? (
        <div className={styles.firstRun}>
          <h2 className={styles.firstRunTitle}>Nothing recorded yet.</h2>
          <p className={styles.firstRunBody}>
            A goal here is a start value, a target, and the number of steps you
            have to get there. That&rsquo;s what lets the dashboard show whether
            you&rsquo;re ahead or behind the pace you set — not just a
            percentage that always looks fine. Habits are simpler: one row per
            habit, one square per day.
          </p>
          <div className={styles.firstRunActions}>
            <button type="button" className="btn btn-primary" onClick={loadSample}>
              Load sample data
            </button>
            <span className={styles.firstRunNote}>
              Five goals and six habits you can edit or delete. Or add your own
              below.
            </span>
          </div>
        </div>
      ) : (
        <TodayBand today={today} />
      )}

      <div className={styles.sections}>
        <GoalSection today={today} />
        <HabitSection today={today} />
      </div>
    </>
  );
}

function summarise(state: DashboardState, today: string): string {
  const parts: string[] = [];

  if (state.habits.length > 0) {
    const marked = state.habits.filter((h) => h.marks.includes(today)).length;
    parts.push(`${marked} of ${state.habits.length} habits marked`);
  }

  if (state.goals.length > 0) {
    const behind = state.goals.filter((g) => {
      const s = deriveGoal(g, today).status;
      return s === "behind" || s === "overdue";
    }).length;
    parts.push(
      behind === 0
        ? "every goal on pace or ahead"
        : `${behind} ${behind === 1 ? "goal" : "goals"} behind pace`,
    );
  }

  return parts.join(" · ");
}

function DashboardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className={styles.header}>
        <h1 className={styles.date}>&nbsp;</h1>
        <p className={styles.summary}>&nbsp;</p>
      </div>
      <div className={styles.skeletonBand} />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonBar} />
        </div>
      ))}
    </div>
  );
}
