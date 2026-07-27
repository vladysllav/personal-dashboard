import { barFraction } from "@/lib/goals";
import type { GoalStatus } from "@/lib/types";
import styles from "./Donut.module.css";

const R = 42;
const C = 2 * Math.PI * R;

/**
 * The circular twin of the PaceBar. Same grammar: the grey ring is the plan,
 * the yellow arc is what you actually did, and a notch on the ring marks where
 * the plan expects you right now — so "ahead" and "behind" are still read from
 * a gap, never from hue. The big figure in the middle is the completion percent.
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
  const label = center ?? `${percent}%`;

  // Plan notch: a tick sitting on the ring at the planned angle, drawn as a tiny
  // dash so it reads as a marker rather than a second arc.
  const notchLen = C * 0.012;
  const notchOffset = C - plan * C;

  const complete = status === "complete";

  return (
    <div
      className={styles.wrap}
      style={{ width: size, height: size }}
      role="img"
      aria-label={caption ? `${label}. ${caption}` : label}
    >
      <svg viewBox="0 0 100 100" className={styles.svg}>
        {/* Plan ring — quiet, the intention. */}
        <circle
          className={styles.track}
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={9}
        />
        {/* Actual arc — the only thing that glows. */}
        <circle
          className={complete ? `${styles.arc} ${styles.arcDone}` : styles.arc}
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - actual * C}
        />
        {/* Plan notch — where the plan expects you now. Hidden once complete. */}
        {!complete && plan > 0 && plan < 1 && (
          <circle
            className={styles.notch}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth={11}
            strokeDasharray={`${notchLen} ${C}`}
            strokeDashoffset={notchOffset}
          />
        )}
      </svg>
      <div className={styles.label}>
        <span className={`${styles.value} num`}>{label}</span>
        {caption && <span className={styles.caption}>{caption}</span>}
      </div>
    </div>
  );
}
