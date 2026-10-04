---
name: Personal Dashboard
description: A light tracking dashboard where colour is pinned to the state of the plan
colors:
  canvas: "#f7f7f5"
  surface: "#ffffff"
  surface-2: "#fbfbfa"
  surface-3: "#efefec"
  line: "#e4e4e0"
  line-strong: "#d2d2ce"
  ink: "#151313"
  ink-2: "#4a4a46"
  ink-3: "#6b6b66"
  accent-50: "#fff4d4"
  accent-100: "#ffe9a8"
  accent-200: "#fbdc80"
  accent-500: "#fccc42"
  accent-600: "#fccc42"
  accent-700: "#8a6b00"
  accent-pressed: "#ecb81c"
  neg-50: "#ffe8e2"
  neg-600: "#ff5734"
  neg-700: "#c2381f"
  neg-800: "#a82d18"
  violet: "#be94f5"
  violet-700: "#6b3fa8"
  s1: "#8a6b00"
  s2: "#6b3fa8"
  s3: "#c2381f"
  s4: "#151313"
  s-muted: "#8b8b85"
typography:
  page-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  section-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  field:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  focus: "4px"
  badge: "8px"
  input: "10px"
  control: "12px"
  card: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent-600}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    typography: "{typography.section-title}"
  button-primary-hover:
    backgroundColor: "{colors.accent-700}"
  button-primary-disabled:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink-3}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.neg-600}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  tick-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  tick-chip-done:
    backgroundColor: "{colors.accent-50}"
    textColor: "{colors.accent-700}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "6px 10px"
  input-invalid:
    backgroundColor: "{colors.neg-50}"
    textColor: "{colors.neg-700}"
  nav-item:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  nav-item-active:
    backgroundColor: "{colors.accent-50}"
    textColor: "{colors.accent-700}"
  badge-status:
    rounded: "{rounded.badge}"
    padding: "2px 6px"
---

# Design System: Personal Dashboard

## Overview

A tool for reading your own record, not a display case for numbers. A light
canvas, white cards with a hairline border, a left column of sections, dense
rows with dotted separators.

The rule the system is built on: **colour means something**. Green is the
accent and "kept" or "on pace", red is "overdue", amber is "behind", grey is
the plan. There is no decorative colour anywhere, so when something red appears
on screen it is always the data, never the styling.

The two things done every day — ticking habits and logging a number — sit at
the top of Today in their own pair of cards. Everything that is only read comes
after them.

## Colors

White is the ground, yellow is the accent, black is navigation and anything
held or selected. Coral marks a plan that is slipping. Violet is a category,
never a state.

### The constraint everything else follows

`#fccc42` is **1.52:1 on white and never reaches 3:1 against any grey** — its
lightness sits in the middle of the grey ramp, so there is no track, border or
background that gives it an edge. Two consequences, and they are not
negotiable:

- **Yellow is only ever a fill.** It cannot be type, and it cannot be a line.
  Accent text and accent strokes are `accent-700` `#8a6b00` (5.02:1 on white).
- **A yellow fill is always drawn with an edge.** `accent-700` at 1px on a
  button or a bar, and as a slightly wider arc beneath a ring. Without it the
  bar and its groove are the same shape.

### On a yellow fill, text is black

Black on `#fccc42` is 12.2:1; white on it is 1.5:1 and illegible. The same
holds for coral: white on `#ff5734` is 3.15:1, so a solid coral fill carries
black, and a destructive button takes the darker `neg-700` instead.

### Plan state

Yellow is the accent, so yellow reads as "going to plan" — done, on pace,
ahead, all `accent-50` / `accent-700` (4.58:1). Coral reads as not:

- **behind** — `neg-50` / `neg-700`, a tint you can read past (4.61:1)
- **overdue** — `neg-600` filled solid with black type (5.88:1)

One hue at two intensities, because that is the escalation those two states
actually describe; the arrow next to the label carries the difference for
anyone who cannot see it.

### Neutral

Canvas `#f7f7f5`, cards pure white, `surface-3` for grooves and resting
chips. Text `ink` / `ink-2` / `ink-3` clears 4.5:1 on all three (the tightest
is `ink-3` on `surface-3` at 4.65:1).

### Chart series

