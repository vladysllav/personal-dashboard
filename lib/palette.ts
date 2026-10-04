/**
 * The card palette, and the emoji a habit can wear.
 *
 * Everywhere else in this product colour *means* something — yellow is the
 * plan kept, coral is behind it. A habit card is the one place colour is
 * decoration: it is a label you chose so you can find "Gym" in a grid without
 * reading, and it carries no verdict at all. That is why these live here,
 * away from the state tokens in `globals.css`, and why they are plain hexes
 * applied inline rather than Tailwind classes: the set is data, picked at
 * runtime, and a class name cannot be composed from a stored value.
 *
 * The set is deliberately short. Two blues you cannot tell apart in a 2-column
 * grid are not two labels, they are one label and a mistake waiting to happen,
 * so near-duplicates from the source palettes were dropped rather than kept
 * for the sake of a fuller row.
 */

export type HabitColor =
  | "yellow"
  | "green"
  | "mint"
  | "sky"
  | "indigo"
  | "violet"
  | "pink"
  | "coral"
  | "ink";

export type Swatch = {
  id: HabitColor;
  label: string;
  /** The card fill. */
  fill: string;
  /**
   * Type on that fill. Every light swatch clears 5.8:1 with the palette's
   * black; the two dark ones take white, which is the only reason `fg` exists
   * rather than "always ink".
   */
  fg: string;
};

/** Text that clears 4.5:1 on the light fills. The palette's black, not a grey. */
const INK = "#151313";
const PAPER = "#ffffff";

export const SWATCHES: Swatch[] = [
  { id: "yellow", label: "Yellow", fill: "#f7cd63", fg: INK },
  { id: "green", label: "Green", fill: "#b8eb6c", fg: INK },
  { id: "mint", label: "Mint", fill: "#a5e5de", fg: INK },
  { id: "sky", label: "Sky", fill: "#9ecdf7", fg: INK },
  { id: "indigo", label: "Indigo", fill: "#4e55e0", fg: PAPER },
  { id: "violet", label: "Violet", fill: "#be94f5", fg: INK },
  { id: "pink", label: "Pink", fill: "#fc8fc6", fg: INK },
  { id: "coral", label: "Coral", fill: "#ff5734", fg: INK },
  { id: "ink", label: "Black", fill: "#1b1b1b", fg: PAPER },
];

export const DEFAULT_COLOR: HabitColor = "yellow";

const BY_ID = new Map(SWATCHES.map((s) => [s.id, s]));

/** Never throws: a colour dropped from the set falls back rather than blanking a card. */
export function swatch(id: string | undefined): Swatch {
  return BY_ID.get((id ?? "") as HabitColor) ?? BY_ID.get(DEFAULT_COLOR)!;
}

export function isHabitColor(value: string): value is HabitColor {
  return BY_ID.has(value as HabitColor);
}

/**
 * The icon set.
 *
 * Emoji, against the house rule in `Icon.tsx`, and for the opposite reason:
 * that rule is about *interface* icons, which have to be one family at one
 * weight. This is content — the thing you picked for your own habit — and
 * nobody is going to find a hand-drawn 24px contour for "cut down on beer".
 */
export const HABIT_EMOJI: string[] = [
  "🏃", "🏋️", "🧘", "🚴", "🏊", "⚽",
  "🥗", "🍎", "💧", "☕", "🥦", "🍳",
  "😴", "🛏️", "🚿", "🦷", "💊", "🧴",
  "📚", "✍️", "💻", "🧠", "🗣️", "🎓",
  "🎸", "🎨", "📷", "🎧", "🎮", "🧩",
  "🧹", "🧺", "🛒", "🌱", "🐕", "🔧",
  "💰", "📈", "📞", "🙏", "⏰", "🧭",
  "🚭", "🍺", "📵", "🔥", "⭐", "✅",
];

export const DEFAULT_EMOJI = "✅";
