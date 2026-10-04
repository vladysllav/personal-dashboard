import type { GoalStatus } from "@/lib/types";
import { Icon, type IconName } from "./Icon";

/**
 * The plan-state label: green is done or ahead, amber is behind, red is
 * overdue. The tones are muted on purpose — this badge appears dozens of times
 * in a list, and a saturated fill under small text is tiring.
 *
 * The arrow doubles the colour, so the state reads under colour blindness and
 * in black and white. It is a drawn icon, not a glyph from the font: unicode
 * triangles are different sizes in different families and sit at different
 * heights.
 */
const TONE: Record<GoalStatus, [className: string, icon: IconName]> = {
  complete: ["bg-accent-50 text-accent-700", "check"],
  ahead: ["bg-accent-50 text-accent-700", "arrowUp"],
  "on-pace": ["bg-accent-50 text-accent-700", "arrowRight"],
  behind: ["bg-neg-50 text-neg-700", "arrowDown"],
  // Overdue is the one state that stops being a tint you can read past. Same
  // hue as behind, filled solid — the escalation those two states describe.
  overdue: ["bg-neg-600 text-ink", "arrowDown"],
  "not-started": ["bg-surface-3 text-ink-2", "arrowRight"],
};

export function StatusBadge({
  status,
  children,
  hint,
  className = "",
}: {
  status: GoalStatus;
  children: React.ReactNode;
  /** The plan behind the state, shown on hover. */
  hint?: string;
  className?: string;
}) {
  const [tone, icon] = TONE[status];
  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12.5px] font-medium tnum ${tone} ${className}`}
    >
      <Icon name={icon} size={11} />
      {children}
    </span>
  );
}

/** The same tone scale, for a figure that carries the state on its own. */
export function statusText(status: GoalStatus): string {
  switch (status) {
    case "complete":
    case "ahead":
      return "text-accent-700";
    case "on-pace":
      return "text-accent-700";
    case "behind":
      return "text-neg-700";
    case "overdue":
      return "text-neg-700";
    default:
      return "text-ink-2";
  }
}
