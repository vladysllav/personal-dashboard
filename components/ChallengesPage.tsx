"use client";

import Link from "next/link";
import { useState } from "react";
import { formatShortDate } from "@/lib/dates";
import {
  dayWord,
  formatBenefit,
  sortChallenges,
  type ChallengeDerived,
} from "@/lib/challenges";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { Challenge } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { ChallengeForm, RelapseForm } from "./ChallengeForms";
import { Icon } from "./Icon";
import { Button, Card, CardHead, Empty } from "./ui";

/**
 * Every challenge as its own card: how far in, how long clean, and what it has
 * given back. Nothing is ticked here on a good day — the only control is the
 * one for a bad one.
 */
export function ChallengesPage() {
  const { state, ready } = useStore();
  const today = useToday();
  const [adding, setAdding] = useState(false);
  const [slipping, setSlipping] = useState<Challenge | null>(null);

  if (!ready || !today) return null;

  const all = sortChallenges(state.challenges, today);
  const running = all.filter((x) => !x.derived.done);
  const finished = all.filter((x) => x.derived.done);

  return (
    <>
      <PageHeader
        title="Challenges"
        actions={
          <Button
            variant="primary"
            aria-label="New challenge"
            title="New challenge"
            className="size-10 !p-0"
            icon={<Icon name="plus" size={18} />}
            onClick={() => setAdding(true)}
          />
        }
      />

      <div className="flex flex-col gap-3">
        {running.length === 0 && (
          <Card>
            <CardHead title="No challenge running" />
            <Empty>
              Pick something to stop for a while — hookah for 90 days, sugar
              for a month. Nothing to log on a good day; you only tell it when
              you slip.
            </Empty>
          </Card>
        )}

        <ul className="flex flex-col gap-3">
          {running.map(({ challenge, derived }) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              derived={derived}
              onSlip={() => setSlipping(challenge)}
            />
          ))}
        </ul>

        {finished.length > 0 && (
          <section aria-labelledby="finished-heading" className="mt-3 flex flex-col gap-3">
            <h2 id="finished-heading" className="text-[13.5px] font-medium text-ink">
              Finished
            </h2>
            <ul className="flex flex-col gap-3">
              {finished.map(({ challenge, derived }) => (
                <ChallengeCard key={challenge.id} challenge={challenge} derived={derived} />
              ))}
            </ul>
          </section>
        )}
      </div>

      {adding && <ChallengeForm today={today} onClose={() => setAdding(false)} />}
      {slipping && (
        <RelapseForm challenge={slipping} today={today} onClose={() => setSlipping(null)} />
      )}
    </>
  );
}

function ChallengeCard({
  challenge,
  derived,
  onSlip,
}: {
  challenge: Challenge;
  derived: ChallengeDerived;
  onSlip?: () => void;
}) {
  const b = challenge.benefit;
  const notStarted = derived.daysIn === 0;

  return (
    <Card as="li" className="relative p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/challenges/${challenge.id}`}
          className="group flex min-w-0 items-center gap-2.5 after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
        >
          <span aria-hidden="true" className="text-[26px] leading-none">
            {challenge.icon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-semibold tracking-[-0.01em] text-ink group-hover:text-accent-700">
              {challenge.name}
            </span>
            <span className="block text-[12.5px] text-ink-3 tnum">
              {notStarted
                ? `Starts ${formatShortDate(challenge.startDate)}`
                : derived.totalDays
                  ? `Day ${derived.daysIn} of ${derived.totalDays}`
                  : `Day ${derived.daysIn}`}
            </span>
          </span>
        </Link>
        {onSlip && !notStarted && (
          <Button className="relative z-10 shrink-0" onClick={onSlip}>
            I slipped
          </Button>
        )}
      </div>

      {derived.progress !== null && (
        <div className="mt-4 h-[10px] overflow-hidden rounded-full bg-surface-3">
          <div
            className="bar-fill h-full rounded-full bg-ink"
            style={{ width: `${derived.progress * 100}%` }}
          />
        </div>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-ink-3 tnum">
        <div>
          <dt className="visually-hidden">Streak</dt>
          <dd>
            <span className="text-[17px] font-semibold text-ink">{derived.streak}</span>{" "}
            {dayWord(derived.streak)} clean
            {derived.bestStreak > derived.streak && ` · best ${derived.bestStreak}`}
          </dd>
        </div>
        {b && derived.saved !== null && (
          <div>
            <dt className="visually-hidden">{b.unit === "usd" ? "Saved" : "Time back"}</dt>
            <dd>
              <span className="text-[17px] font-semibold text-ink">
                {formatBenefit(derived.saved, b.unit)}
              </span>{" "}
              {b.unit === "usd" ? "saved" : "back"}
            </dd>
          </div>
        )}
        {derived.relapses > 0 && (
          <div>
            <dt className="visually-hidden">Slips</dt>
            <dd>
              {derived.relapses} {derived.relapses === 1 ? "slip" : "slips"}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
