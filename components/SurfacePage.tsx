"use client";

import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { GoalSection } from "./GoalSection";
import { HabitsBoard } from "./HabitsBoard";

/**
 * The Goals tab renders the goals section at full page scope. The Habits tab
 * is its own dashboard — streaks, a consistency heatmap, per-habit rings and
 * weekly progress — rather than the compact grid the Today band uses. Each
 * goal links through to its own detail surface at /goals/[id].
 */
export function SurfacePage({ surface }: { surface: "goals" | "habits" }) {
  const { ready } = useStore();
  const today = useToday();

  if (!ready || !today) return null;

  return surface === "goals" ? (
    <GoalSection today={today} />
  ) : (
    <HabitsBoard today={today} />
  );
}
