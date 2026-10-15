import { formatDayMonth } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { GoalWeek } from "@/lib/weekly";
import { Card, CardHead } from "./ui";

/**
 * What was tracked each week, against the line the plan asks for.
 *
 * A week that reached the line is filled in the accent; a finished week that
 * fell short turns coral. The week still under way stays pale until it either
 * reaches the line or ends — a Tuesday is not a failed week.
 */
export function GoalWeekChart({
  weeks,
  target,
  height = 180,
}: {
  weeks: GoalWeek[];
  /** The plan's amount per week, drawn as the line. */
  target: number;
  height?: number;
}) {
  if (weeks.length === 0) return null;

  const peak = Math.max(target, ...weeks.map((w) => w.amount)) || 1;
  const scale = (v: number) => Math.max(0, v) / peak;
  const line = scale(target);

  return (
    <Card aria-labelledby="weeks-heading">
      <CardHead id="weeks-heading" title="By week" />
      <div className="p-4 sm:p-5">
        <div className="flex gap-2">
          {/* The line's value, on the axis, so the bars can be read against it. */}
          <div aria-hidden="true" className="relative w-8 shrink-0" style={{ height }}>
            {target > 0 && (
              <span
                className="absolute right-0 translate-y-1/2 text-[11.5px] font-medium text-ink-2 tnum"
                style={{ bottom: `${line * 100}%` }}
              >
                {formatNumber(target)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="relative flex items-end gap-1.5 border-b border-line sm:gap-2"
              style={{ height }}
              role="img"
              aria-label={`Tracked per week against ${formatNumber(target)} planned`}
            >
              {weeks.map((week) => {
                const met = week.amount >= target - 1e-9;
                const tone = met
                  ? "border-accent-700 bg-accent-500 text-ink"
                  : week.current
                    ? "border-accent-700/40 bg-accent-100 text-ink"
                    : "border-neg-700 bg-neg-600 text-ink";
                const h = scale(week.amount);
                return (
                  <div
                    key={week.start}
                    className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
                    title={`Week of ${formatDayMonth(week.start)}: ${formatNumber(week.amount)}`}
                  >
                    {h > 0 ? (
                      <div
                        className={`mx-auto flex w-full max-w-[72px] justify-center rounded-t-[8px] border pt-1 ${tone}`}
                        style={{ height: `${h * 100}%`, minHeight: 22 }}
                      >
                        <span className="truncate px-0.5 text-[11.5px] font-medium tnum">
                          {formatNumber(week.amount)}
                        </span>
                      </div>
                    ) : (
                      <span className="pb-1 text-center text-[11.5px] text-ink-3 tnum">
                        {formatNumber(week.amount)}
                      </span>
                    )}
                  </div>
                );
              })}
              {target > 0 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 border-t-2 border-ink-2"
                  style={{ bottom: `${line * 100}%` }}
                />
              )}
            </div>

            <div aria-hidden="true" className="mt-2 flex gap-1.5 sm:gap-2">
              {weeks.map((week) => (
                <span
                  key={week.start}
                  className={
                    "min-w-0 flex-1 truncate text-center text-[11.5px] tnum " +
                    (week.current ? "font-medium text-ink" : "text-ink-3")
                  }
                >
                  {formatDayMonth(week.start)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
