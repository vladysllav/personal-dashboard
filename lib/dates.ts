import type { StepUnit } from "./types";

/**
 * Local-date helpers. Everything is keyed on YYYY-MM-DD strings built from
 * *local* calendar components, never from `toISOString()` — that converts to UTC
 * and silently shifts the day for anyone west of Greenwich after 00:00 local.
 */

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/**
 * An ISO timestamp on `dateKey` carrying the current time-of-day. Used when a
 * new entry is backdated: the calendar day is the user's choice, but the wall
 * clock still increments, so several entries logged onto the same past day keep
 * a stable order (which is what `measure` goals read as "latest").
 */
export function isoAtDate(dateKey: string): string {
  const now = new Date();
  const d = fromDateKey(dateKey);
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return d.toISOString();
}

/** Move an existing timestamp onto a different calendar day, keeping its time-of-day. */
export function withDate(iso: string, dateKey: string): string {
  const original = new Date(iso);
  const d = fromDateKey(dateKey);
  d.setHours(
    original.getHours(),
    original.getMinutes(),
    original.getSeconds(),
    original.getMilliseconds(),
  );
  return d.toISOString();
}

/** Midnight-aligned day difference. Immune to DST because it compares calendar days. */
export function daysBetween(fromKey: string, toKey: string): number {
  const a = fromDateKey(fromKey);
  const b = fromDateKey(toKey);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** How many whole steps have elapsed between two dates for a given step unit. */
export function stepsElapsed(
  startKey: string,
  nowKey: string,
  unit: StepUnit,
): number {
  const days = daysBetween(startKey, nowKey);
  if (days <= 0) return 0;
  switch (unit) {
    case "day":
      return days;
    case "week":
      return Math.floor(days / 7);
    case "month": {
      const a = fromDateKey(startKey);
      const b = fromDateKey(nowKey);
      let months =
        (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
      if (b.getDate() < a.getDate()) months -= 1;
      return Math.max(0, months);
    }
  }
}

/** Monday-based start of the week containing `key`. */
export function startOfWeek(key: string): string {
  const d = fromDateKey(key);
  // getDay(): 0=Sun..6=Sat. Days since Monday = (day + 6) % 7.
  const sinceMonday = (d.getDay() + 6) % 7;
  return addDays(key, -sinceMonday);
}

/** "2026-07" — the calendar month a date falls in. */
export function monthKey(key: string): string {
  return key.slice(0, 7);
}

/** Single-letter weekday initials, Monday-first, aligned to startOfWeek. */
export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Monday-first weekday index (0=Mon..6=Sun) for a date key. */
export function weekdayIndex(key: string): number {
  return (fromDateKey(key).getDay() + 6) % 7;
}

/** The calendar date a goal's final step lands on. */
export function deadlineKey(
  startKey: string,
  totalSteps: number,
  unit: StepUnit,
): string {
  const d = fromDateKey(startKey);
  switch (unit) {
    case "day":
      d.setDate(d.getDate() + totalSteps);
      break;
    case "week":
      d.setDate(d.getDate() + totalSteps * 7);
      break;
    case "month":
      d.setMonth(d.getMonth() + totalSteps);
      break;
  }
  return toDateKey(d);
}

export const STEP_NOUN: Record<StepUnit, [singular: string, plural: string]> = {
  day: ["day", "days"],
  week: ["week", "weeks"],
  month: ["month", "months"],
};

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

export function formatLongDate(key: string): string {
  return LONG_DATE.format(fromDateKey(key));
}

export function formatShortDate(key: string): string {
  return SHORT_DATE.format(fromDateKey(key));
}

const MONTH_ABBR = new Intl.DateTimeFormat("en-GB", { month: "short" });

export function formatMonthAbbr(key: string): string {
  return MONTH_ABBR.format(fromDateKey(key));
}
