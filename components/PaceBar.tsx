import { barFraction } from "@/lib/goals";
import type { GoalStatus } from "@/lib/types";
import styles from "./PaceBar.module.css";

/**
 * A bullet chart, not a progress bar. Two tracks share one baseline and one
 * scale, so "ahead" and "behind" are read from the gap between them rather
 * than from colour. See DESIGN.md, "The Plan Is Grey, You Are Yellow Rule".
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

  const className = [
    styles.rail,
    status === "complete" ? styles.complete : "",
    status === "overdue" ? styles.overdue : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(actual * 100)}
      aria-valuetext={label}
    >
      <div
        className={`${styles.fill} ${styles.plan}`}
        style={{ transform: `scaleX(${plan})` }}
      />
      <div
        className={`${styles.fill} ${styles.actual}`}
        style={{ transform: `scaleX(${actual})` }}
      />
    </div>
  );
}
