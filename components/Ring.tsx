import type { ReactNode } from "react";

const R = 42;
const STROKE = 10;
const C = 2 * Math.PI * R;

/**
 * A plain progress ring: a pale track and one flat arc, no rim, square ends —
 * the same drawing as `Donut`, without the goal-specific plan tick. Whatever
 * is passed as children sits in the middle.
 */
export function Ring({
  value,
  size = 120,
  color = "var(--color-ink)",
  label,
  children,
}: {
  /** 0–1; anything above 1 draws a full ring. */
  value: number;
  size?: number;
  color?: string;
  label: string;
  children?: ReactNode;
}) {
  const share = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth={STROKE} stroke="var(--color-surface-3)" />
        <circle
          className="arc-grow"
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={STROKE}
          stroke={color}
          strokeDasharray={C}
          strokeDashoffset={C - share * C}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
