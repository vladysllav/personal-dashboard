"use client";

import { useLayoutEffect, useRef } from "react";
import { Icon } from "./Icon";

/**
 * What the app shows while it is still being fetched: the mark, the name, and
 * a bar that fills.
 *
 * The bar has no real figure behind it — the server does not report how far
 * through a sign-in or a dashboard load it is — so it eases toward full and
 * never quite gets there, and the page replaces it when the data lands. What
 * makes it honest is that it measures from when the app was opened rather than
 * from when this element mounted: sign-in, the redirect and the dashboard load
 * each render their own copy, and a bar that started over at every hand-off
 * would read as three loads instead of one.
 */
export function LoadingScreen({
  label = "Loading your dashboard",
  className = "flex",
}: {
  label?: string;
  /** Display class, so a caller can show it only in some contexts (`hidden tg:flex`). */
  className?: string;
}) {
  const bar = useRef<HTMLSpanElement>(null);

  // Before paint, so the bar never flashes back to empty on hydration.
  useLayoutEffect(() => {
    if (bar.current) {
      bar.current.style.animationDelay = `-${Math.round(performance.now())}ms`;
    }
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex-col items-center justify-center gap-5 bg-canvas px-6 ${className}`}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-[44px] items-center justify-center rounded-[var(--radius-control)] border border-accent-700 bg-accent-600 text-ink"
      >
        <Icon name="target" size={24} />
      </span>

      <div className="flex w-full max-w-[220px] flex-col items-center gap-3">
        <span className="text-[13.5px] font-medium text-ink">Personal Dashboard</span>
        <span
          aria-hidden="true"
          className="relative block h-[6px] w-full overflow-hidden rounded-[var(--radius-pill)] bg-surface-3"
        >
          <span
            ref={bar}
            className="loading-bar absolute inset-y-0 left-0 rounded-[var(--radius-pill)] border border-accent-700 bg-accent-500"
          />
        </span>
        <span className="text-[11.5px] text-ink-3">{label}&hellip;</span>
      </div>
    </div>
  );
}
