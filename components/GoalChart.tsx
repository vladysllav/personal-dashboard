"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STEP_NOUN } from "@/lib/dates";
import { formatValue } from "@/lib/format";
import type { GoalSeries } from "@/lib/series";
import type { GoalKind, StepUnit } from "@/lib/types";
import { Card, CardHead, Empty, Note, Seg } from "./ui";

type Mode = "cumulative" | "step";

/**
 * Two readings of the same entries: the running total against the plan, and
 * what was logged in each step. The plan is the neutral series and the fact is
 * the accent — grey here is a line you have to see, not a background.
 */
export function GoalChart({
  series,
  unit,
  kind,
  stepUnit,
}: {
  series: GoalSeries;
  unit: string;
  kind: GoalKind;
  stepUnit: StepUnit;
}) {
  const [mode, setMode] = useState<Mode>("cumulative");
  const [stepPlural] = [STEP_NOUN[stepUnit][1]];

  const hasData = series.points.some((p) => p.stepValue !== null);

  return (
    <Card aria-labelledby="chart-heading">
      <CardHead
        id="chart-heading"
        title={
          mode === "cumulative"
            ? "Cumulative progress against the plan"
            : `Logged each ${STEP_NOUN[stepUnit][0]}`
        }
        right={
          <Seg
            label="Chart mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "cumulative", label: "Total" },
              { value: "step", label: `Per ${STEP_NOUN[stepUnit][0]}` },
            ]}
          />
        }
      />

      {hasData ? (
        <div className="p-4 sm:p-5">
          <Plot
            series={series}
            unit={unit}
            kind={kind}
            mode={mode}
            stepPlural={stepPlural}
          />
          <Legend mode={mode} kind={kind} />
        </div>
      ) : (
        <Empty>
          No entries logged yet. Record progress and it will chart here, one
          point per {STEP_NOUN[stepUnit][0]}.
        </Empty>
      )}

      {/* The footnote follows the mode: in the per-step view there is no plan
          line to explain, and a measure goal has no reference line at all. */}
      <Note>
        The x axis counts {stepPlural} from the start date.{" "}
        {mode === "cumulative"
          ? "The plan line is the pace you committed to on day one."
          : kind === "accumulate"
            ? `Each bar is what you logged in that ${STEP_NOUN[stepUnit][0]}, against the reference amount.`
            : `Each point is a reading, placed on the ${STEP_NOUN[stepUnit][0]} it was taken.`}
      </Note>
    </Card>
  );
}

/**
 * The chart is drawn in CSS pixels, not in a fixed viewBox scaled to fit.
 *
 * A 720-wide viewBox squeezed into a 330px phone card scales everything by
 * 0.46 — including the type, which lands at about 5px and stops being
 * readable. Measuring the container instead keeps the scale at 1:1, so an
 * 11.5px axis label is 11.5px on every screen, and lets the chart choose a
 * shorter height and fewer ticks when it is narrow.
 */
