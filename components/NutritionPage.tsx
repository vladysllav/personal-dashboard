"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  WEEKDAY_SHORT,
  addDays,
  dayOfMonth,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  fromDateKey,
  startOfWeek,
  weekdayIndex,
} from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import {
  calorieDays,
  dayTotals,
  hasLog,
  latestWeight,
  macroCalories,
  weightSeries,
  type WeightPeriod,
} from "@/lib/nutrition";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { Macros, Nutrition } from "@/lib/types";
import { PageHeader } from "./AppShell";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { Ring } from "./Ring";
import { Button, Card, CardHead, Empty, Field, Input, Seg } from "./ui";

/**
 * Nutrition: a week of days on top, the chosen day's calories and macros
 * against the plan, the two things you log, then weight by week or month and
 * calories day by day.
 *
 * There is deliberately no list of what was eaten. The day is its totals; the
 * plan is what they are read against.
 */
export function NutritionPage() {
  const { state, ready } = useStore();
  const today = useToday();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<null | "food" | "weight" | "plan">(null);

  if (!ready || !today) return null;

  const day = selected ?? today;
  const nutrition = state.nutrition;
  const plan = nutrition.plan;
  const eaten = dayTotals(nutrition, day);

  return (
    <>
      <PageHeader
        title="Nutrition"
        actions={
          <Button icon={<Icon name="edit" size={15} />} onClick={() => setOpen("plan")}>
            {plan ? "Plan" : "Set plan"}
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <DayStrip
          nutrition={nutrition}
          selected={day}
          today={today}
          onSelect={setSelected}
        />

        <CaloriesCard
          eaten={eaten.calories}
          plan={plan?.calories ?? null}
          onEditPlan={() => setOpen("plan")}
        />

        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <MacroCard label="Protein" color="var(--color-neg-600)" eaten={eaten.protein} plan={plan?.protein ?? null} />
          <MacroCard label="Carbs" color="var(--color-accent-500)" eaten={eaten.carbs} plan={plan?.carbs ?? null} />
          <MacroCard label="Fat" color="var(--color-violet)" eaten={eaten.fat} plan={plan?.fat ?? null} />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <Button
            variant="primary"
            className="justify-center py-3"
            icon={<Icon name="plus" size={16} />}
            onClick={() => setOpen("food")}
          >
            Log food
          </Button>
          <Button
            className="justify-center py-3"
            icon={<Icon name="plus" size={16} />}
            onClick={() => setOpen("weight")}
          >
            Log weight
          </Button>
        </div>

        <WeightCard nutrition={nutrition} today={today} />

        <CaloriesChart
          nutrition={nutrition}
          today={today}
          selected={day}
          onSelect={setSelected}
        />
      </div>

      {open === "food" && (
        <FoodForm date={day} today={today} current={eaten} onClose={() => setOpen(null)} />
      )}
      {open === "weight" && (
        <WeightForm date={day} today={today} onClose={() => setOpen(null)} />
      )}
      {open === "plan" && <PlanForm plan={plan} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------- Days ---------- */

function DayStrip({
  nutrition,
  selected,
  today,
  onSelect,
}: {
  nutrition: Nutrition;
  selected: string;
  today: string;
  onSelect: (day: string) => void;
}) {
  const weekStart = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const nextWeek = addDays(weekStart, 7);

  return (
    <section aria-label="Week" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13.5px] font-medium text-ink">{formatMonthYear(selected)}</h2>
        <div className="flex items-center gap-0.5">
          <StripButton label="Previous week" onClick={() => onSelect(addDays(selected, -7))}>
            <Icon name="chevronLeft" size={16} />
          </StripButton>
          <StripButton
            label="Next week"
            disabled={nextWeek > today}
            onClick={() => {
              const next = addDays(selected, 7);
              onSelect(next > today ? today : next);
            }}
          >
            <Icon name="chevronRight" size={16} />
          </StripButton>
          {weekStart !== startOfWeek(today) && (
            <button
              type="button"
              onClick={() => onSelect(today)}
              className="ml-1 rounded-[var(--radius-badge)] px-2 py-1 text-[12.5px] text-ink-2 hover:bg-surface-3 hover:text-ink"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const isSelected = day === selected;
          const future = day > today;
          const logged = hasLog(nutrition, day);
          return (
            <li key={day}>
              <button
                type="button"
                disabled={future}
                onClick={() => onSelect(day)}
                aria-pressed={isSelected}
                aria-label={`${formatLongDate(day)}${logged ? " — logged" : ""}`}
                className={
                  "flex w-full flex-col items-center gap-1 rounded-[var(--radius-control)] px-1 py-2.5 disabled:cursor-not-allowed " +
                  (isSelected
                    ? "bg-ink text-surface"
                    : future
                      ? "bg-surface-2 text-ink-3 opacity-60"
                      : "bg-surface-3 text-ink-2 hover:bg-line")
                }
              >
                <span aria-hidden="true" className="text-[11.5px] leading-none">
                  {WEEKDAY_SHORT[weekdayIndex(day)]}
                </span>
                <span aria-hidden="true" className="text-[17px] font-semibold leading-none tnum">
                  {dayOfMonth(day)}
                </span>
                {/* A dot under every day with something logged. */}
                <span
                  aria-hidden="true"
                  className={"size-1 rounded-full " + (logged ? "bg-current" : "bg-transparent")}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StripButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-[var(--radius-badge)] p-1.5 text-ink-3 hover:bg-surface-3 hover:text-ink disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/* ---------- Calories and macros ---------- */

function CaloriesCard({
  eaten,
  plan,
  onEditPlan,
}: {
  eaten: number;
  plan: number | null;
  onEditPlan: () => void;
}) {
  const over = plan !== null && eaten > plan;
  const left = plan === null ? null : Math.abs(plan - eaten);

  return (
    <Card className="flex items-center justify-between gap-4 p-5 sm:p-6">
      <div className="min-w-0">
        <span className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Calories
        </span>
        <span className="mt-1 block text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink tnum sm:text-[52px]">
          {formatNumber(Math.round(eaten))}
        </span>
        {plan !== null ? (
          <button
            type="button"
            onClick={onEditPlan}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink tnum"
          >
            of {formatNumber(plan)} eaten
            <Icon name="edit" size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onEditPlan}
            className="mt-2 text-[13px] text-accent-700 hover:text-ink"
          >
            Set a daily plan
          </button>
        )}
      </div>

      <Ring
        value={plan ? eaten / plan : 0}
        size={128}
        color={over ? "var(--color-neg-600)" : "var(--color-ink)"}
        label={
          plan === null
            ? `${Math.round(eaten)} calories eaten`
            : `${Math.round(left!)} calories ${over ? "over" : "left"}`
        }
      >
        {plan !== null && (
          <>
            <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tnum">
              {formatNumber(Math.round(left!))}
            </span>
            <span className="mt-1 text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {over ? "over" : "left"}
            </span>
          </>
        )}
      </Ring>
    </Card>
  );
}

function MacroCard({
  label,
  color,
  eaten,
  plan,
}: {
  label: string;
  color: string;
  eaten: number;
  plan: number | null;
}) {
  const share = plan ? Math.min(1, eaten / plan) : 0;
  const diff = plan === null ? null : plan - eaten;

  return (
    <Card className="min-w-0 p-2.5 sm:p-4">
      <span className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-2 flex flex-wrap items-baseline gap-x-0.5 tnum">
        <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {formatNumber(Math.round(eaten))}
        </span>
        <span className="text-[11.5px] text-ink-3">
          {plan !== null ? `/${formatNumber(plan)}g` : "g"}
        </span>
      </span>
      <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-surface-3">
        <div
          className="bar-fill h-full rounded-full"
          style={{ width: `${share * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="mt-2 block truncate text-[11.5px] text-ink-3 tnum">
        {diff === null
          ? "no plan"
          : diff >= 0
            ? `${formatNumber(Math.round(diff))}g left`
            : `${formatNumber(Math.round(-diff))}g over`}
      </span>
    </Card>
  );
}

/* ---------- Weight ---------- */

const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", { month: "short" });

/** Weight to the hundredth, without trailing zeros: 82, 82.4, 82.45. */
const KG = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const kg = (n: number) => KG.format(n);

function WeightCard({ nutrition, today }: { nutrition: Nutrition; today: string }) {
  const [period, setPeriod] = useState<WeightPeriod>("week");
  const points = useMemo(
    () => weightSeries(nutrition.weights, period, today),
    [nutrition.weights, period, today],
  );
  const latest = latestWeight(nutrition.weights);
  const first = points[0];
  const change = latest && first ? latest.value - first.value : 0;

  return (
    <Card aria-labelledby="weight-heading">
      <CardHead
        id="weight-heading"
        title="Weight"
        hint={
          latest
            ? `${kg(latest.value)} kg · ${formatShortDate(latest.date)}${
                points.length > 1
                  ? ` · ${change > 0 ? "+" : change < 0 ? "−" : "±"}${kg(Math.abs(change))} kg over ${points.length} ${period === "week" ? "weeks" : "months"}`
                  : ""
              }`
            : undefined
        }
        right={
          <Seg
            label="Weight period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "week", label: "Weeks" },
              { value: "month", label: "Months" },
            ]}
          />
        }
      />
      {points.length === 0 ? (
        <Empty>No weigh-ins yet. Log your weight and the last one of each week lands here.</Empty>
      ) : (
        <LineChart
          points={points.map((p) => ({
            key: p.start,
            value: p.value,
            tick:
              period === "week"
                ? formatShortDate(p.start)
                : MONTH_SHORT.format(fromDateKey(p.start)),
            current: p.current,
          }))}
        />
      )}
    </Card>
  );
}

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

/** A small line chart, every point labelled — there are never more than twelve. */
function LineChart({
  points,
}: {
  points: Array<{ key: string; value: number; tick: string; current: boolean }>;
}) {
  const [ref, width] = useMeasuredWidth();
  const height = 200;
  const pad = { top: 24, right: 18, bottom: 28, left: 18 };

  const values = points.map((p) => p.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 1) {
    lo -= 0.5;
    hi += 0.5;
  }
  const plotW = Math.max(1, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const x = (i: number) =>
    points.length === 1 ? pad.left + plotW / 2 : pad.left + (i / (points.length - 1)) * plotW;
  const y = (v: number) => pad.top + (1 - (v - lo) / (hi - lo)) * plotH;

  // Thin the labels on a narrow screen so they never collide.
  const every = width > 0 && width / points.length < 52 ? 2 : 1;
  const showTick = (i: number) => (points.length - 1 - i) % every === 0;

  return (
    <div ref={ref} className="px-4 pb-4 pt-2 sm:px-5" style={{ height: height + 24 }}>
      {width > 0 && (
        <svg width={plotW + pad.left + pad.right} height={height} role="img" aria-label="Weight over time">
          <polyline
            points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <g key={p.key}>
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={p.current ? 5 : 4}
                fill={p.current ? "var(--color-accent-500)" : "var(--color-ink)"}
                stroke="var(--color-surface)"
                strokeWidth={2}
              />
              {showTick(i) && (
                <>
                  <text
                    x={x(i)}
                    y={y(p.value) - 10}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--color-ink-2)"
                    className="tnum"
                  >
                    {kg(p.value)}
                  </text>
                  <text
                    x={x(i)}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--color-ink-3)"
                  >
                    {p.tick}
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

/* ---------- Calories by day ---------- */

const CHART_DAYS = 14;

function CaloriesChart({
  nutrition,
  today,
  selected,
  onSelect,
}: {
  nutrition: Nutrition;
  today: string;
  selected: string;
  onSelect: (day: string) => void;
}) {
  const days = calorieDays(nutrition, today, CHART_DAYS);
  const plan = nutrition.plan?.calories ?? null;
  const max = Math.max(plan ?? 0, ...days.map((d) => d.calories), 1) * 1.1;
  const height = 160;

  return (
    <Card aria-labelledby="calories-heading">
      <CardHead
        id="calories-heading"
        title="Calories by day"

      />
      <div className="p-4 sm:p-5">
        <div className="relative" style={{ height }}>
          {plan !== null && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-ink-2"
              style={{ bottom: (plan / max) * height }}
            >
              {/* The plan's figure on the line itself, on a chip so the bars
                  behind it never swallow it. */}
              <span className="absolute right-0 top-0 -translate-y-1/2 rounded-[var(--radius-badge)] bg-ink px-1.5 py-0.5 text-[11.5px] font-medium text-surface tnum">
                {formatNumber(plan)}
              </span>
            </div>
          )}
          <div className="flex h-full items-end gap-1 sm:gap-1.5">
            {days.map((d) => {
              const isSelected = d.date === selected;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => onSelect(d.date)}
                  title={`${formatLongDate(d.date)} — ${formatNumber(Math.round(d.calories))} kcal`}
                  aria-label={`${formatLongDate(d.date)} — ${formatNumber(Math.round(d.calories))} calories`}
                  aria-pressed={isSelected}
                  className="flex h-full min-w-0 flex-1 flex-col justify-end"
                >
                  <span
                    className="block w-full rounded-t-[4px]"
                    style={{
                      height: `${(d.calories / max) * 100}%`,
                      minHeight: d.calories > 0 ? 3 : 0,
                      backgroundColor: "var(--color-accent-500)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-1.5 flex gap-1 sm:gap-1.5">
          {days.map((d) => (
            <span
              key={d.date}
              className={
                "min-w-0 flex-1 text-center text-[11.5px] tnum " +
                (d.date === selected ? "font-semibold text-ink" : "text-ink-3")
              }
            >
              {dayOfMonth(d.date)}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Forms ---------- */

function num(raw: string): number {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  decimal,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /**
   * A text field with the decimal keypad, so "82,45" typed on a comma-locale
   * keyboard is accepted rather than silently emptied by a number input.
   */
  decimal?: boolean;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        size="lg"
        {...(decimal
          ? { type: "text", pattern: "[0-9]*[.,]?[0-9]*" }
          : { type: "number", step: "any", min: 0 })}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function FoodForm({
  date: initialDate,
  today,
  current,
  onClose,
}: {
  date: string;
  today: string;
  current: Macros;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const [date, setDate] = useState(initialDate);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");

  // Switching to "set" starts from the day's current totals, so a correction
  // is an edit of what is there rather than retyping it.
  function switchMode(next: "add" | "set") {
    setMode(next);
    const base = next === "set" ? dayTotals(state.nutrition, date) : null;
    const show = (n: number) => (base && n > 0 ? String(n) : "");
    setCalories(base ? show(base.calories) : "");
    setProtein(base ? show(base.protein) : "");
    setFat(base ? show(base.fat) : "");
    setCarbs(base ? show(base.carbs) : "");
  }

  const p = num(protein || "0");
  const f = num(fat || "0");
  const c = num(carbs || "0");
  const fromMacros = Math.round(macroCalories({ protein: p || 0, fat: f || 0, carbs: c || 0 }));
  const kcal = calories.trim() === "" ? fromMacros : num(calories);
  const valid = [kcal, p, f, c].every((n) => Number.isFinite(n)) && (kcal > 0 || p > 0 || f > 0 || c > 0 || mode === "set");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    dispatch({
      type: "logNutrition",
      date,
      macros: { calories: kcal, protein: p, fat: f, carbs: c },
      replace: mode === "set",
    });
    onClose();
  }

  return (
    <Modal
      title="Log food"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button className="py-2.5" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="py-2.5" disabled={!valid} onClick={() => submit()}>
            {mode === "add" ? "Add" : "Save day"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Seg
          label="How to log"
          value={mode}
          onChange={switchMode}
          options={[
            { value: "add", label: "Add to day" },
            { value: "set", label: "Edit day total" },
          ]}
        />
        <Field label="Date" htmlFor="food-date">
          <Input
            id="food-date"
            size="lg"
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value || initialDate)}
          />
        </Field>
        <NumberField
          id="food-kcal"
          label="Calories, kcal"
          value={calories}
          onChange={setCalories}
          placeholder={fromMacros > 0 ? `${fromMacros} from macros` : "0"}
          autoFocus
        />
        <div className="grid grid-cols-3 gap-3">
          <NumberField id="food-protein" label="Protein, g" value={protein} onChange={setProtein} placeholder="0" />
          <NumberField id="food-fat" label="Fat, g" value={fat} onChange={setFat} placeholder="0" />
          <NumberField id="food-carbs" label="Carbs, g" value={carbs} onChange={setCarbs} placeholder="0" />
        </div>
        {mode === "add" && date === initialDate && current.calories > 0 && (
          <p className="text-[11.5px] text-ink-3 tnum">
            Already logged that day: {formatNumber(Math.round(current.calories))} kcal · P{" "}
            {formatNumber(Math.round(current.protein))} · F {formatNumber(Math.round(current.fat))} · C{" "}
            {formatNumber(Math.round(current.carbs))}
          </p>
        )}
        {/* Enter submits from any field. */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function WeightForm({
  date: initialDate,
  today,
  onClose,
}: {
  date: string;
  today: string;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const [date, setDate] = useState(initialDate);
  const last = latestWeight(state.nutrition.weights);
  const [value, setValue] = useState("");
  // Up to the hundredth: 82.45 kg.
  const weight = Math.round(num(value) * 100) / 100;
  const valid = Number.isFinite(weight) && weight > 0;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    dispatch({ type: "logWeight", date, value: weight });
    onClose();
  }

  return (
    <Modal
      title="Log weight"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button className="py-2.5" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="py-2.5" disabled={!valid} onClick={() => submit()}>
            Save
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Date" htmlFor="weight-date">
          <Input
            id="weight-date"
            size="lg"
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value || initialDate)}
          />
        </Field>
        <NumberField
          id="weight-kg"
          label="Weight, kg"
          value={value}
          onChange={setValue}
          placeholder={last ? kg(last.value) : "82.45"}
          decimal
          autoFocus
        />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function PlanForm({ plan, onClose }: { plan: Macros | null; onClose: () => void }) {
  const { dispatch } = useStore();
  const show = (n: number | undefined) => (n ? String(n) : "");
  const [calories, setCalories] = useState(show(plan?.calories));
  const [protein, setProtein] = useState(show(plan?.protein));
  const [fat, setFat] = useState(show(plan?.fat));
  const [carbs, setCarbs] = useState(show(plan?.carbs));

  const p = num(protein || "0");
  const f = num(fat || "0");
  const c = num(carbs || "0");
  const fromMacros = Math.round(macroCalories({ protein: p || 0, fat: f || 0, carbs: c || 0 }));
  const kcal = calories.trim() === "" ? fromMacros : num(calories);
  const valid = [kcal, p, f, c].every((n) => Number.isFinite(n)) && kcal > 0;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    dispatch({ type: "setNutritionPlan", plan: { calories: kcal, protein: p, fat: f, carbs: c } });
    onClose();
  }

  return (
    <Modal
      title="Daily plan"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button className="py-2.5" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="py-2.5" disabled={!valid} onClick={() => submit()}>
            Save plan
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <NumberField
          id="plan-kcal"
          label="Calories, kcal"
          value={calories}
          onChange={setCalories}
          placeholder={fromMacros > 0 ? `${fromMacros} from macros` : "2200"}
          autoFocus
        />
        <div className="grid grid-cols-3 gap-3">
          <NumberField id="plan-protein" label="Protein, g" value={protein} onChange={setProtein} placeholder="0" />
          <NumberField id="plan-fat" label="Fat, g" value={fat} onChange={setFat} placeholder="0" />
          <NumberField id="plan-carbs" label="Carbs, g" value={carbs} onChange={setCarbs} placeholder="0" />
        </div>
        {fromMacros > 0 && (
          <p className="text-[11.5px] text-ink-3 tnum">
            These macros add up to {formatNumber(fromMacros)} kcal.
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
