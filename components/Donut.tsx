import { barFraction } from "@/lib/goals";
import type { GoalStatus } from "@/lib/types";

// viewBox units. A 12-wide stroke on r=40 gives the thick ring of the
// reference: heavy enough to read as a band rather than as a hairline, and
// still clear of the 100-unit box at its outer edge (40 + 6 = 46).
const R = 40;
const STROKE = 12;
const C = 2 * Math.PI * R;

/**
 * The circular twin of the PaceBar. The pale ring is the whole goal, the accent
 * arc is what you actually did, and a notch marks where the plan expects you
 * right now — so "ahead" and "behind" are still read from a gap.
 *
 * Like the bar, the arc is always the accent: it reports how much of the goal
 * is done, and the verdict on that sits in the badge beside it.
 */
export function Donut({
  progress,
  plannedProgress,
  status,
  size = 132,
  center,
  caption,
}: {
  progress: number;
  plannedProgress: number;
  status: GoalStatus;
  size?: number;
  /** Overrides the default percent figure (e.g. to show the target instead). */
  center?: string;
  caption?: string;
}) {
  const actual = barFraction(progress);
  const plan = barFraction(plannedProgress);
  const percent = Math.round(progress * 100);

  const complete = status === "complete";

  /**
   * The plan marker, as a radial tick across the band rather than a dash along
   * it. A dash is a segment of the ring, and on a band this thick it reads as a
   * dark blob bitten out of the arc; a tick crossing the band reads as what it
   * is — a mark on a scale. The angle is measured from 3 o'clock because the
   * whole svg is rotated a quarter turn to start the arc at the top.
   */
  const angle = plan * 2 * Math.PI;
  const tick = (radius: number) =>
    [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)] as const;
  const [tx1, ty1] = tick(R - STROKE / 2 - 1.5);
  const [tx2, ty2] = tick(R + STROKE / 2 + 1.5);

  /**
   * The figure scales with the ring instead of sitting at a fixed 17px, which
   * left a thumbnail-sized number inside a 168px circle. The unit is set
   * smaller and baseline-aligned against it, so "30%" reads as one figure with
   * its unit rather than as two words of equal weight.
   */
  const figure = Math.round(size * 0.26);
  const unit = Math.round(size * 0.15);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={caption ? `${center ?? `${percent}%`}. ${caption}` : center ?? `${percent}%`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={STROKE}
          stroke="var(--color-surface-3)"
        />
        {/* The arc is drawn twice: a slightly wider pass in the edge colour,
            then the yellow inside it. Yellow is 1.28:1 against its own track
            and never reaches 3:1 against any grey, so on its own the arc has
            no visible boundary — the rim is what makes it a shape. */}
        <circle
          className="arc-grow"
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={STROKE + 2}
          strokeLinecap="round"
          stroke="var(--color-accent-700)"
          opacity={0.9}
          strokeDasharray={C}
          strokeDashoffset={C - actual * C}
        />
        <circle
          className="arc-grow"
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          stroke="var(--color-accent-500)"
          strokeDasharray={C}
          strokeDashoffset={C - actual * C}
        />
        {!complete && plan > 0 && plan < 1 && (
          <line
            x1={tx1}
            y1={ty1}
            x2={tx2}
            y2={ty2}
            stroke="var(--color-ink-2)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        {center ? (
          <span
            className="font-semibold leading-none tracking-[-0.02em] text-ink tnum"
            style={{ fontSize: Math.round(size * 0.17) }}
          >
            {center}
          </span>
        ) : (
          <span className="flex items-baseline justify-center text-ink">
            <span
              className="font-semibold leading-none tracking-[-0.03em] tnum"
              style={{ fontSize: figure }}
            >
              {percent}
            </span>
            <span
              className="font-medium leading-none"
              style={{ fontSize: unit }}
            >
              %
            </span>
          </span>
        )}
        {caption && (
          <span className="mt-1.5 text-[11.5px] leading-tight text-ink-3">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
