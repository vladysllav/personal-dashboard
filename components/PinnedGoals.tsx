"use client";

import Link from "next/link";
import { describeGoal } from "@/lib/describe";
import { deriveGoal } from "@/lib/goals";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { Donut } from "./Donut";
import { Icon } from "./Icon";
import { StatusBadge } from "./StatusBadge";

/**
 * Two goals, pinned, above everything else.
 *
 * Two and not more: the point is one glance before the day's list, and on a
 * phone a third ring pushes that list below the fold — which would trade the
 * thing you came for against the thing you wanted to check. They sit two to a
 * row at every width, so the shape of the screen does not change as it widens.
 */
export function PinnedGoals({ today }: { today: string }) {
  const { state } = useStore();
  const pinned = state.prefs.pinnedGoalIds
    .map((id) => state.goals.find((g) => g.id === id))
    .filter((g): g is Goal => Boolean(g))
    .slice(0, 2);

  if (state.goals.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {pinned.map((goal) => (
        <PinnedCard key={goal.id} goal={goal} today={today} />
      ))}
      {/* An empty slot is a target, not a gap: it says what it is for and
          taking it is one tap away. */}
      {Array.from({ length: 2 - pinned.length }, (_, i) => (
        <EmptySlot key={`empty-${i}`} />
      ))}
    </div>
  );
}

function PinnedCard({ goal, today }: { goal: Goal; today: string }) {
  const derived = deriveGoal(goal, today);
  const copy = describeGoal(goal, derived);

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-card hover:border-line-strong sm:p-4"
    >
      <Donut
        progress={derived.progress}
        plannedProgress={derived.plannedProgress}
        status={derived.status}
        size={116}
      />
      <span className="w-full truncate text-center text-[13px] font-medium text-ink">
        {goal.name}
      </span>
      <StatusBadge status={derived.status} hint={copy.plan}>
        {copy.headline}
      </StatusBadge>
    </Link>
  );
}

function EmptySlot() {
  return (
    <Link
      href="/goals"
      className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line-strong p-3 text-center hover:border-ink-3"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-[32px] items-center justify-center rounded-full bg-surface-3 text-ink-3"
      >
        <Icon name="plus" size={16} />
      </span>
      <span className="text-[12.5px] leading-snug text-ink-3">
        Pin a goal to
        <br />
        watch it here
      </span>
    </Link>
  );
}
