"use server";

import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  goalEntries,
  goals,
  habitMarks,
  habits,
  milestones,
  preferences,
} from "@/lib/db/schema";
import { syncActionSchema } from "./validate";
import {
  insertGoal,
  insertHabit,
  replaceMilestones,
  serializeWeekdays,
} from "./write";

/**
 * Applies one sealed store action to the signed-in user's data.
 *
 * Actions are idempotent by construction (see `lib/sync.ts`), so the client is
 * free to retry. Every write is scoped by `userId`; nothing here trusts an id
 * from the payload without first proving the caller owns the row.
 */
export async function applyAction(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const action = syncActionSchema.parse(input);

  switch (action.type) {
    case "addGoal": {
      await db.transaction((tx) => insertGoal(tx, userId, action.goal));
      return;
    }

    case "editGoal": {
      await requireGoal(userId, action.goalId);
      const { milestones: nextMilestones, ...fields } = action.patch;
      await db.transaction(async (tx) => {
        if (Object.keys(fields).length) {
          await tx.update(goals).set(fields).where(eq(goals.id, action.goalId));
        }
        if (nextMilestones) {
          await replaceMilestones(tx, action.goalId, nextMilestones);
        }
      });
      return;
    }

    case "addEntry": {
      await requireGoal(userId, action.goalId);
      await db
        .insert(goalEntries)
        .values({
          id: action.entry.id,
          goalId: action.goalId,
          at: action.entry.at,
          value: action.entry.value,
        })
        // A retried log must not double-count.
        .onConflictDoNothing();
      return;
    }

    case "editEntry": {
      await requireGoal(userId, action.goalId);
      await db
        .update(goalEntries)
        .set({ value: action.value, at: action.at })
        .where(
          and(
            eq(goalEntries.id, action.entryId),
            eq(goalEntries.goalId, action.goalId),
          ),
        );
      return;
    }

    case "removeEntry": {
      await requireGoal(userId, action.goalId);
      await db
        .delete(goalEntries)
        .where(
          and(
            eq(goalEntries.id, action.entryId),
            eq(goalEntries.goalId, action.goalId),
          ),
        );
      return;
    }

    case "setMilestone": {
      await requireGoal(userId, action.goalId);
      await db
        .update(milestones)
        .set({ done: action.done })
        .where(
          and(
            eq(milestones.id, action.milestoneId),
            eq(milestones.goalId, action.goalId),
          ),
        );
      return;
    }

    case "removeGoal": {
      // Children fall with the parent via ON DELETE CASCADE.
      await db
        .delete(goals)
        .where(and(eq(goals.id, action.goalId), eq(goals.userId, userId)));
      return;
    }

    case "addHabits": {
      await db.transaction(async (tx) => {
        for (const habit of action.habits) await insertHabit(tx, userId, habit);
      });
      return;
    }

    case "editHabit": {
      await requireHabit(userId, action.habitId);
      await db
        .update(habits)
        .set({
          name: action.patch.name,
          weeklyTarget: action.patch.weeklyTarget ?? null,
          startDate: action.patch.startDate,
          durationWeeks: action.patch.durationWeeks,
          weekdays: serializeWeekdays(action.patch.weekdays),
        })
        .where(eq(habits.id, action.habitId));
      return;
    }

    case "setHabitMark": {
      await requireHabit(userId, action.habitId);
      if (action.done) {
        await db
          .insert(habitMarks)
          .values({ habitId: action.habitId, dateKey: action.dateKey })
          .onConflictDoNothing();
      } else {
        await db
          .delete(habitMarks)
          .where(
            and(
              eq(habitMarks.habitId, action.habitId),
              eq(habitMarks.dateKey, action.dateKey),
            ),
          );
      }
      return;
    }

    case "removeHabit": {
      await db
        .delete(habits)
        .where(and(eq(habits.id, action.habitId), eq(habits.userId, userId)));
      return;
    }

    case "setGoalView": {
      await db
        .insert(preferences)
        .values({ userId, goalView: action.view })
        .onConflictDoUpdate({
          target: preferences.userId,
          set: { goalView: action.view },
        });
      return;
    }

    case "setPinnedGoals": {
      // Only this user's goals can be pinned, so a crafted payload cannot make
      // the dashboard fetch a ring for somebody else's row.
      const owned = action.goalIds.length
        ? await db
            .select({ id: goals.id })
            .from(goals)
            .where(and(eq(goals.userId, userId), inArray(goals.id, action.goalIds)))
        : [];
      const ordered = action.goalIds
        .filter((id) => owned.some((row) => row.id === id))
        .slice(0, 2);
      const value = ordered.length ? ordered.join(",") : null;

      await db
        .insert(preferences)
        .values({ userId, pinnedGoalIds: value })
        .onConflictDoUpdate({
          target: preferences.userId,
          set: { pinnedGoalIds: value },
        });
      return;
    }

    case "replace": {
      // Loading the sample set is a deliberate wipe-and-fill of everything.
      await db.transaction(async (tx) => {
        await tx.delete(goals).where(eq(goals.userId, userId));
        await tx.delete(habits).where(eq(habits.userId, userId));
        for (const goal of action.state.goals) await insertGoal(tx, userId, goal);
        for (const habit of action.state.habits) await insertHabit(tx, userId, habit);
        await tx
          .insert(preferences)
          .values({
            userId,
            goalView: action.state.prefs.goalView,
            pinnedGoalIds: action.state.prefs.pinnedGoalIds.join(",") || null,
          })
          .onConflictDoUpdate({
            target: preferences.userId,
            set: { goalView: action.state.prefs.goalView },
          });
      });
      return;
    }
  }
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not signed in.");
  return userId;
}

/** Proves the caller owns this goal before anything touches its rows. */
async function requireGoal(userId: string, goalId: string): Promise<void> {
  const rows = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1);
  if (!rows.length) throw new Error("Goal not found.");
}

async function requireHabit(userId: string, habitId: string): Promise<void> {
  const rows = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);
  if (!rows.length) throw new Error("Habit not found.");
}
