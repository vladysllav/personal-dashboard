"use client";

import { useState } from "react";
import { addDays, daysBetween } from "@/lib/dates";
import { UNIT_LABEL } from "@/lib/challenges";
import { newId, useStore } from "@/lib/store";
import type { ChallengePatch } from "@/lib/sync";
import type { Challenge, ChallengeUnit } from "@/lib/types";
import { Modal } from "./Modal";
import { Button, Field, Input, Select } from "./ui";

const CHALLENGE_EMOJI = [
  "💨", "🚬", "🍺", "🍷", "☕", "🍬", "🍔", "🍟",
  "🍕", "📱", "🎮", "🛒", "💸", "🎰", "🛋️", "🌙",
];

/** Lengths offered in the form. "custom" opens a date; "none" runs until stopped. */
const DURATIONS = [7, 14, 21, 30, 60, 90, 180, 365] as const;
type Duration = (typeof DURATIONS)[number] | "custom" | "none";

function durationOf(challenge: Challenge | undefined): Duration {
  if (!challenge) return 30;
  if (!challenge.endDate) return "none";
  const days = daysBetween(challenge.startDate, challenge.endDate) + 1;
  return (DURATIONS as readonly number[]).includes(days) ? (days as Duration) : "custom";
}

function parse(raw: string): number {
  const n = Number(raw.replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** Add or edit a challenge: what, from when, for how long, and what it gives. */
export function ChallengeForm({
  initial,
  today,
  onClose,
  onDelete,
}: {
  initial?: Challenge;
  today: string;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const { dispatch } = useStore();
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon || CHALLENGE_EMOJI[0]!);
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [duration, setDuration] = useState<Duration>(durationOf(initial));
  const [customEnd, setCustomEnd] = useState(initial?.endDate ?? addDays(today, 29));
  const [tracksBenefit, setTracksBenefit] = useState(Boolean(initial?.benefit));
  const [unit, setUnit] = useState<ChallengeUnit>(initial?.benefit?.unit ?? "usd");
  const [perTime, setPerTime] = useState(initial?.benefit ? String(initial.benefit.perTime) : "");
  const [timesPerMonth, setTimesPerMonth] = useState(
    initial?.benefit ? String(initial.benefit.timesPerMonth) : "",
  );

  const endDate =
    duration === "none"
      ? null
      : duration === "custom"
        ? customEnd
        : addDays(startDate, duration - 1);

  const per = parse(perTime);
  const times = parse(timesPerMonth);
  const benefitOk = !tracksBenefit || (Number.isFinite(per) && Number.isFinite(times));
  const valid =
    name.trim() !== "" && (endDate === null || endDate >= startDate) && benefitOk;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    const patch: ChallengePatch = {
      name: name.trim(),
      icon,
      startDate,
      endDate,
      benefit: tracksBenefit ? { unit, perTime: per, timesPerMonth: times } : null,
    };
    if (initial) {
      dispatch({ type: "editChallenge", challengeId: initial.id, patch });
    } else {
      dispatch({
        type: "addChallenge",
        challenge: { id: newId(), relapses: [], createdAt: new Date().toISOString(), ...patch },
      });
    }
    onClose();
  }

  return (
    <Modal
      title={initial ? "Edit challenge" : "New challenge"}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button variant="quiet" className="py-2.5 text-neg-700" onClick={onDelete}>
              Delete
            </Button>
          )}
          <span className="flex-1" />
          <Button className="py-2.5" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="py-2.5" disabled={!valid} onClick={() => submit()}>
            {initial ? "Save" : "Start"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="I won't…" htmlFor="ch-name">
          <Input
            id="ch-name"
            size="lg"
            value={name}
            autoFocus
            placeholder="Smoke hookah"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <fieldset>
          <legend className="text-[11.5px] text-ink-3">Icon</legend>
          <div className="mt-1.5 grid grid-cols-8 gap-1.5">
            {CHALLENGE_EMOJI.map((emoji) => {
              const on = emoji === icon;
              return (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Icon ${emoji}`}
                  onClick={() => setIcon(emoji)}
                  className={
                    "flex aspect-square items-center justify-center rounded-[var(--radius-input)] text-[20px] " +
                    (on
                      ? "border-2 border-ink bg-surface-3"
                      : "border border-line bg-surface hover:bg-surface-2")
                  }
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" htmlFor="ch-start">
            <Input
              id="ch-start"
              size="lg"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value || startDate)}
            />
          </Field>
          <Field label="Length" htmlFor="ch-length">
            <Select
              id="ch-length"
              size="lg"
              value={String(duration)}
              onChange={(e) => {
                const v = e.target.value;
                setDuration(v === "custom" || v === "none" ? v : (Number(v) as Duration));
              }}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
              <option value="custom">Until a date</option>
              <option value="none">No end</option>
            </Select>
          </Field>
        </div>

        {duration === "custom" && (
          <Field label="Last day" htmlFor="ch-end">
            <Input
              id="ch-end"
              size="lg"
              type="date"
              min={startDate}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value || customEnd)}
            />
          </Field>
        )}

        <label className="flex items-center gap-2.5 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={tracksBenefit}
            onChange={(e) => setTracksBenefit(e.target.checked)}
            className="size-4 accent-[var(--color-ink)]"
          />
          Count what it gives me
        </label>

        {tracksBenefit && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-control)] bg-surface-2 p-3">
            <Field label="Measured in" htmlFor="ch-unit">
              <Select
                id="ch-unit"
                size="lg"
                value={unit}
                onChange={(e) => setUnit(e.target.value as ChallengeUnit)}
              >
                {(Object.keys(UNIT_LABEL) as ChallengeUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={unit === "usd" ? "$ per time" : "Hours per time"} htmlFor="ch-per">
                <Input
                  id="ch-per"
                  size="lg"
                  type="text"
                  inputMode="decimal"
                  placeholder={unit === "usd" ? "20" : "2"}
                  value={perTime}
                  onChange={(e) => setPerTime(e.target.value)}
                />
              </Field>
              <Field label="Times a month before" htmlFor="ch-times">
                <Input
                  id="ch-times"
                  size="lg"
                  type="text"
                  inputMode="decimal"
                  placeholder="8"
                  value={timesPerMonth}
                  onChange={(e) => setTimesPerMonth(e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** "I slipped": the day, and how many times. */
export function RelapseForm({
  challenge,
  today,
  onClose,
}: {
  challenge: Challenge;
  today: string;
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const [date, setDate] = useState(today);
  const [count, setCount] = useState("1");
  const n = Math.round(parse(count));
  const valid = Number.isFinite(n) && n >= 1 && date >= challenge.startDate && date <= today;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    dispatch({ type: "logRelapse", challengeId: challenge.id, date, count: n });
    onClose();
  }

  return (
    <Modal
      title="I slipped"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button className="py-2.5" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="py-2.5" disabled={!valid} onClick={() => submit()}>
            Log it
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-[13px] leading-relaxed text-ink-2">
          The streak starts again from the next day. The challenge keeps going.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="rl-date">
            <Input
              id="rl-date"
              size="lg"
              type="date"
              min={challenge.startDate}
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value || date)}
            />
          </Field>
          <Field label="How many times" htmlFor="rl-count">
            <Input
              id="rl-count"
              size="lg"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
