"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { STORAGE_KEY } from "./constants";
import { addDays, todayKey, weekdayIndex } from "./dates";
import type {
  DashboardState,
  Goal,
  GoalKind,
  GoalView,
  Habit,
  Preferences,
  StepUnit,
} from "./types";

const DEFAULT_PREFS: Preferences = { goalView: "bar" };
const EMPTY: DashboardState = { goals: [], habits: [], prefs: DEFAULT_PREFS };

/** Fields a user may change after creation. Identity, entries and marks are never patched here. */
export type GoalPatch = Partial<
  Pick<
    Goal,
    | "name"
    | "kind"
    | "unit"
    | "pointA"
    | "pointB"
    | "stepUnit"
    | "totalSteps"
    | "startDate"
    | "milestones"
  >
>;

type Action =
  | { type: "hydrate"; state: DashboardState }
  | { type: "replace"; state: DashboardState }
  | { type: "addGoal"; goal: Goal }
  | { type: "editGoal"; goalId: string; patch: GoalPatch }
  | { type: "logGoal"; goalId: string; value: number; at?: string }
  | { type: "editEntry"; goalId: string; entryId: string; value: number; at: string }
  | { type: "removeEntry"; goalId: string; entryId: string }
  | { type: "undoLastEntry"; goalId: string }
  | { type: "toggleMilestone"; goalId: string; milestoneId: string }
  | { type: "removeGoal"; goalId: string }
  | { type: "addHabit"; habit: Habit }
  | { type: "seedSampleHabits" }
  | { type: "editHabit"; habitId: string; name: string; weeklyTarget: number }
  | { type: "toggleHabit"; habitId: string; dateKey: string }
  | { type: "removeHabit"; habitId: string }
  | { type: "setGoalView"; view: GoalView };

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

    case "logGoal":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? {
                ...g,
                entries: [
                  ...g.entries,
                  {
                    id: newId(),
                    at: action.at ?? new Date().toISOString(),
                    value: action.value,
                  },
                ],
              }
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

    case "undoLastEntry":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId ? { ...g, entries: g.entries.slice(0, -1) } : g,
        ),
      };

    case "toggleMilestone":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? {
                ...g,
                milestones: g.milestones.map((m) =>
                  m.id === action.milestoneId ? { ...m, done: !m.done } : m,
                ),
              }
            : g,
        ),
      };

    case "removeGoal":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.goalId) };

    case "addHabit":
      return { ...state, habits: [...state.habits, action.habit] };

    case "seedSampleHabits":
      // Appends the sample habits without disturbing goals or any existing ones.
      return {
        ...state,
        habits: [...state.habits, ...buildSampleHabits(todayKey())],
      };

    case "editHabit":
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.habitId
            ? { ...h, name: action.name, weeklyTarget: action.weeklyTarget }
            : h,
        ),
      };

    case "toggleHabit":
      return {
        ...state,
        habits: state.habits.map((h) => {
          if (h.id !== action.habitId) return h;
          const has = h.marks.includes(action.dateKey);
          return {
            ...h,
            marks: has
              ? h.marks.filter((m) => m !== action.dateKey)
              : [...h.marks, action.dateKey].sort(),
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

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

type StoreValue = {
  state: DashboardState;
  dispatch: (action: Action) => void;
  /** False until localStorage has been read. Guards against hydration mismatch. */
  ready: boolean;
  /** Set when persistence fails (private mode, quota). Surfaced inline, not swallowed. */
  storageError: string | null;
  loadSample: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: parse(raw) });
    } catch {
      setStorageError(
        "Couldn't read saved data. Anything you enter now may not persist.",
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(null);
    } catch {
      setStorageError("Couldn't save. Your last change is on screen but not stored.");
    }
  }, [state, ready]);

  const loadSample = useCallback(() => {
    dispatch({ type: "replace", state: buildSample() });
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, ready, storageError, loadSample }),
    [state, ready, storageError, loadSample],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

function parse(raw: string): DashboardState {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return EMPTY;
  const candidate = parsed as Partial<DashboardState>;
  const view = candidate.prefs?.goalView;
  return {
    goals: Array.isArray(candidate.goals) ? candidate.goals : [],
    habits: Array.isArray(candidate.habits) ? candidate.habits : [],
    // Absent before this feature shipped, so fall back to the default rather
    // than trusting the stored shape.
    prefs: { goalView: view === "ring" ? "ring" : "bar" },
  };
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
    mark: (dateKey: string, daysAgo: number) => boolean;
  }> = [
    // Daily, ~89% kept.
    { name: "Утренняя рутина", mark: (_d, i) => i % 9 !== 0 },
    // Gym Mon/Tue/Thu/Sat → a clean four times a week. weekdayIndex: Mon=0.
    { name: "Зал", weeklyTarget: 4, mark: (d) => [0, 1, 3, 5].includes(weekdayIndex(d)) },
    // Daily, ~83% kept.
    { name: "Чтение по вечерам", mark: (_d, i) => i % 6 !== 0 },
    // Daily, ~86% kept.
    { name: "ИИ-внедрение", mark: (_d, i) => i % 7 !== 0 },
  ];

  return habitSpecs.map(({ name, weeklyTarget, mark }) => {
    const marks: string[] = [];
    for (let i = 1; i <= HABIT_DAYS; i += 1) {
      const day = addDays(today, -i);
      if (mark(day, i)) marks.push(day);
    }
    return {
      id: newId(),
      name,
      marks: marks.sort(),
      weeklyTarget,
      createdAt: addDays(today, -HABIT_DAYS),
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
function buildSample(): DashboardState {
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
