"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addDays, startOfWeek, todayKey, weekdayIndex } from "./dates";
import { applyAction } from "./server/actions";
import type { Intent, SyncAction } from "./sync";
import type {
  DashboardState,
  Goal,
  GoalKind,
  GoalView,
  Habit,
  Preferences,
  StepUnit,
} from "./types";

export type { GoalPatch } from "./sync";

const DEFAULT_PREFS: Preferences = { goalView: "bar" };

type Action = SyncAction | { type: "hydrate"; state: DashboardState };

function reducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case "hydrate":
    case "replace":
      return action.state;

    case "addGoal":
      return { ...state, goals: [...state.goals, action.goal] };

    case "editGoal":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId ? { ...g, ...action.patch } : g,
        ),
      };

    case "addEntry":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? { ...g, entries: [...g.entries, action.entry] }
            : g,
        ),
      };

    case "editEntry":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? {
                ...g,
                entries: g.entries.map((e) =>
                  e.id === action.entryId
                    ? { ...e, value: action.value, at: action.at }
                    : e,
                ),
              }
            : g,
        ),
      };

    case "removeEntry":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? { ...g, entries: g.entries.filter((e) => e.id !== action.entryId) }
            : g,
        ),
      };

    case "setMilestone":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? {
                ...g,
                milestones: g.milestones.map((m) =>
                  m.id === action.milestoneId ? { ...m, done: action.done } : m,
                ),
              }
            : g,
        ),
      };

    case "removeGoal":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.goalId) };

    case "addHabits":
      return { ...state, habits: [...state.habits, ...action.habits] };

    case "editHabit":
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.habitId ? { ...h, ...action.patch } : h,
        ),
      };

    case "setHabitMark":
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.habitId) return h;
          const without = h.marks.filter((m) => m !== action.dateKey);
          return {
            ...h,
            marks: action.done ? [...without, action.dateKey].sort() : without,
          };
        }),
      };

    case "removeHabit":
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.habitId),
      };

    case "setGoalView":
      return { ...state, prefs: { ...state.prefs, goalView: action.view } };
  }
}

/**
 * Turns a component's intent into the exact action that both the reducer and
 * the server will apply.
 *
 * This is where every id, timestamp and toggle gets pinned down. A toggle
 * resolved on the server would race two devices into flipping each other's
 * work; resolved here, the action states the outcome it wants and replaying it
 * is harmless. Returns null when there is nothing to do.
 */