function useMeasuredWidth() {
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

/**
 * A rounded step for an axis: 1, 2, 5 or 10 times a power of ten. Gridlines
 * land on numbers a person would have chosen — 0, 100, 200 — instead of on
 * whatever the data extent happens to be.
 */
function niceStep(rough: number): number {
  if (!(rough > 0)) return 1;
  const exponent = Math.floor(Math.log10(rough));
  const magnitude = 10 ** exponent;
  const fraction = rough / magnitude;
  const nice = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
  return nice * magnitude;
}

/**
 * A whole-number spacing for the x axis that always lands on the last step.
 *
 * The axis counts steps to a deadline, so the final tick *is* the deadline and
 * has to carry a label. Dividing 90 days by "about six" gave 0, 23, 46, 69, 90
 * — arithmetic nobody reads in days. Picking a count that divides the span
 * evenly instead gives 0, 15, 30, 45, 60, 75, 90.
 */
function xTickStep(totalSteps: number, desired: number): number {
  for (const count of [desired, desired - 1, desired + 1, desired - 2, desired + 2]) {
    if (count >= 2 && totalSteps % count === 0) return totalSteps / count;
  }
  return Math.max(1, Math.ceil(totalSteps / desired));
}

/** Round the extent outward onto that step, and list the ticks on it. */
function niceDomain(lo: number, hi: number, count: number) {
  if (!(hi > lo)) {
    const pad = Math.abs(hi) || 1;
    lo = hi - pad;
    hi = hi + pad;
  }
  const step = niceStep((hi - lo) / Math.max(1, count));
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;

  const ticks: number[] = [];
  // Accumulated addition drifts on decimal steps (0.1 + 0.2), so each tick is
  // computed from the index instead of from the previous tick.
  const steps = Math.round((max - min) / step);
  for (let i = 0; i <= steps; i += 1) ticks.push(min + i * step);

  return { min, max, ticks };
}

function Plot({
  series,
  unit,
  kind,
  mode,
  stepPlural,
}: {
  series: GoalSeries;
  unit: string;
  kind: GoalKind;
  mode: Mode;
  stepPlural: string;
}) {
  const { points, totalSteps: N, elapsedSteps, pointB, referencePerStep } = series;
  const [ref, width] = useMeasuredWidth();

  const narrow = width > 0 && width < 520;
  const height = width === 0 ? 260 : narrow ? 200 : width < 820 ? 240 : 280;

  const geom = useMemo(() => {
    // Y domain differs by mode: the total view spans progress values, the
    // per-step view spans the amounts logged in each step.
    let values: number[];
    if (mode === "cumulative") {
      values = [
        series.pointA,
        pointB,
        ...points.map((p) => p.planned),
        ...points.filter((p) => p.elapsed).map((p) => p.cumulative),
      ];
    } else {
      const logged = points
        .map((p) => p.stepValue)
        .filter((v): v is number => v !== null);
      values =
        kind === "measure"
          ? [pointB, ...logged]
          : [0, referencePerStep, ...logged];
    }

    /**
     * An `accumulate` goal counts a quantity up from nothing, so zero is a real
     * floor: padding the axis below it produced "−32 km", which is not a
     * distance anyone has run. A `measure` goal is a reading on a scale with no
     * meaningful zero — 78 kg is not "78 more than none" — so its band is
     * allowed to float, and the rounding below gives it room on both sides.
     */
    const lo = kind === "measure" ? Math.min(...values) : Math.min(0, ...values);
    const hi = Math.max(...values);

    const domain = niceDomain(lo, hi, narrow ? 3 : 4);

    // The left gutter is sized to the widest label it has to hold, so the
    // figures never collide with the plot and never leave a gap either.
    const widest = Math.max(
      ...domain.ticks.map((v) => formatValue(v, unit).length),
    );
    const left = Math.min(72, Math.max(30, widest * 6.6 + 12));
    const pad = { top: 22, right: narrow ? 10 : 16, bottom: 34, left };

    const plotW = Math.max(1, width - pad.left - pad.right);
    const plotH = Math.max(1, height - pad.top - pad.bottom);

    const x = (step: number) => pad.left + (step / N) * plotW;
    const y = (v: number) =>
      pad.top + (1 - (v - domain.min) / (domain.max - domain.min)) * plotH;

    return { ...domain, x, y, pad, plotW, plotH };
  }, [
    mode,
    points,
    N,
    pointB,
    referencePerStep,
    series.pointA,
    kind,
    unit,
    width,
    height,
    narrow,
  ]);

  const { x, y, pad } = geom;

  const tickEvery = xTickStep(N, narrow ? 4 : 6);
  const xticks: number[] = [];
  for (let s = 0; s <= N; s += tickEvery) xticks.push(s);
  // Only reachable through xTickStep's fallback, where the span divides by
  // nothing near the wanted count and the last tick lands short of the end.
  const lastTick = xticks[xticks.length - 1];
  if (lastTick !== N) {
    if (lastTick !== undefined && N - lastTick < tickEvery * 0.6) xticks.pop();
    xticks.push(N);
  }

  // The target sits on a gridline whenever the axis rounds to it — and then
  // "target 400 km" is the same 400 km the axis already prints one line to the
  // left. The word alone keeps the meaning without the echo.
  const targetOnGrid = geom.ticks.some(
    (v) => Math.abs(y(v) - y(pointB)) < 0.5,
  );

  return (
    <div ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img">
          {geom.ticks.map((v) => (
            <g key={`y${v}`}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--color-line)"
              />
              <text
                x={pad.left - 8}
                y={y(v)}
                dy="0.32em"
                textAnchor="end"
                fill="var(--color-ink-3)"
                fontSize={11.5}
                className="tnum"
              >
                {formatValue(v, unit)}
              </text>
            </g>
          ))}

          {xticks.map((s) => (
            <text
              key={`x${s}`}
              x={x(s)}
              y={height - pad.bottom + 18}
              textAnchor="middle"
              fill="var(--color-ink-3)"
              fontSize={11.5}
              className="tnum"
            >
              {s}
            </text>
          ))}
          <text
            x={pad.left + geom.plotW / 2}
            y={height - 2}
            textAnchor="middle"
            fill="var(--color-ink-3)"
            fontSize={11.5}
          >
            {stepPlural}
          </text>

          {mode === "cumulative" ? (
            <CumulativeLayer
              series={series}
              x={x}
              y={y}
              min={geom.min}
              unit={unit}
              kind={kind}
              targetOnGrid={targetOnGrid}
            />
          ) : (
            <StepLayer
              series={series}
              x={x}
              y={y}
              min={geom.min}
              kind={kind}
              elapsedSteps={elapsedSteps}
              plotW={geom.plotW}
            />
          )}
        </svg>
      )}
    </div>
  );
}

