/**
 * The shared vocabulary.
 *
 * One button, one card, one input for the whole product: if "Save changes" on
 * a goal looks different from "Log" on the dashboard, one of the two is wrong.
 * Radii are one set as well, read from the tokens rather than typed as pixels
 * at each call site: card 18, control 12, input 10, badge 8, pill full.
 */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Icon } from "./Icon";

export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "li";
} & { [key: `aria-${string}`]: string | undefined }) {
  return (
    <Tag
      {...rest}
      className={`rounded-[var(--radius-card)] border border-line bg-surface shadow-card ${className}`}
    >
      {children}
    </Tag>
  );
}

/**
 * Card header. Title left, controls right, a line underneath — because what
 * follows is almost always a table, a grid or a chart that starts at the edge.
 */
export function CardHead({
  title,
  hint,
  right,
  id,
  className = "",
}: {
  title: ReactNode;
  hint?: ReactNode;
  right?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 pt-4 sm:px-5 sm:pt-5 ${className}`}
    >
      <div className="min-w-0">
        <h2 id={id} className="text-[13.5px] font-medium text-ink">
          {title}
        </h2>
        {hint && (
          <p className="mt-1 max-w-[68ch] text-[11.5px] leading-relaxed text-ink-3">
            {hint}
          </p>
        )}
      </div>
      {/* min-w-0 rather than shrink-0: on a narrow screen the controls wrap
          under the title instead of pushing the page sideways. */}
      {right && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">{right}</div>
      )}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet" | "danger";
  loading?: boolean;
  icon?: ReactNode;
  /** React 19 passes ref straight through as a prop. */
  ref?: Ref<HTMLButtonElement>;
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] " +
  "text-[13.5px] font-medium disabled:cursor-not-allowed";

/**
 * A disabled button fades into a neutral rather than into a washed-out accent:
 * white on pale green is unreadable and looks broken, while grey on grey reads
 * as "not yet" straight away.
 */
const BUTTON_VARIANT: Record<string, string> = {
  primary:
    "border border-accent-700 bg-accent-600 text-ink px-3.5 py-2 hover:bg-accent-pressed " +
    "enabled:active:bg-accent-pressed disabled:border-line disabled:bg-surface-3 disabled:text-ink-3",
  ghost:
    "border border-line bg-surface text-ink-2 px-3.5 py-2 hover:border-line-strong hover:text-ink " +
    "disabled:bg-surface-2 disabled:text-ink-3",
  quiet:
    "text-ink-2 px-2.5 py-1.5 hover:bg-surface-3 hover:text-ink disabled:text-ink-3",
  danger:
    "bg-neg-700 text-white px-3.5 py-2 hover:bg-neg-800 enabled:active:bg-neg-800 " +
    "disabled:bg-surface-3 disabled:text-ink-3",
};

export function Button({
  variant = "ghost",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${className}`}
    >
      {loading ? <Icon name="spinner" size={15} /> : icon}
      {children}
    </button>
  );
}

/** A bare icon target for dense rows: edit, delete, dismiss. */
export function IconButton({
  name,
  label,
  size = 15,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  name: Parameters<typeof Icon>[0]["name"];
  label: string;
  size?: number;
}) {
  return (
    <button
      {...rest}
      type="button"
      aria-label={label}
      className={`rounded-[var(--radius-badge)] p-1.5 text-ink-3 hover:bg-surface-3 hover:text-ink ${className}`}
    >
      <Icon name={name} size={size} />
    </button>
  );
}

/**
 * A metric switch. Its job is picking one of several equal options, so it is a
 * group of buttons with aria-pressed rather than decorative tabs.
 */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string; icon?: Parameters<typeof Icon>[0]["name"] }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-1 rounded-[var(--radius-pill)] bg-surface-3 p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={
              "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] " +
              (active
                ? "bg-surface font-medium text-ink shadow-card"
                : "text-ink-2 hover:text-ink")
            }
          >
            {o.icon && <Icon name={o.icon} size={15} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** An explanation under a dense block — where a figure is easy to misread. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-auto border-t border-line px-4 py-2.5 text-[11.5px] leading-relaxed text-ink-3 sm:px-5">
      {children}
    </p>
  );
}

