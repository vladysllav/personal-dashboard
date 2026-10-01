"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { HabitOverview } from "./HabitOverview";
import { Icon } from "./Icon";
import { Card, CardHead, Empty } from "./ui";

/**
 * Habits on the main dashboard: the picture, not the controls.
 *
 * Ticking today already happens in the band above, so repeating a row of
 * checkboxes here would be the same action twice on one screen. What this
 * section adds instead is the view you cannot get from a single day — the
 * share of the plan kept overall, day by day, and week by week — with the
 * month calendars a click away.
 */
export function HabitSection({ today }: { today: string }) {
  const { state } = useStore();

  if (state.habits.length === 0) {
    return (
      <Card aria-labelledby="habits-heading">
        <CardHead id="habits-heading" title="Habits" />
        <Empty>
          No habits yet. A habit here is a commitment with a shape — how often,
          and for how long — so it can be ahead or behind, not just ticked.
        </Empty>
      </Card>
    );
  }

  return (
    <section aria-labelledby="habits-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="habits-heading" className="text-[13.5px] font-medium text-ink">
          Habits
        </h2>
        <Link
          href="/habits"
          className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink"
        >
          Month calendars
          <Icon name="chevronRight" size={14} />
        </Link>
      </div>

      <HabitOverview habits={state.habits} today={today} />
    </section>
  );
}
