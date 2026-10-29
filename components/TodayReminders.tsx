"use client";

import { reminderCounts, todaysReminders, type Reminder } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { Card, CardHead, Empty } from "./ui";

/**
 * What today asks of you, as one list.
 *
 * This is the first thing on the screen because it is the only thing that
 * answers the question you opened the app with. Every row is a habit, tickable
 * in place — the row *is* the control, so the day's list and the day's actions are
 * the same object rather than two blocks saying the same thing twice.
 */
export function TodayReminders({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const items = todaysReminders(state.habits, today);
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
              onToggle={() =>
                dispatch({
                  type: "toggleHabit",
                  habitId: item.habitId,
                  dateKey: today,
                })
              }
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ReminderRow({
  item,
  onToggle,
}: {
  item: Reminder;
  onToggle: () => void;
}) {
  const done = item.urgency === "done";

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 sm:px-5"
      >
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
          {done && <Icon name="check" size={13} />}
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
      </button>
    </li>
  );
}