/**
 * A change against a comparison period — the "+12.5%" pill the reference
 * dashboards put beside every headline figure.
 *
 * Direction is carried by the sign and an arrow as well as by the hue, so it
 * survives colour blindness and a black-and-white print. `tone` is the reading,
 * not the sign: a debt going down is good news with a minus in front of it.
 */
export function DeltaPill({
  children,
  tone,
  title,
}: {
  children: ReactNode;
  tone: "good" | "bad" | "flat";
  title?: string;
}) {
  const style =
    tone === "good"
      ? "bg-pos-50 text-pos-700"
      : tone === "bad"
        ? "bg-neg-50 text-neg-700"
        : "bg-surface-3 text-ink-2";
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-[11.5px] font-medium tnum ${style}`}
    >
      {tone !== "flat" && (
        <Icon name={tone === "good" ? "arrowUp" : "arrowDown"} size={11} />
      )}
      {children}
    </span>
  );
}

/**
 * The headline figure of one measure: what it is, the number, and what the
 * number is out of. A row of these is the first thing on a screen — read in a
 * second, with the detail underneath for whoever wants it.
 */
export function StatTile({
  label,
  value,
  caption,
  delta,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  delta?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] text-ink-2">{label}</p>
        {delta}
      </div>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink tnum">
        {value}
      </p>
      {caption && (
        <p className="mt-2 truncate text-[11.5px] text-ink-3">{caption}</p>
      )}
    </div>
  );
}

/* ── Fields ──────────────────────────────────────────────────────────
 * Three states that never get confused: at rest — a `line` border; invalid —
 * `neg-600` plus `neg-50` plus aria-invalid; disabled — `surface-3` and a
 * not-allowed cursor.
 *
 * `size="lg"` is 16px and belongs on capture inputs: below 16px iOS zooms the
 * page on focus, and logging is the most repeated action in the product.
 */
const FIELD_BASE =
  "w-full rounded-[var(--radius-input)] border bg-surface text-ink placeholder:text-ink-3 " +
  "disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-3";

function fieldClass(size: "md" | "lg", invalid?: boolean, extra = "") {
  return [
    FIELD_BASE,
    size === "lg" ? "px-3 py-2 text-[16px]" : "px-2.5 py-1.5 text-[13.5px]",
    invalid
      ? "border-neg-600 bg-neg-50 text-neg-700"
      : "border-line hover:border-line-strong",
    extra,
  ].join(" ");
}

export function Label({
  htmlFor,
  children,
  note,
}: {
  htmlFor: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[11.5px] text-ink-3">
      {children}
      {note && <span className="ml-1 text-ink-3">{note}</span>}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <span className="text-[11.5px] text-ink-3">{hint}</span>}
    </div>
  );
}

export function Input({
  size = "md",
  invalid,
  className = "",
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: "md" | "lg";
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={fieldClass(size, invalid, `tnum ${className}`)}
    />
  );
}

export function Select({
  size = "md",
  className = "",
  children,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: "md" | "lg";
}) {
  return (
    <div className="relative min-w-0">
      <select
        {...rest}
        className={fieldClass(size, false, `appearance-none pr-8 ${className}`)}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={15}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={fieldClass("md", false, `min-h-[120px] leading-relaxed ${className}`)}
    />
  );
}

/** An inline problem with what was just typed. Never colour alone. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="inline-flex items-start gap-1.5 rounded-[var(--radius-input)] bg-neg-50 px-2.5 py-1.5 text-[13px] text-neg-700"
    >
      <span
        aria-hidden="true"
        className="mt-[1px] inline-flex size-[15px] shrink-0 items-center justify-center rounded-full bg-neg-700 text-[10px] font-semibold text-white"
      >
        !
      </span>
      {children}
    </p>
  );
}

/** Nothing here yet. Quiet, factual, and it says what to do next. */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[68ch] px-4 py-6 text-[13px] leading-relaxed text-ink-3 sm:px-5">
      {children}
    </p>
  );
}
