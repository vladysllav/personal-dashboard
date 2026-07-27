"use client";

import { useId, useMemo, useState } from "react";
import { STEP_NOUN } from "@/lib/dates";
import { formatValue } from "@/lib/format";
import type { GoalSeries } from "@/lib/series";
import type { GoalKind, StepUnit } from "@/lib/types";
import styles from "./GoalChart.module.css";

type Mode = "cumulative" | "step";

// viewBox geometry. Unitless; the SVG scales to its container width.
const W = 720;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 34, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

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
  const labelId = useId();
  const [stepPlural] = [STEP_NOUN[stepUnit][1]];

  const hasData = series.points.some((p) => p.stepValue !== null);

  return (
    <figure className={styles.figure} aria-labelledby={labelId}>
      <div className={styles.head}>
        <figcaption id={labelId} className={styles.caption}>
          {mode === "cumulative"
            ? "Cumulative progress against the plan"
            : `Logged each ${STEP_NOUN[stepUnit][0]}`}
        </figcaption>
        <div className={styles.toggle} role="tablist" aria-label="Chart mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "cumulative"}
            className={styles.toggleBtn}
            data-active={mode === "cumulative"}
            onClick={() => setMode("cumulative")}
          >
            Total
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "step"}
            className={styles.toggleBtn}
            data-active={mode === "step"}
            onClick={() => setMode("step")}
          >
            Per {STEP_NOUN[stepUnit][0]}
          </button>
        </div>
      </div>

      {hasData ? (
        <Plot series={series} unit={unit} kind={kind} mode={mode} stepPlural={stepPlural} />
      ) : (
        <p className={styles.empty}>
          No entries logged yet. Record progress and it will chart here, one
          point per {STEP_NOUN[stepUnit][0]}.
        </p>
      )}

      <Legend mode={mode} kind={kind} />
    </figure>
  );
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

    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      // A flat series still needs a band to draw in.
      const pad = Math.abs(min) || 1;
      min -= pad;
      max += pad;
    } else {
      const pad = (max - min) * 0.08;
      min -= pad;
      max += pad;
    }

    const x = (step: number) => PAD.left + (step / N) * PLOT_W;
    const y = (v: number) =>
      PAD.top + (1 - (v - min) / (max - min)) * PLOT_H;

    return { min, max, x, y };
  }, [mode, points, N, pointB, referencePerStep, series.pointA, kind]);

  const { x, y } = geom;

  const tickEvery = Math.max(1, Math.ceil(N / 6));
  const xticks: number[] = [];
  for (let s = 0; s <= N; s += tickEvery) xticks.push(s);
  if (xticks[xticks.length - 1] !== N) xticks.push(N);

  const yticks = [geom.max, (geom.max + geom.min) / 2, geom.min];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.svg}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      {/* Y gridlines + labels */}
      {yticks.map((v, i) => (
        <g key={`y${i}`}>
          <line
            className={styles.grid}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
          />
          <text className={styles.axisText} x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end">
            {formatValue(v, unit)}
          </text>
        </g>
      ))}

      {/* X labels */}
      {xticks.map((s) => (
        <text
          key={`x${s}`}
          className={styles.axisText}
          x={x(s)}
          y={H - PAD.bottom + 20}
          textAnchor="middle"
        >
          {s}
        </text>
      ))}
      <text
        className={styles.axisTitle}
        x={PAD.left + PLOT_W / 2}
        y={H - 2}
        textAnchor="middle"
      >
        {stepPlural}
      </text>

      {mode === "cumulative" ? (
        <CumulativeLayer series={series} x={x} y={y} min={geom.min} unit={unit} />
      ) : (
        <StepLayer
          series={series}
          x={x}
          y={y}
          min={geom.min}
          kind={kind}
          elapsedSteps={elapsedSteps}
        />
      )}
    </svg>
  );
}