The swatch colours fill shapes; they cannot draw them. `s1`–`s4` are their
legible counterparts — `#8a6b00`, `#6b3fa8`, `#c2381f`, `#151313` — each over
3:1 on white so a line reads without its label. `s-muted` `#8b8b85` is the
plan line.

## Typography

One family — Geist — in four roles. A product UI does not need a display/text
pair: there are more kinds of element here than on a brand page, and the extra
contrast only reads as noise.

### Hierarchy

- **page-title** 26px/600, tracking −0.02em — the page title in the header.
- **metric** 28px/600 tabular-nums — a fact in a summary card.
- **title-sm** 17px/600 — a heading in a narrow container: the figure in the
  centre of a ring, the name on the sign-in screen, a dialog title.
- **section-title** 13.5px/500 — a card heading.
- **field** 16px/400 — a capture input. Not below 16px on purpose: under that
  iOS zooms the page on focus, and logging is the most repeated action in the
  product. Dense inline fields inside rows stay on body.
- **body** 13px/400 — rows and running text.
- **caption** 11.5px/400 `ink-3` — labels, nav groups, notes.

### Named Rules

- The scale is fixed in px, not fluid: the reading distance is constant, and a
  title that shrinks inside a column looks worse, not better.
- Every figure in a row or a card is `tabular-nums`, otherwise the column
  drifts.
- Explanatory text never runs wider than 68ch.

## Layout

The frame is a 248px left column (`surface`) plus content on `canvas`. The
column holds sections only. Controls that belong to one screen live in that
screen's header, and to the right of them sits what belongs to no page at all —
the account.

On a narrow screen the column does not shrink, it moves into a drawer on a
native `<dialog>`: breaking the width of the data to keep navigation you touch
once a session is a bad trade.

Vertical rhythm: 16px between cards, 16–20px inside them. Grids where the
content is two-dimensional, `flex-wrap` where it is not.

## Elevation & Depth

There is almost no depth: one plane of cards above the canvas and one popover
plane above them.

### Shadow Vocabulary

- `shadow-card` `0 1px 2px rgba(31,37,32,.04), 0 10px 24px -16px rgba(31,37,32,.18)`
  — cards, the active button of a segment. Thrown further down than a hairline
  shadow would be, because the cards sit on a canvas dark enough that a 1px
  shadow disappears and the panels read as holes rather than as surfaces.
- `shadow-pop` `0 18px 44px -12px rgba(31,37,32,.2), 0 2px 6px rgba(31,37,32,.05)`
  — the confirm dialog.

### Named Rules

A shadow always has an offset and a soft blur. A coloured halo with no offset
is decoration, not depth.

## Shapes

Five radii in the markup: card 18px, control (button, tick chip, nav item)
12px, input 10px, badge 8px, and `pill` fully round for a segment or a delta
chip. Plus `focus` 4px, used only for the focus ring: it also has to go around
small inline targets, where any larger radius would drift away from the element
itself.

They are read from the tokens — `rounded-[var(--radius-card)]` — never typed as
pixels at the call site, so the whole set moves together.

Row separators are dotted 1px `line`; a solid line is kept for meaningful
boundaries (a card header, the seam under an open form, the note at the foot of
a card).

## Components

### Buttons

`primary` — an `accent-600` fill with white text. `ghost` — white with a `line`
border. `quiet` — no border, for actions inside dense blocks. `danger` —
`neg-600`, only in a confirm dialog. A disabled button fades into a neutral
(`surface-3` / `ink-3`) rather than into a washed-out accent: white on pale
green is unreadable and looks broken.

### Tick chip

The one-tap control the product is built around. Kept is `accent-50` +
`accent-700` + a filled tick; not kept is a plain surface pill with an empty
ring. Shape carries the state as well as colour.

### Cards / Containers

`surface`, a `line` border, radius 18px, `shadow-card`. The card header is a
title on the left and controls on the right with a line underneath, because
what follows is almost always a list, a grid or a chart that starts at the
edge. Nested cards are banned — a grid of cells separated by hairlines is used
instead (`gap-px` on a `line` background).

### Inputs / Fields

Three states that never get confused: at rest — a `line` border; invalid —
`neg-600` + `neg-50` + `aria-invalid`; disabled — `surface-3` and a
`not-allowed` cursor. A form opens inside the card it belongs to, on
`surface-2`, so the row it will become stays in view instead of being replaced
by a modal.

