"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { PageHeader } from "./AppShell";
import { GoalSection } from "./GoalSection";
import { HabitsBoard } from "./HabitsBoard";
import { Icon } from "./Icon";
import { Alert, Button } from "./ui";

/**
 * The Goals tab is the list of goals that are still running, and nothing
 * else — each one links through to its own detail surface at /goals/[id],
 * which is where logging happens. The Habits tab is a day: a week strip and
 * the cards that day asks for, with the charts a tap away at /habits/stats.
 */
export function SurfacePage({ surface }: { surface: "goals" | "habits" }) {
  const { ready, syncError } = useStore();
  const today = useToday();
  const [adding, setAdding] = useState(false);

  if (!ready || !today) return null;

  if (surface === "habits") return <HabitsBoard today={today} />;

  return (
    <>
      <PageHeader
        title="Goals"
        actions={
          <Button
            variant="primary"
            aria-label="Add goal"
            title="Add goal"
            className="size-10 !p-0"
            disabled={adding}
            icon={<Icon name="plus" size={18} />}
            onClick={() => setAdding(true)}
          />
        }
      />
      <div className="flex flex-col gap-4">
        {syncError && <Alert>{syncError}</Alert>}
        <GoalSection today={today} adding={adding} onAddingChange={setAdding} />
      </div>
    </>
  );
}
