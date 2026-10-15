import { addDays, daysBetween, formatDayMonth } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { barFraction, type GoalDerived } from "@/lib/goals";
import type { Goal } from "@/lib/types";

const TICKS = 4;

/**
 * The whole goal as one thick bar: the value scale along the top, the calendar
 * along the bottom, and a dotted line where the plan expects you today. The
 * fill against that line is the read — no sentence needed to explain it.
 */
export function GoalProgressBar({
  goal,
  derived,
  label,
}: {
  goal: Goal;
  derived: GoalDerived;
  /** The full honest sentence, for screen readers. */
  label: string;
}) {
  const actual = barFraction(derived.progress);
  const plan = barFraction(derived.plannedProgress);
  const showPlan = derived.status !== "complete" && plan > 0 && plan < 1;

  const values = Array.from(
    { length: TICKS + 1 },
    (_, i) => goal.pointA + (derived.span * i) / TICKS,
  );
  const totalDays = Math.max(0, daysBetween(goal.startDate, derived.deadline));
  const dates = Array.from({ length: TICKS + 1 }, (_, i) =>
    addDays(goal.startDate, Math.round((totalDays * i) / TICKS)),
  );

  return (
    <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
      {/* The pace label gets a row of its own so it never collides with the
          scale beneath it. */}
      <div className="relative h-[18px]">
        {showPlan && (
          <span
            className="absolute top-0 whitespace-nowrap text-[12px] font-medium text-ink-2 tnum"
            style={{ left: `${plan * 100}%`, transform: `translateX(${edgeShift(plan)})` }}
          >
            Pace: {formatNumber(derived.expectedValue)}
          </span>
        )}
      </div>

      <Scale labels={values.map((v) => formatNumber(v))} />

      <div className="relative mt-1">
        <div
          className="relative h-[64px] overflow-hidden rounded-[12px] bg-surface-3 sm:h-[76px]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(actual * 100)}
          aria-valuetext={label}
        >
          <div
            className="bar-fill h-full rounded-[12px] border border-accent-700 bg-accent-500"
            style={{ width: `${actual * 100}%`, minWidth: actual > 0 ? 16 : 0 }}
          />
          {/* Quarter lines, faint, so the scale above can be read down into
              the bar. */}
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute inset-y-0 w-px bg-ink/10"
              style={{ left: `${(i / TICKS) * 100}%` }}
            />
          ))}
          <span className="absolute inset-y-0 right-3 flex flex-col items-end justify-center text-right leading-tight sm:right-4">
            <span className="text-[12px] text-ink-2">Progress</span>
            <span className="text-[15px] text-ink tnum sm:text-[17px]">
              <strong className="font-semibold">{formatNumber(derived.current)}</strong>
              <span className="text-ink-2">/{formatNumber(goal.pointB)}</span>
            </span>
          </span>
        </div>
        {showPlan && (
          <span
            aria-hidden="true"
            className="absolute -top-[20px] -bottom-1 w-0 -translate-x-1/2 border-l-2 border-dotted border-ink-2"
            style={{ left: `${plan * 100}%` }}
          />
        )}
      </div>

      <div className="mt-1.5">
        <Scale labels={dates.map(formatDayMonth)} />
      </div>
    </div>
  );
}

/** Evenly spaced labels; the two ends sit flush with the bar's edges. */
function Scale({ labels }: { labels: string[] }) {
  return (
    <div aria-hidden="true" className="relative h-[16px] text-[11.5px] text-ink-3 tnum">
      {labels.map((text, i) => {
        const at = i / (labels.length - 1);
        return (
          <span
            key={i}
            className="absolute top-0 whitespace-nowrap"
            style={{ left: `${at * 100}%`, transform: `translateX(${edgeShift(at)})` }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

/** Centre a label on its point, except near the ends, where it would overhang. */
function edgeShift(at: number): string {
  if (at <= 0.08) return "0";
  if (at >= 0.92) return "-100%";
  return "-50%";
}
