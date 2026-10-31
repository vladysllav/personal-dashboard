import { addDays, endOfMonth, monthKey, startOfWeek } from "./dates";
import type { Macros, Nutrition, WeightEntry } from "./types";

/**
 * Nutrition, read back from what was logged.
 *
 * A day is stored as running totals, so "what did I eat on Tuesday" is one
 * lookup. Weigh-ins are all kept; the chart reads the *last* one of each week
 * or month, because a weekly reading is where you ended the week, not an
 * average dragged around by a salty Thursday.
 */

export const EMPTY_MACROS: Macros = { calories: 0, protein: 0, fat: 0, carbs: 0 };

/** Calories a gram of each macro carries — used to suggest a plan's total. */
export const KCAL_PER_GRAM = { protein: 4, fat: 9, carbs: 4 } as const;

export function dayTotals(nutrition: Nutrition, date: string): Macros {
  const day = nutrition.days.find((d) => d.date === date);
  return day
    ? { calories: day.calories, protein: day.protein, fat: day.fat, carbs: day.carbs }
    : EMPTY_MACROS;
}

export function hasLog(nutrition: Nutrition, date: string): boolean {
  const t = dayTotals(nutrition, date);
  return t.calories > 0 || t.protein > 0 || t.fat > 0 || t.carbs > 0;
}

export function macroCalories(m: Pick<Macros, "protein" | "fat" | "carbs">): number {
  return (
    m.protein * KCAL_PER_GRAM.protein +
    m.fat * KCAL_PER_GRAM.fat +
    m.carbs * KCAL_PER_GRAM.carbs
  );
}

export type CalorieDay = { date: string; calories: number };

/** One bar per day, oldest first, ending on `toKey`. Unlogged days read 0. */
export function calorieDays(nutrition: Nutrition, toKey: string, days: number): CalorieDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(toKey, -(days - 1 - i));
    return { date, calories: dayTotals(nutrition, date).calories };
  });
}

export type WeightPeriod = "day" | "week" | "month";

export type WeightPoint = {
  /** The day itself, the Monday of the week, or the 1st of the month. */
  start: string;
  /** The last weigh-in inside the period. */
  value: number;
  /** The period containing today — its reading can still change. */
  current: boolean;
};

/**
 * The last weigh-in of each week or month that has one, oldest first.
 *
 * Periods without a weigh-in are skipped rather than drawn as gaps or zeros:
 * a week you did not step on the scale is not a week you weighed nothing.
 */
export function weightSeries(
  weights: WeightEntry[],
  period: WeightPeriod,
  todayKey: string,
  limit = 12,
): WeightPoint[] {
  const keyOf = (date: string) =>
    period === "day" ? date : period === "week" ? startOfWeek(date) : `${monthKey(date)}-01`;

  // Latest wins: by date, then by the moment it was recorded.
  const sorted = [...weights].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.at < b.at ? -1 : 1,
  );

  const last = new Map<string, number>();
  for (const w of sorted) last.set(keyOf(w.date), w.value);

  const now = keyOf(todayKey);
  return [...last.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-limit)
    .map(([start, value]) => ({ start, value, current: start === now }));
}

/** The most recent weigh-in, or null before the first. */
export function latestWeight(weights: WeightEntry[]): WeightEntry | null {
  let best: WeightEntry | null = null;
  for (const w of weights) {
    if (!best || w.date > best.date || (w.date === best.date && w.at > best.at)) best = w;
  }
  return best;
}

/** The last weigh-in of every logged day in the month containing `anyDay`, oldest first. */
export function weightDays(weights: WeightEntry[], anyDay: string, todayKey: string): WeightPoint[] {
  const from = `${monthKey(anyDay)}-01`;
  const to = endOfMonth(from);
  const inMonth = weights.filter((w) => w.date >= from && w.date <= to);
  return weightSeries(inMonth, "day", todayKey, 31);
}