function seal(intent: Intent, state: DashboardState): SyncAction | null {
  switch (intent.type) {
    case "logGoal":
      return {
        type: "addEntry",
        goalId: intent.goalId,
        entry: {
          id: newId(),
          at: intent.at ?? new Date().toISOString(),
          value: intent.value,
        },
      };

    case "undoLastEntry": {
      const goal = state.goals.find((g) => g.id === intent.goalId);
      const last = goal?.entries.at(-1);
      if (!last) return null;
      return { type: "removeEntry", goalId: intent.goalId, entryId: last.id };
    }

    case "toggleMilestone": {
      const goal = state.goals.find((g) => g.id === intent.goalId);
      const milestone = goal?.milestones.find((m) => m.id === intent.milestoneId);
      if (!milestone) return null;
      return {
        type: "setMilestone",
        goalId: intent.goalId,
        milestoneId: intent.milestoneId,
        done: !milestone.done,
      };
    }

    case "toggleHabit": {
      const habit = state.habits.find((h) => h.id === intent.habitId);
      if (!habit) return null;
      return {
        type: "setHabitMark",
        habitId: intent.habitId,
        dateKey: intent.dateKey,
        done: !habit.marks.includes(intent.dateKey),
      };
    }

    case "seedSampleHabits":
      return { type: "addHabits", habits: buildSampleHabits(todayKey()) };

    case "addHabit":
      return { type: "addHabits", habits: [intent.habit] };

    default:
      return intent;
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

type StoreValue = {
  state: DashboardState;
  dispatch: (intent: Intent) => void;
  /** Kept for call sites; the server renders with real data, so it is never false. */
  ready: boolean;
  /** Set when a write fails to reach the server. Surfaced inline, not swallowed. */
  syncError: string | null;
  loadSample: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  initialState,
  children,
}: {
  initialState: DashboardState;
  children: ReactNode;
}) {
  const [state, rawDispatch] = useReducer(reducer, initialState);
  const [syncError, setSyncError] = useState<string | null>(null);

  // A synchronous mirror of `state`. Sealing needs the current data, and two
  // dispatches in one tick would both read a stale `state` from the closure.
  const stateRef = useRef(initialState);

  // Writes go out one at a time. Order matters — creating a goal must land
  // before an entry logged against it — and at personal scale a promise chain
  // is the whole of the machinery required.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const dispatch = useCallback((intent: Intent) => {
    const action = seal(intent, stateRef.current);
    if (!action) return;

    stateRef.current = reducer(stateRef.current, action);
    rawDispatch(action);

    queue.current = queue.current
      .then(() => applyAction(action))
      .then(() => setSyncError(null))
      .catch(() => {
        setSyncError(
          "Couldn't reach the server. Your last change is on screen but not saved.",
        );
      });
  }, []);

  const loadSample = useCallback(() => {
    dispatch({ type: "replace", state: buildSample() });
  }, [dispatch]);

  const value = useMemo(
    () => ({ state, dispatch, ready: true, syncError, loadSample }),
    [state, dispatch, syncError, loadSample],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ---------- Sample data ---------- */

/**
 * Roughly five weeks of habit history — daily and cadence-based — so streaks,
 * the heatmap and the weekly model are populated the moment it's seeded. Each
 * mark predicate sees the date key (for weekday cadences) and the day-offset.
 * Today (i = 0) is left unmarked so there is always something to do.
 */
export function buildSampleHabits(today: string): Habit[] {
  const HABIT_DAYS = 35;
  const habitSpecs: Array<{
    name: string;
    weeklyTarget?: number;
    /** Weeks the commitment runs for; null is open-ended. */
    durationWeeks: number | null;
    mark: (dateKey: string, daysAgo: number) => boolean;
  }> = [
    // Daily, ~89% kept, open-ended — the habit with no finish line.
    { name: "Утренняя рутина", durationWeeks: null, mark: (_d, i) => i % 9 !== 0 },
    // Gym Mon/Tue/Thu/Sat → a clean four times a week. weekdayIndex: Mon=0.
    {
      name: "Зал",
      weeklyTarget: 4,
      durationWeeks: 12,
      mark: (d) => [0, 1, 3, 5].includes(weekdayIndex(d)),
    },
    // Daily, ~83% kept, a fixed eight-week run.
    { name: "Чтение по вечерам", durationWeeks: 8, mark: (_d, i) => i % 6 !== 0 },
    // Daily, ~86% kept, a fixed sixteen-week run.
    { name: "ИИ-внедрение", durationWeeks: 16, mark: (_d, i) => i % 7 !== 0 },
  ];

  // Every sample habit starts on the Monday five weeks back, so the weekly
  // chart has whole weeks to score rather than a ragged first column.
  const start = startOfWeek(addDays(today, -HABIT_DAYS));

  return habitSpecs.map(({ name, weeklyTarget, durationWeeks, mark }) => {
    const marks: string[] = [];
    for (let i = 1; i <= HABIT_DAYS; i += 1) {
      const day = addDays(today, -i);
      if (day >= start && mark(day, i)) marks.push(day);
    }
    return {
      id: newId(),
      name,
      marks: marks.sort(),
      weeklyTarget,
      startDate: start,
      durationWeeks,
      createdAt: start,
    };
  });
}

function makeGoal(
  name: string,
  kind: GoalKind,
  unit: string,
  pointA: number,
  pointB: number,
  stepUnit: StepUnit,
  totalSteps: number,
  startedDaysAgo: number,
  entryValues: number[],
  milestoneLabels: Array<[string, boolean]> = [],
): Goal {
  const start = addDays(todayKey(), -startedDaysAgo);
  return {
    id: newId(),
    name,
    kind,
    unit,
    pointA,
    pointB,
    stepUnit,
    totalSteps,
    startDate: start,
    entries: entryValues.map((value, i) => ({
      id: newId(),
      at: new Date(Date.now() - (entryValues.length - i) * 86_400_000).toISOString(),
      value,
    })),
    milestones: milestoneLabels.map(([label, done]) => ({
      id: newId(),
      label,
      done,
    })),
    createdAt: start,
  };
}

/**
 * A deliberately mixed set: ascending and descending, three kinds, three step
 * units, and goals in every pace state — so the dashboard's states are all
 * reachable without hand-editing data.
 */
export function buildSample(): DashboardState {
  const today = todayKey();

  const goals: Goal[] = [
    makeGoal("Run 400 km", "accumulate", "km", 0, 400, "day", 90, 30, [
      22, 18, 25, 14, 19, 21,
    ]),
    makeGoal("Body weight", "measure", "kg", 84, 78, "day", 120, 40, [
      83.4, 82.9, 82.4, 82.1,
    ]),
    makeGoal("Read 24 books", "accumulate", "books", 0, 24, "month", 12, 152, [
      2, 1, 2, 1, 2,
    ]),
    makeGoal("Emergency fund", "accumulate", "€", 0, 6000, "month", 12, 152, [
      600, 700, 650, 700, 600,
    ]),
    makeGoal(
      "Ship the dashboard",
      "milestone",
      "",
      0,
      5,
      "week",
      5,
      14,
      [],
      [
        ["Define the goal model", true],
        ["Pace maths + edge cases", true],
        ["Dashboard screen", true],
        ["Goals tab", false],
        ["Daily use for two weeks", false],
      ],
    ),
  ];

  return { goals, habits: buildSampleHabits(today), prefs: DEFAULT_PREFS };
}
