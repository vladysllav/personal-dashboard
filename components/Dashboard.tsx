"use client";

import { formatLongDate } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { PageHeader } from "./AppShell";
import { PinnedGoals } from "./PinnedGoals";
import { ProfileCard } from "./ProfileCard";
import { TodayReminders } from "./TodayReminders";
import { Button, Card } from "./ui";

/**
 * Today, in the order the day is actually used.
 *
 * Profile, then two pinned rings, then the list of what is due. The four
 * summary percentages that used to open this screen are gone: "90% of plan
 * kept" is a fact about the past that changes nothing about the next hour, and
 * four of them in a row pushed the only actionable thing on the page below the
 * fold. Habits are no longer ticked in their own block either — every habit due
 * today is a row in the list, so the day is one object instead of three.
 */
export function Dashboard({
  account,
}: {
  account?: { name?: string | null; image?: string | null; email?: string | null };
}) {
  const { state, ready, loadSample } = useStore();
  const today = useToday();

  if (!ready || !today) return <DashboardSkeleton />;

  const isFirstRun = state.goals.length === 0 && state.habits.length === 0;

  return (
    <>
      <PageHeader title={formatLongDate(today)} />

      {isFirstRun ? (
        <Card className="animate-rise p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
            Nothing recorded yet.
          </h2>
          <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-ink-2">
            A goal here is a start value, a target, and the number of steps you
            have to get there. That&rsquo;s what lets the dashboard show whether
            you&rsquo;re ahead or behind the pace you set — not just a percentage
            that always looks fine. Habits are simpler: how often, and on which
            days.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={loadSample}>
              Load sample data
            </Button>
            <span className="max-w-[52ch] text-[11.5px] leading-relaxed text-ink-3">
              Five goals and four habits you can edit or delete. Or add your own
              below.
            </span>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {account && (
            <ProfileCard
              name={account.name}
              image={account.image}
              email={account.email}
            />
          )}
          <PinnedGoals today={today} />
          <TodayReminders today={today} />
        </div>
      )}
    </>
  );
}

/**
 * A placeholder of the same shape as the real thing, so the page does not jump
 * when the store hydrates. No spinner: this is a wait of one frame, not a load.
 */
function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="pt-4 lg:pt-5">
      <div className="h-[32px] w-[220px] rounded-[var(--radius-input)] bg-surface-3" />
      <div className="mt-5 h-[68px] rounded-[var(--radius-card)] border border-line bg-surface" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <div className="h-[200px] rounded-[var(--radius-card)] border border-line bg-surface" />
        <div className="h-[200px] rounded-[var(--radius-card)] border border-line bg-surface" />
      </div>
      <div className="mt-4 h-[320px] rounded-[var(--radius-card)] border border-line bg-surface" />
    </div>
  );
}
