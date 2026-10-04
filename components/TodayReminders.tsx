"use client";

import Link from "next/link";
import { reminderCounts, todaysReminders, type Reminder, type Urgency } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { Card, CardHead, Empty } from "./ui";

/**
 * What today asks of you, as one list.
 *
 * This is the first thing on the screen because it is the only thing that
 * answers the question you opened the app with. A habit here is tickable in
 * place — the row *is* the control, so the day's list and the day's actions are
 * the same object rather than two blocks saying the same thing twice.
 */
export function TodayReminders({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const items = todaysReminders(state.habits, state.goals, today);
  const counts = reminderCounts(items);

  return (
    <Card aria-labelledby="today-heading" className="animate-rise overflow-hidden">
      <CardHead
        id="today-heading"
        title="Today's reminders"
        right={
          items.length > 0 ? (
            <span className="text-[13px] text-ink-3 tnum">
              {counts.outstanding === 0
                ? "all clear"
                : `${counts.outstanding} to do`}
            </span>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <Empty>
          Nothing is due today. Add a habit with set days or a weekly target,
          and the days it falls on will show up here.
        </Empty>
      ) : (
        <ul className="divide-y divide-dashed divide-line">
          {items.map((item) => (
            <ReminderRow
              key={item.id}
              item={item}
              onToggle={
                item.habitId
                  ? () =>
                      dispatch({
                        type: "toggleHabit",
                        habitId: item.habitId!,
                        dateKey: today,
                      })
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Colour says how late a thing is; the shape of the box says so too, because
 * yellow and coral at a tint are close in weight and the difference has to
 * survive being glanced at.
 */
const TONE: Record<Urgency, { chip: string; label: string }> = {
  overdue: { chip: "bg-neg-600 text-ink", label: "late" },
  due: { chip: "bg-accent-600 text-ink", label: "today" },
  optional: { chip: "bg-surface-3 text-ink-2", label: "optional" },
  done: { chip: "bg-accent-50 text-accent-700", label: "done" },
};

function ReminderRow({
  item,
  onToggle,
}: {
  item: Reminder;
  onToggle?: () => void;
}) {
  const tone = TONE[item.urgency];
  const done = item.urgency === "done";

  const body = (
    <>
      {/* The tick is the control for a habit and a status for a goal, so it is
          drawn the same either way and only one of them is a button. */}
      <span
        aria-hidden="true"
        className={
          "mt-[1px] inline-flex size-[22px] shrink-0 items-center justify-center rounded-full border " +
          (done
            ? "border-accent-700 bg-accent-600 text-ink"
            : item.urgency === "overdue"
              ? "border-neg-700 text-neg-700"
              : "border-line-strong text-ink-3")
        }
      >
        {done ? (
          <Icon name="check" size={13} />
        ) : item.kind === "goal" ? (
          <Icon name="target" size={12} />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={
            "block truncate text-[13.5px] font-medium " +
            (done ? "text-ink-3 line-through" : "text-ink")
          }
        >
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
          {item.detail}
        </span>
      </span>

      <span
        className={`shrink-0 rounded-[var(--radius-badge)] px-1.5 py-0.5 text-[11px] font-medium ${tone.chip}`}
      >
        {tone.label}
      </span>
    </>
  );

  return (
    <li>
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={done}
          className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 sm:px-5"
        >
          {body}
        </button>
      ) : (
        <Link
          href={item.goalId ? `/goals/${item.goalId}` : "/goals"}
          className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5"
        >
          {body}
        </Link>
      )}
    </li>
  );
}
