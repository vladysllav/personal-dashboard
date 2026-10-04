import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { FrequencyUnit, GoalKind, GoalView, StepUnit } from "../types";

/* ---------- Auth.js tables ----------
 * Column names here are dictated by @auth/drizzle-adapter and must stay
 * camelCase — the adapter maps to them literally. */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ---------- Dashboard tables ----------
 *
 * Dates stay `text`, not `date`/`timestamp`, on purpose. The app works in the
 * viewer's local day (`todayKey()`, `YYYY-MM-DD`) and compares those keys as
 * strings. Handing them to Postgres as timestamps would re-anchor them to UTC
 * and shift a day either side of midnight — the one bug this app cannot have.
 *
 * `seq` preserves insertion order. The reducer appends and `undoLastEntry`
 * drops the tail, so array position is meaningful and `createdAt` (a date, not
 * a unique instant) cannot stand in for it. */

/*
 * Every read filters by the owning key, and Postgres does not index foreign
 * keys on its own — hence the explicit indexes below. `habit_marks` needs none:
 * its composite primary key already leads with `habit_id`.
 */

export const goals = pgTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seq: serial("seq").notNull(),
    name: text("name").notNull(),
    kind: text("kind").$type<GoalKind>().notNull(),
    /** Empty string is valid — a count has no unit. */
    unit: text("unit").notNull().default(""),
    pointA: doublePrecision("point_a").notNull(),
    pointB: doublePrecision("point_b").notNull(),
    stepUnit: text("step_unit").$type<StepUnit>().notNull(),
    totalSteps: integer("total_steps").notNull(),
    startDate: text("start_date").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("goals_user_id_idx").on(t.userId)],
);

export const goalEntries = pgTable(
  "goal_entries",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    seq: serial("seq").notNull(),
    /** ISO timestamp of when it was recorded. */
    at: text("at").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (t) => [index("goal_entries_goal_id_idx").on(t.goalId)],
);

export const milestones = pgTable(
  "milestones",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    done: boolean("done").notNull().default(false),
  },
  (t) => [index("milestones_goal_id_idx").on(t.goalId)],
);

export const habits = pgTable(
  "habits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seq: serial("seq").notNull(),
    name: text("name").notNull(),
    /** What doing it means, in the user's words. Null for rows written before it existed. */
    description: text("description"),
    /** An emoji. Null falls back to the default when read. */
    icon: text("icon"),
    /** A swatch id from `lib/palette.ts`. Null falls back when read. */
    color: text("color"),
    /**
     * The cadence, split across two columns: how many times, and per what.
     * Null on both means a row written before frequencies existed — `loadState`
     * reads `weekly_target` instead, so no backfill is needed and no history
     * is lost.
     */
    freqCount: integer("freq_count"),
    freqUnit: text("freq_unit").$type<FrequencyUnit>(),
    /**
     * Superseded by `freq_count` / `freq_unit`, and kept only so a row written
     * before them still reads correctly. Never written any more.
     */
    weeklyTarget: integer("weekly_target"),
    /**
     * Local date the commitment starts on. Nullable only for rows written
     * before habits had a plan — `loadState` falls those back to `createdAt`,
     * so no backfill is needed and no history is lost.
     */
    startDate: text("start_date"),
    /**
     * Dropped from the model: a habit has no finish line. The column stays
     * because an old row still carries a value and dropping a column is a
     * one-way move; nothing reads it.
     */
    durationWeeks: integer("duration_weeks"),
    /**
     * ISO weekday numbers the habit is due on, comma separated ("1,3,5").
     * Null or empty means no fixed days — the commitment is a plain quota.
     * Stored as text rather than an array so the column reads the same from
     * psql, a CSV export and the Neon console.
     */
    weekdays: text("weekdays"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("habits_user_id_idx").on(t.userId)],
);

export const habitMarks = pgTable(
  "habit_marks",
  {
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    /** Local date, YYYY-MM-DD. */
    dateKey: text("date_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.dateKey] })],
);

export const preferences = pgTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  goalView: text("goal_view").$type<GoalView>().notNull().default("bar"),
  /** Pinned goal ids, comma separated and in display order. At most two. */
  pinnedGoalIds: text("pinned_goal_ids"),
});