### Status badge

The plan state: background and text from the status pair, a drawn 11px arrow, a
hint in `title` carrying the plan. Six states map onto four tones — complete
and ahead are `pos`, on pace is `accent`, behind is `warn`, overdue is `neg`,
not started is neutral.

### Pace bar and ring

The same grammar twice. The filled bar (or arc) is where you actually are; the
upright marker (or notch) is where the plan expects you today. Ahead and behind
are read from the gap between them, and only then confirmed by colour.

### Habit calendar

A month grid of square tiles, one tap per day, in five states that are told
apart by fill *and* by edge:

- **kept** — `accent-500` with white text.
- **kept, outside the plan** — `accent-100` on a dashed `accent-400` edge. The
  accent still says "done"; the dashed edge says it does not count toward the
  target. A day already marked stays tappable whatever the plan says, because
  the mark is recorded history and editing a commitment must never hide a day
  you actually did.
- **not marked** — `surface-3`, the plan's own grey.
- **not yet, or outside the window and empty** — a dashed `line` outline and no
  fill, and inert: there is nothing to record about a day that has not arrived.
- **today** — an `ink` ring drawn *inside* the tile (`ring-inset`), so marking a
  day never nudges the grid.

Days from the neighbouring month stay in place at 45% opacity rather than being
blanked, so the weeks keep their shape.

### Charts

Drawn in CSS pixels against a measured container, not in a fixed viewBox scaled
to fit. A 720-wide viewBox squeezed into a phone card scales the type down with
everything else and lands it near 5px; measuring keeps an 11.5px axis label at
11.5px on every screen, and lets the chart take a shorter height and fewer ticks
when it is narrow.

### Named Rules

- **A count has a floor at zero.** An `accumulate` goal counts a quantity up
  from nothing, so the axis never pads below zero — "−32 km" is not a distance
  anyone has run. A `measure` goal is a reading on a scale with no meaningful
  zero, so its band is allowed to float.
- **Gridlines land on round numbers** — 0, 100, 200 — and the x axis divides the
  span evenly so the final tick is the deadline itself: 0, 15, … 90, never
  0, 23, 46, 69, 90.
- **Area means accumulation.** The fill under a line belongs to a running total,
  where it is the work done. Under a `measure` reading it shades the gap to the
  bottom of the axis and means nothing, so there is none.
- A label already printed by the axis is not repeated on the line: where the
  target lands on a gridline, the line is marked "target" and the figure is left
  to the axis.
- Every legend swatch has to be visible. One that needs `line-strong` on white
  is not a legend entry — label that series on the line instead.

### Navigation

An item is a 10px radius with a 17px icon. Active: `surface-3`, `ink` text, an
`accent-600` icon, `aria-current="page"`. The group is labelled 11.5px `ink-3`
in ordinary case, with no tracking.

### Icons

A hand-rolled set in `components/Icon.tsx`: a 24×24 grid, one contour, stroke
1.75, `currentColor`, round caps. Unicode symbols and emoji are never used as
icons — they are different sizes in different families and sit at different
heights on the line.

## Motion

Motion only carries state: content appearing (`rise`, 220ms), a bar or arc
growing from its own baseline, interactive states at 180ms. There is no
staggered entrance of page blocks — you come here to log a number, not to watch
the page assemble. Every animation collapses under
`prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:

- Keep colour pinned to state: if an element is coloured, it has a meaning.
- Put every figure through `tabular-nums` and show "—" where there is nothing
  to compute.
- Double colour with shape — an arrow, a tick, a marker, a label.
- Keep row separators dotted and meaningful lines solid.
- Give the capture inputs 16px so iOS does not zoom the page on focus.

### Don't:

- Don't set type in yellow, or draw a line in it. It is a fill.
- Don't put a yellow fill on a light surface without its `accent-700` edge.
- Don't put white text on yellow or on coral.
- Don't put grey text on a coloured background.
- Don't nest a card inside a card, and don't build the structure of a page out
  of identical cards.
- Don't draw a coloured `border-left` stripe as an accent.
- Don't use gradient text or glass as decoration.
- Don't orchestrate the entrance of page blocks: motion only carries state.
- Don't repaint the Google mark into the product's palette — it is the one
  place where colour does not mean the state of a plan.
