import { barFraction } from "@/lib/goals";
import type { GoalStatus } from "@/lib/types";

/**
 * A bullet chart, not a progress bar. The filled bar is where you actually are;
 * the upright marker is where the plan expects you today. "Ahead" and "behind"
 * are read from the gap between the two.
 *
 * The fill is always the accent, because the bar reports a quantity — how much
 * of the goal is done — and that fact is the same fact whether you are early or
 * late. The verdict on it lives next to the bar, in the status badge and in the
 * distance from the marker, which is where a reader looks for a verdict anyway.
 */
export function PaceBar({
  progress,
  plannedProgress,
  status,
  label,
}: {
  progress: number;
  plannedProgress: number;
  status: GoalStatus;
  /** The full honest sentence, for screen readers. */
  label: string;
}) {
  const actual = barFraction(progress);
  const plan = barFraction(plannedProgress);

  return (
    <div
      className="relative h-[20px] w-full"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(actual * 100)}
      aria-valuetext={label}
    >
      <div className="absolute inset-x-0 top-[3px] h-[14px] rounded-full bg-surface-3">
        {/* Width rather than scaleX: a scaled bar squashes its own round cap
            into an ellipse, which is invisible at 8px and obvious at 14. */}
        <div
          className="bar-fill h-full rounded-full bg-accent-500"
          style={{
            width: `${actual * 100}%`,
            // A cap's worth of bar, so a goal just started still reads as
            // started instead of as an empty track.
            minWidth: actual > 0 ? 14 : 0,
          }}
        />
      </div>
      {plan > 0 && plan < 1 && status !== "complete" && (
        <span
          aria-hidden="true"
          title="Where the plan expects you today"
          className="absolute top-0 h-[20px] w-[2.5px] -translate-x-1/2 rounded-full bg-ink-2"
          style={{ left: `${plan * 100}%` }}
        />
      )}
    </div>
  );
}
