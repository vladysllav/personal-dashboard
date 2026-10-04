"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * The one-tap control the whole product is built around. Kept is accent-50 with
 * accent-700 text and a filled tick; not kept is a plain surface pill with an
 * empty ring — state doubled by shape, never carried by colour alone.
 */
export function TickChip({
  done,
  size = "md",
  onClick,
  children,
  srSuffix,
}: {
  done: boolean;
  size?: "sm" | "md";
  onClick: () => void;
  children: ReactNode;
  /** Extra context for assistive tech, e.g. the date being toggled. */
  srSuffix?: string;
}) {
  const dot = size === "sm" ? 15 : 18;

  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-[10px] border " +
        (size === "sm"
          ? "px-2.5 py-1 text-[13px] "
          : "px-3 py-2 text-[13.5px] ") +
        (done
          ? "border-accent-500 bg-accent-50 text-accent-700"
          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink")
      }
    >
      <span
        aria-hidden="true"
        style={{ width: dot, height: dot }}
        className={
          "inline-flex shrink-0 items-center justify-center rounded-full border " +
          (done
            ? "border-accent-700 bg-accent-600 text-ink"
            : "border-line-strong")
        }
      >
        {done && <Icon name="check" size={size === "sm" ? 10 : 12} />}
      </span>
      <span className="truncate">{children}</span>
      {srSuffix && <span className="visually-hidden">{srSuffix}</span>}
    </button>
  );
}
