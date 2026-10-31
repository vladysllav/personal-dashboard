"use client";

import { useEffect, useRef, useState } from "react";

export type AxisBar = {
  key: string;
  /** 0–1, or null for a bar with no reading (not lived yet, nothing asked). */
  value: number | null;
  /** Label under the bar. Thinned automatically when the bars are narrow. */
  tick: string;
  /** The full sentence shown on hover and read to screen readers. */
  detail: string;
  /** Today / this week — a darker step of the one hue. */
  emphasis?: boolean;
};

export function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];

/**
 * A plain percentage chart with both axes: 0–100% up the side, time along the
 * bottom. Where the compact bars print every reading, this one trades the
 * numbers for length — a whole month or a quarter, with the gridlines doing
 * the reading.
 */
export function AxisChart({
  bars,
  label,
  height = 190,
}: {
  bars: AxisBar[];
  label: string;
  height?: number;
}) {
  const [ref, width] = useMeasuredWidth();
  const pad = { top: 10, right: 4, bottom: 22, left: 34 };
  const plotW = Math.max(1, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const slot = plotW / Math.max(1, bars.length);
  const barW = Math.max(2, Math.min(28, slot * 0.66));
  // Room for roughly a 34px label under each shown tick.
  const every = Math.max(1, Math.ceil(34 / slot));
  const y = (v: number) => pad.top + (1 - v) * plotH;

  return (
    <div ref={ref} className="px-4 pb-4 pt-3 sm:px-5" style={{ minHeight: height + 28 }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--color-line)"
                strokeDasharray={t === 0 ? undefined : "3 3"}
              />
              <text
                x={pad.left - 6}
                y={y(t) + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--color-ink-3)"
                className="tnum"
              >
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}
          {bars.map((bar, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const v = bar.value === null ? 0 : Math.max(0, Math.min(1, bar.value));
            const h = v * plotH;
            return (
              <g key={bar.key}>
                <title>{bar.detail}</title>
                {/* A transparent column so the whole slot answers to hover. */}
                <rect x={cx - slot / 2} y={pad.top} width={slot} height={plotH} fill="transparent" />
                {bar.value !== null && h > 0 && (
                  <rect
                    x={cx - barW / 2}
                    y={y(v)}
                    width={barW}
                    height={Math.max(2, h)}
                    rx={Math.min(4, barW / 3)}
                    fill={bar.emphasis ? "var(--color-accent-600)" : "var(--color-accent-500)"}
                  />
                )}
                {i % every === 0 && (
                  <text
                    x={cx}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={bar.emphasis ? 600 : 400}
                    fill={bar.emphasis ? "var(--color-ink)" : "var(--color-ink-3)"}
                    className="tnum"
                  >
                    {bar.tick}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <ul className="visually-hidden">
        {bars.map((bar) => (
          <li key={bar.key}>{bar.detail}</li>
        ))}
      </ul>
    </div>
  );
}
