"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { goalSchema } from "./validate";
import { insertGoal } from "./write";

export type ImportResult = { ok: true } | { ok: false; message: string };

/**
 * Moves a single goal out of the old browser-only storage and into the account.
 *
 * Deliberately one goal at a time, and deliberately not a bulk migration: the
 * legacy blob is whatever a browser happened to be holding, so the safe move is
 * to let you look at the list and pick.
 *
 * Ids are preserved rather than reissued, which makes a second import of the
 * same goal detectable instead of silently producing a duplicate.
 */
export async function importGoal(input: unknown): Promise<ImportResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, message: "You're not signed in." };

  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "That goal is missing fields this version needs, so it can't be imported.",
    };
  }
  const goal = parsed.data;

  const existing = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goal.id), eq(goals.userId, userId)))
    .limit(1);
  if (existing.length) {
    return { ok: false, message: `"${goal.name}" has already been imported.` };
  }

  await db.transaction((tx) => insertGoal(tx, userId, goal));
  return { ok: true };
}
