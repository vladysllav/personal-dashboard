"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  WEEKDAY_ABBR,
  addMonths,
  dayOfMonth,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  monthGrid,
  monthKey,
} from "@/lib/dates";
import { dayWord, deriveChallenge, formatBenefit } from "@/lib/challenges";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { Challenge } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { ChallengeForm, RelapseForm } from "./ChallengeForms";
import { ConfirmDialog } from "./ConfirmDialog";
import { Icon } from "./Icon";
import { Ring } from "./Ring";
import { Button, Card, CardHead, Empty, IconButton } from "./ui";

export function ChallengeDetail({ challengeId }: { challengeId: string }) {
  const { state, ready, dispatch } = useStore();
  const today = useToday();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [slipping, setSlipping] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [month, setMonth] = useState<string | null>(null);

  if (!ready || !today) return null;

  const challenge = state.challenges.find((c) => c.id === challengeId);
  if (!challenge) {
    return (
      <>
        <PageHeader
          title="This challenge doesn’t exist."
          back={{ href: "/challenges", label: "Challenges" }}
        />
        <Card className="p-5">
          <Link
            href="/challenges"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-700 hover:text-ink"
          >
            <Icon name="arrowLeft" size={15} />
            All challenges
          </Link>
        </Card>
      </>
    );
  }

  const d = deriveChallenge(challenge, today);
  const b = challenge.benefit;
  const shownMonth = month ?? `${monthKey(d.lastDay < challenge.startDate ? challenge.startDate : d.lastDay)}-01`;

  return (
    <>
      <PageHeader
        back={{ href: "/challenges", label: "Challenges" }}
        title={
          <span className="flex items-center gap-2.5">
            <span aria-hidden="true">{challenge.icon}</span>
            {challenge.name}
          </span>
        }
        actions={
          <>
            {challenge.finishedAt ? (
              <Button
                icon={<Icon name="undo" size={15} />}
                onClick={() =>
                  dispatch({ type: "finishChallenge", challengeId: challenge.id, finished: false })
                }
              >
                Reopen
              </Button>
            ) : (
              !d.done && (
                <Button
                  icon={<Icon name="trophy" size={15} />}
                  onClick={() =>
                    dispatch({ type: "finishChallenge", challengeId: challenge.id, finished: true })
                  }
                >
                  Finish
                </Button>
              )
            )}
            <Button icon={<Icon name="edit" size={15} />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <Card>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 sm:gap-6 sm:p-6">
            <Figure
              label="Streak"
              value={String(d.streak)}
              caption={`${dayWord(d.streak)} clean · best ${d.bestStreak}`}
            />
            <Ring
              value={d.progress ?? 1}
              size={140}
              label={d.totalDays ? `Day ${d.daysIn} of ${d.totalDays}` : `Day ${d.daysIn}`}
            >
              <span className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink tnum">
                {d.daysIn}
              </span>
              <span className="mt-1 text-[11.5px] text-ink-3 tnum">
                {d.totalDays ? `of ${d.totalDays} days` : dayWord(d.daysIn)}
              </span>
            </Ring>
            {b && d.saved !== null ? (
              <Figure
                label={b.unit === "usd" ? "Saved" : "Time back"}
                value={formatBenefit(d.saved, b.unit)}
                caption={
                  d.projected !== null && !d.done
                    ? `~${formatBenefit(d.projected, b.unit)} by the end`
                    : `~${Math.round(d.skipped ?? 0)} times skipped`
                }
              />
            ) : (
              <Figure
                label="Slips"
                value={String(d.relapses)}
                caption={`${d.cleanDays} clean ${dayWord(d.cleanDays)}`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6">
            <span className="text-[12.5px] text-ink-3 tnum">
              {formatShortDate(challenge.startDate)} →{" "}
              {challenge.endDate ? formatShortDate(challenge.endDate) : "no end"}
              {b && ` · ~${Math.round(d.skipped ?? 0)} times skipped`}
              {d.relapses > 0 && ` · ${d.relapses} ${d.relapses === 1 ? "slip" : "slips"}`}
            </span>
            {!d.done && d.daysIn > 0 && (
              <Button onClick={() => setSlipping(true)}>I slipped</Button>
            )}
          </div>
        </Card>

        <Card aria-labelledby="calendar-heading">
          <CardHead id="calendar-heading" title="Calendar" />
          <div className="p-4 sm:p-5">
            <ChallengeCalendar
              challenge={challenge}
              lastDay={d.lastDay}
              month={shownMonth}
              today={today}
              onMonthChange={(delta) => setMonth(addMonths(shownMonth, delta))}
            />
          </div>
        </Card>

        <Card aria-labelledby="slips-heading" className="overflow-hidden">
          <CardHead id="slips-heading" title="Slips" />
          {challenge.relapses.length === 0 ? (
            <Empty>None so far.</Empty>
          ) : (
            <ul className="divide-y divide-dashed divide-line">
              {[...challenge.relapses]
                .sort((a, b2) => (a.date < b2.date ? 1 : -1))
                .map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span className="flex-1 text-[13px] text-ink tnum">{formatLongDate(r.date)}</span>
                    <span className="text-[13px] text-ink-3 tnum">×{r.count}</span>
                    <IconButton
                      name="close"
                      size={14}
                      label="Delete slip"
                      onClick={() =>
                        dispatch({
                          type: "removeRelapse",
                          challengeId: challenge.id,
                          relapseId: r.id,
                        })
                      }
                    />
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      {editing && !pendingDelete && (
        <ChallengeForm
          initial={challenge}
          today={today}
          onClose={() => setEditing(false)}
          onDelete={() => setPendingDelete(true)}
        />
      )}
      {slipping && (
        <RelapseForm challenge={challenge} today={today} onClose={() => setSlipping(false)} />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${challenge.name}”?`}
          body="This removes the challenge and its slips. It can’t be undone."
          confirmLabel="Delete challenge"
          onCancel={() => setPendingDelete(false)}
          onConfirm={() => {
            dispatch({ type: "removeChallenge", challengeId: challenge.id });
            router.push("/challenges");
          }}
        />
      )}
    </>
  );
}

function Figure({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="min-w-0 text-center">
      <span className="block text-[12.5px] text-ink-2 sm:text-[13.5px]">{label}</span>
      <span className="mt-1 block truncate text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink tnum sm:text-[28px]">
        {value}
      </span>
      <span className="mt-0.5 block text-[11.5px] text-ink-3 tnum">{caption}</span>
    </div>
  );
}

/** A month of the challenge: clean days filled, slips in coral, the rest pale. */
function ChallengeCalendar({
  challenge,
  lastDay,
  month,
  today,
  onMonthChange,
}: {
  challenge: Challenge;
  lastDay: string;
  month: string;
  today: string;
  onMonthChange: (delta: number) => void;
}) {
  const slips = new Map<string, number>();
  for (const r of challenge.relapses) slips.set(r.date, (slips.get(r.date) ?? 0) + r.count);
  const mk = monthKey(month);
  const canBack = mk > monthKey(challenge.startDate);
  const canForward = mk < monthKey(challenge.endDate ?? today);

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="flex items-center justify-between gap-1">
        <IconButton
          name="chevronLeft"
          label="Previous month"
          disabled={!canBack}
          onClick={() => onMonthChange(-1)}
          className="disabled:opacity-30"
        />
        <h3 className="text-[12.5px] font-medium text-ink-2">{formatMonthYear(mk)}</h3>
        <IconButton
          name="chevronRight"
          label="Next month"
          disabled={!canForward}
          onClick={() => onMonthChange(1)}
          className="disabled:opacity-30"
        />
      </div>
      <div aria-hidden="true" className="mt-2 grid grid-cols-7 gap-1 text-center text-[11.5px] text-ink-3">
        {WEEKDAY_ABBR.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthGrid(month).map(({ day, inMonth }) => {
          const inChallenge =
            day >= challenge.startDate && (!challenge.endDate || day <= challenge.endDate);
          const lived = inChallenge && day <= lastDay;
          const slip = slips.get(day);
          const tone = !inChallenge
            ? "text-ink-3"
            : slip
              ? "bg-neg-600 font-medium text-ink"
              : lived
                ? "bg-ink font-medium text-surface"
                : "bg-surface-3 text-ink-3";
          const state = !inChallenge
            ? "outside the challenge"
            : slip
              ? `slipped ×${slip}`
              : lived
                ? "clean"
                : "ahead";
          return (
            <span
              key={day}
              title={`${formatLongDate(day)} — ${state}`}
              className={
                "flex aspect-square items-center justify-center rounded-[8px] text-[12.5px] tnum " +
                tone +
                (inMonth ? "" : " opacity-40") +
                (day === today ? " ring-2 ring-inset ring-accent-500" : "")
              }
            >
              {dayOfMonth(day)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
