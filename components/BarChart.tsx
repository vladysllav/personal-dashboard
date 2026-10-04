"use client";

export type Bar = {
  key: string;
  /** 0–1. Drives the height; nothing else encodes it. */
  value: number;
  /** Axis tick under the bar. */
  tick: string;
  /** The reading printed at the head of the track. Omit for a bar with no result. */
  readout?: string;
  /** The full sentence shown on hover. */
  detail: string;
  /** The bar for today / this week — one step darker, never a second hue. */
  emphasis?: boolean;
  /** No result to show: a day ahead of today, or nothing running. */
  pending?: boolean;
};

/**
 * A single-series magnitude chart, few enough bars to label every one.
 *
 * The track behind each bar is the full 100%, and the reading sits at its head
 * — so the number is exact and the fill is the shape of it. That pairing is
 * what lets the window be this short: seven bars with their values printed
 * says more at a glance than thirty bars you have to hover to read.
 *
 * One hue, because there is one series. The current bar is a darker step of it
 * rather than a second colour, so "now" reads as emphasis and not as a
 * category. Bars ahead of today are empty tracks: an unlived Thursday is not a
 * zero, and drawing it as one would be a lie about the past.
 */
export function BarChart({
  bars,
  label,
  height = 150,
}: {
  bars: Bar[];
  /** What the whole chart is, for screen readers. */
  label: string;
  height?: number;
}) {
  return (
    <div className="p-4 sm:p-5">
      <div
        className="flex items-end gap-1.5 sm:gap-2"
        style={{ height }}
        role="img"
        aria-label={label}
      >
        {bars.map((bar) => (
          <div
            key={bar.key}
            title={bar.detail}
            className={
              "relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-[10px] p-1 pt-7 " +
              (bar.pending
                ? "border border-dashed border-line"
                : bar.emphasis
                  ? "bg-accent-50"
                  : "bg-surface-3")
            }
          >
            <span
              aria-hidden="true"
              className={
                "absolute inset-x-0 top-[7px] truncate px-1 text-center text-[11.5px] tnum " +
                (bar.pending
                  ? "text-ink-3"
                  : bar.emphasis
                    ? "font-medium text-ink"
                    : "text-ink-2")
              }
            >
              {bar.readout ?? "—"}
            </span>
            {!bar.pending && bar.value > 0 && (
              <div
                className="w-full rounded-[8px]"
                style={{
                  // A floor for small values so a 2% day is still a visible
                  // mark — but a true zero draws nothing at all. Padding it up
                  // to a stub would make "none" and "barely any" the same
                  // picture, and the empty track already says zero next to a
                  // printed 0%.
                  height: `${Math.max(4, Math.round(bar.value * 100))}%`,
                  background: bar.emphasis
                    ? "var(--color-accent-600)"
                    : "var(--color-accent-200)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="mt-2 flex gap-1.5 sm:gap-2">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className={
              "min-w-0 flex-1 truncate text-center text-[11.5px] " +
              (bar.emphasis ? "font-medium text-ink" : "text-ink-3")
            }
          >
            {bar.tick}
          </span>
        ))}
      </div>

      {/* The chart is a picture; this is the same data as text. */}
      <ul className="visually-hidden">
        {bars.map((bar) => (
          <li key={bar.key}>{bar.detail}</li>
        ))}
      </ul>
    </div>
  );
}
