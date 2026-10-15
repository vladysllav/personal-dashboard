"use client";

import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { PageHeader } from "./AppShell";
import { GoalSection } from "./GoalSection";
import { HabitsBoard } from "./HabitsBoard";
import { Alert } from "./ui";

/**
 * The Goals tab is the list of goals that are still running, and nothing
 * else — each one links through to its own detail surface at /goals/[id],
 * which is where logging happens. The Habits tab is a day: a week strip and
 * the cards that day asks for, with the charts a tap away at /habits/stats.
 */
export function SurfacePage({ surface }: { surface: "goals" | "habits" }) {
  const { ready, syncError } = useStore();
  const today = useToday();

  if (!ready || !today) return null;

  if (surface === "habits") return <HabitsBoard today={today} />;

  return (
    <>
      <PageHeader title="Goals" />
      <div className="flex flex-col gap-4">
        {syncError && <Alert>{syncError}</Alert>}
        <GoalSection today={today} />
      </div>
    </>
  );
}