function CumulativeLayer({
  series,
  x,
  y,
  min,
  unit,
  kind,
  targetOnGrid,
}: {
  series: GoalSeries;
  x: (s: number) => number;
  y: (v: number) => number;
  min: number;
  unit: string;
  kind: GoalKind;
  targetOnGrid: boolean;
}) {
  const { points, pointB, elapsedSteps, totalSteps: N } = series;

  const planPath = points.map((p) => `${x(p.step)},${y(p.planned)}`).join(" ");

  const done = points.filter((p) => p.elapsed);
  const first = done[0];
  const last = done[done.length - 1];
  const actualPath = done.map((p) => `${x(p.step)},${y(p.cumulative)}`).join(" ");
  const baseline = y(min);

  /**
   * The area belongs to a running total, where it is the work done so far. On a
   * `measure` goal the line is a reading, not a sum, and filling under it shades
   * everything between 82 kg and the bottom of the axis — a block that looks
   * like progress and means nothing.
   */
  const areaPath =
    kind === "accumulate" && first && last
      ? [
          `M ${x(first.step)} ${baseline}`,
          ...done.map((p) => `L ${x(p.step)} ${y(p.cumulative)}`),
          `L ${x(last.step)} ${baseline}`,
          "Z",
        ].join(" ")
      : "";

  return (
    <>
      <line
        x1={x(0)}
        x2={x(N)}
        y1={y(pointB)}
        y2={y(pointB)}
        stroke="var(--color-line-strong)"
        strokeDasharray="2 4"
      />
      <text
        x={x(N)}
        y={y(pointB) - 6}
        textAnchor="end"
        fill="var(--color-ink-3)"
        fontSize={11.5}
      >
        {targetOnGrid ? "target" : `target ${formatValue(pointB, unit)}`}
      </text>

      {/* The plan — the pace committed to on day one. */}
      <polyline
        points={planPath}
        fill="none"
        stroke="var(--color-s-muted)"
        strokeWidth={1.75}
        strokeDasharray="5 4"
      />

      {areaPath && (
        <path d={areaPath} fill="var(--color-accent-500)" fillOpacity={0.3} />
      )}
      {done.length > 1 && (
        <polyline
          points={actualPath}
          fill="none"
          stroke="var(--color-s1)"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {last && elapsedSteps >= 0 && (
        <circle
          cx={x(last.step)}
          cy={y(last.cumulative)}
          r={4.5}
          fill="var(--color-accent-700)"
          stroke="var(--color-surface)"
          strokeWidth={2}
        />
      )}
    </>
  );
}

function StepLayer({
  series,
  x,
  y,
  min,
  kind,
  elapsedSteps,
  plotW,
}: {
  series: GoalSeries;
  x: (s: number) => number;
  y: (v: number) => number;
  min: number;
  kind: GoalKind;
  elapsedSteps: number;
  plotW: number;
}) {
  const { points, totalSteps: N, referencePerStep, descending } = series;
  const baseline = y(min);
  const bandWidth = plotW / N;
  const barWidth = Math.max(2, bandWidth * 0.56);

  const logged = points.filter((p) => p.stepValue !== null);

  return (
    <>
      {kind === "accumulate" && (
        <>
          <line
            x1={x(0)}
            x2={x(N)}
            y1={y(referencePerStep)}
            y2={y(referencePerStep)}
            stroke="var(--color-s-muted)"
            strokeWidth={1.75}
            strokeDasharray="5 4"
          />
          <text
            x={x(N)}
            y={y(referencePerStep) - 6}
            textAnchor="end"
            fill="var(--color-ink-3)"
            fontSize={11.5}
          >
            {`${descending ? "reduce" : "add"} ${formatValue(referencePerStep, "")}/step`}
          </text>
        </>
      )}

      {kind === "accumulate" ? (
        logged.map((p) => {
          const top = y(p.stepValue as number);
          const h = Math.abs(baseline - top);
          return (
            <rect
              key={p.step}
              x={x(p.step) - barWidth / 2}
              y={Math.min(baseline, top)}
              width={barWidth}
              height={h}
              rx={2}
              fill="var(--color-accent-500)"
              stroke="var(--color-accent-700)"
              strokeWidth={1}
            />
          );
        })
      ) : (
        <>
          <polyline
            points={logged
              .map((p) => `${x(p.step)},${y(p.stepValue as number)}`)
              .join(" ")}
            fill="none"
            stroke="var(--color-s1)"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {logged.map((p) => (
            <circle
              key={p.step}
              cx={x(p.step)}
              cy={y(p.stepValue as number)}
              r={3.5}
              fill="var(--color-accent-700)"
              stroke="var(--color-surface)"
              strokeWidth={1.5}
            />
          ))}
        </>
      )}
      {/* keep elapsedSteps referenced for future extension without a lint error */}
      {elapsedSteps < 0 && null}
    </>
  );
}

function Legend({ mode, kind }: { mode: Mode; kind: GoalKind }) {
  const items =
    mode === "cumulative"
      ? [
          { color: "var(--color-s1)", dashed: false, label: "You" },
          { color: "var(--color-s-muted)", dashed: true, label: "Plan" },
        ]
      : kind === "accumulate"
        ? [
            { color: "var(--color-s1)", dashed: false, label: "Logged" },
            { color: "var(--color-s-muted)", dashed: true, label: "Per-step reference" },
          ]
        : [{ color: "var(--color-s1)", dashed: false, label: "Reading" }];

  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-ink-3">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-0 w-4 rounded-full"
            style={{
              borderTopWidth: 2,
              borderTopStyle: it.dashed ? "dashed" : "solid",
              borderTopColor: it.color,
            }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