function CumulativeLayer({
  series,
  x,
  y,
  min,
  unit,
}: {
  series: GoalSeries;
  x: (s: number) => number;
  y: (v: number) => number;
  min: number;
  unit: string;
}) {
  const { points, pointB, elapsedSteps, totalSteps: N } = series;

  const planPath = points.map((p) => `${x(p.step)},${y(p.planned)}`).join(" ");

  const done = points.filter((p) => p.elapsed);
  const first = done[0];
  const last = done[done.length - 1];
  const actualPath = done.map((p) => `${x(p.step)},${y(p.cumulative)}`).join(" ");
  const baseline = y(min);
  const areaPath =
    first && last
      ? [
          `M ${x(first.step)} ${baseline}`,
          ...done.map((p) => `L ${x(p.step)} ${y(p.cumulative)}`),
          `L ${x(last.step)} ${baseline}`,
          "Z",
        ].join(" ")
      : "";

  return (
    <>
      {/* Target guide */}
      <line
        className={styles.targetLine}
        x1={x(0)}
        x2={x(N)}
        y1={y(pointB)}
        y2={y(pointB)}
      />
      <text className={styles.targetText} x={x(N)} y={y(pointB) - 6} textAnchor="end">
        target {formatValue(pointB, unit)}
      </text>

      {/* Plan reference line (эталон) */}
      <polyline className={styles.planLine} points={planPath} fill="none" />

      {/* Actual cumulative */}
      {areaPath && <path className={styles.area} d={areaPath} />}
      {done.length > 1 && (
        <polyline className={styles.actualLine} points={actualPath} fill="none" />
      )}
      {last && elapsedSteps >= 0 && (
        <circle className={styles.dot} cx={x(last.step)} cy={y(last.cumulative)} r={4.5} />
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
}: {
  series: GoalSeries;
  x: (s: number) => number;
  y: (v: number) => number;
  min: number;
  kind: GoalKind;
  elapsedSteps: number;
}) {
  const { points, totalSteps: N, referencePerStep, descending } = series;
  const baseline = y(min);
  const bandWidth = PLOT_W / N;
  const barWidth = Math.max(2, bandWidth * 0.56);

  const logged = points.filter((p) => p.stepValue !== null);

  return (
    <>
      {/* Reference per-step line — only where "amount per step" is the read. */}
      {kind === "accumulate" && (
        <>
          <line
            className={styles.refLine}
            x1={x(0)}
            x2={x(N)}
            y1={y(referencePerStep)}
            y2={y(referencePerStep)}
          />
          <text
            className={styles.refText}
            x={x(N)}
            y={y(referencePerStep) - 6}
            textAnchor="end"
          >
            {descending ? "reduce" : "add"} {formatValue(referencePerStep, "")}/step
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
              className={styles.bar}
              x={x(p.step) - barWidth / 2}
              y={Math.min(baseline, top)}
              width={barWidth}
              height={h}
              rx={2}
            />
          );
        })
      ) : (
        <>
          <polyline
            className={styles.actualLine}
            points={logged.map((p) => `${x(p.step)},${y(p.stepValue as number)}`).join(" ")}
            fill="none"
          />
          {logged.map((p) => (
            <circle
              key={p.step}
              className={styles.dot}
              cx={x(p.step)}
              cy={y(p.stepValue as number)}
              r={3.5}
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
          { cls: styles.swActual, label: "You" },
          { cls: styles.swPlan, label: "Plan (эталон)" },
          { cls: styles.swTarget, label: "Target" },
        ]
      : kind === "accumulate"
        ? [
            { cls: styles.swActual, label: "Logged" },
            { cls: styles.swRef, label: "Per-step reference" },
          ]
        : [{ cls: styles.swActual, label: "Reading" }];

  return (
    <ul className={styles.legend}>
      {items.map((it) => (
        <li key={it.label} className={styles.legendItem}>
          <span className={`${styles.sw} ${it.cls}`} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
