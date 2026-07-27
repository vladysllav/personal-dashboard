<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Personal Dashboard
description: A warm, near-black instrument for tracking goals and habits, where a single scarce yellow marks the one thing that needs you now.
---

# Design System: Personal Dashboard

## 1. Overview

**Creative North Star: "The Kept Log"**

A log kept by hand, and a log kept up. Both meanings are load-bearing. The data here doesn't arrive from an API — it arrives because the owner sat down and entered it, which makes every number in the system evidence of attention already paid. The interface's job is to honour that: make entry effortless, make the record legible, and never flatter it.

The reference point is a good training log, not a productivity app. A training log is warm because it's *yours* and it's honest — it shows the bad weeks as plainly as the good ones, and it earns its encouragement by being specific. That warmth comes from voice, from typography, and from a single generous accent. It does not come from rounded corners, pastel washes, or illustration. This system is warm and dark at the same time, which is only a contradiction if you assume warmth means light.

Structurally, this rejects the dashboard grid outright. The supplied references all resolve to the same skeleton — a four-up row of equal-weight KPI cards, a donut, a bar chart, a table — and that skeleton is wrong here for a specific reason: it treats every piece of information as equally important and treats logging as an afterthought behind a "+" button. In this system, **the daily capture surface is the most valuable real estate on the screen**, and hierarchy is carried by genuinely different shapes for genuinely different kinds of information. Two goals at different stages should not look like two identical cards.

**Key Characteristics:**

- Near-black, warm-tinted surfaces; depth from tonal layering, not shadow
- One yellow, held scarce, meaning exactly one thing
- A single humanist sans across the entire system; tabular figures on every number
- Fixed rem type scale at a tight ratio — no fluid clamps in product UI
- Motion confirms, never performs: 150–250ms, no page-load choreography
- Density is permitted and expected; this is a tool for one fluent user
- Capture is a primary surface, not a modal

## 2. Colors

A near-black field, warmed a few degrees toward its own accent, with a single high-energy yellow used so sparingly that its appearance is itself information.

### Primary

- **Lemon Glow** (`#FEEF4C`, committed anchor): The sole accent, and it means one thing: **the record of what you actually did.** Actual progress fills, the value you're entering, the primary action, the current selection — all of these are *your doing*. The plan, the structure, and the surface are neutral; you are yellow. As a fill it always carries near-black text on top; it is a *light* colour and behaves like one.

### Neutral

The neutral ramp is derived, not yet fixed. The anchors and the derivation rule are committed; exact steps are `[to be resolved during implementation]`.

- **Anchor reference:** Steel Gray `#2A323F`, supplied — *taken as a lightness reference only, not as a hue.* `#2A323F` is a cool blue-grey, and cool grey actively contradicts a warm personality.
- **Derivation rule:** build the ramp in OKLCH at the accent's own hue family (yellow-green, roughly H 95–105) with a chroma budget of **0.006–0.014** — enough that the darks read warm rather than blue, far too little to read as olive, brown, or sepia. Never tint toward blue "because dark UIs are blue."
- **Lightness targets:** body surface below the supplied anchor as requested (deep near-black); two further surface steps above it for panels and raised elements; a text ramp with a genuinely bright primary text step, a mid step for secondary text that still clears 4.5:1, and a low step used **only** for borders and dividers — never for text.
- Exact OKLCH values, step count, and token names: `[to be resolved during implementation]`.

### Named Rules

**The Plan Is Grey, You Are Yellow Rule.** Every dual-track progress element renders the *planned* pace in a low neutral and the *actual* recorded value in the accent. This is the system's central image: the structure you set for yourself is quiet, and the evidence of what you actually did is the only thing that glows. It generalises beyond progress bars — anywhere the interface shows intention alongside reality, reality gets the accent.

**The Scarcity Rule.** The accent never exceeds 10% of any screen. Because it appears on every goal row, its elements must stay thin — bars of a few pixels, marks rather than fills — so the total accent area stays negligible. It is forbidden as decoration, as a section marker, as a brand flourish in the corner, and as a general-purpose "positive" colour. **Critically, yellow is never a state colour**: a goal that is behind pace does not turn a different colour, because behind-ness is carried by the yellow bar falling visibly short of the plan marker, plus a text label.

**The Warm Dark Rule.** Every neutral tints toward the accent's hue, never toward blue. Warmth in this system is a property of the greys themselves, applied at a chroma so low it's felt rather than seen. If a surface reads as slate, navy, or gunmetal, the chroma is on the wrong side of the wheel.

**The No-Colour-Alone Rule.** Because the accent is reserved and the palette is otherwise neutral, state is **never** carried by hue. On-track versus behind versus complete is expressed through *form and position* — fill level against a pace marker, position on a timeline, presence or absence of a mark — plus an explicit text label. Colour may reinforce a state that is already legible without it; it may never be the only carrier. This is both the accessibility requirement and the reason the restrained palette works at all.

## 3. Typography

**Display Font:** none. This system has no display face.
**Body / UI Font:** a single humanist sans across headings, labels, buttons, body, and data — `[family to be chosen at implementation]`. Humanist rather than geometric: the warmth lives in the letterforms, in open apertures and a slight calligraphic bias, not in decoration applied on top.
**Figures:** tabular, lining, from the same family — `[to be confirmed the chosen family ships them]`.

**Character:** Warm, legible, unhurried, and completely unremarkable in the best sense. This face has to survive being read every single day, so it earns nothing by being interesting. Geometric sans is explicitly rejected — it is what all six reference dashboards use, and it is why they look alike.

### Hierarchy

A **fixed rem scale at a ratio of roughly 1.2** — no `clamp()`, no fluid sizing. Product UI is viewed at consistent DPI, and a heading that shrinks inside a narrow panel looks broken, not responsive. Responsive behaviour here is structural (collapsing the nav, reflowing columns), never typographic.

- **Headline** — page-level identity. One per screen. `[values to be resolved]`
- **Title** — section and goal names; the level that carries the most personality. `[values to be resolved]`
- **Data** — the large figures: goal values, streak counts, progress numbers. Set noticeably larger than titles, tabular, tight line-height. This is the level that gets read at a glance from three feet away. `[values to be resolved]`
- **Body** — descriptions, notes, explanatory copy. Capped at 65–75ch. `[values to be resolved]`
- **Label** — field labels, chart axes, metadata, units. Small, never uppercase-tracked as a decorative device. `[values to be resolved]`

### Named Rules

**The Tabular Rule.** Every number that can change is set in tabular figures. Streak counts, currency, progress values, chart axes, dates. Proportional figures make columns ragged and make a number visibly *jump* when it updates — which reads as instability in a tool whose entire purpose is showing you a stable record.

**The One Family Rule.** One family, differentiated by weight and size only. No display face in labels, buttons, or data. If a second family ever enters the system it must be for a functional reason with a stated job, not for texture.

**The Quiet Label Rule.** Labels are small and low-contrast, not small-uppercase-tracked. The tracked micro-caps eyebrow is forbidden as a section device; it is the most saturated AI scaffold there is and it appears in nearly every generated dashboard.

## 4. Elevation

**Flat by default, depth from tone.** Surfaces are distinguished by stepping up the neutral ramp — a panel is lighter than the body, a raised element is lighter still — not by shadow. On a near-black field, shadow is nearly invisible anyway; a dark UI that leans on drop shadows for hierarchy ends up looking like a 2014 app with a filter over it. Borders, where used, are a single hairline from the lowest neutral step, never more than 1px, and never coloured.

Shadow is permitted in exactly one situation: elements that genuinely float above the plane and need to be read as detached — menus, popovers, dialogs, drag states. There, shadow is doing structural work rather than decorative work.

### Named Rules

**The Tonal Depth Rule.** If two surfaces need to be distinguished, step the tone. Reach for shadow only when an element is genuinely detached from the plane. **Audit test:** if you can delete every `box-shadow` in the system and the hierarchy still reads, the elevation model is correct.

## 5. Do's and Don'ts

### Do:

- **Do** give the daily capture surface the best real estate on the screen. Logging is the most-repeated action in the product; every interaction saved there compounds across every day of use.
- **Do** make the entry flow fully keyboard-operable with visible focus states. This is the fastest path for daily use, not just an accessibility checkbox.
- **Do** derive every neutral in OKLCH at the accent's hue family with chroma between 0.006 and 0.014.
- **Do** put near-black text on any yellow fill. Never white.
- **Do** pair every state with a label, shape, or position — never hue alone.
- **Do** set every changeable number in tabular figures.
- **Do** hold transitions to 150–250ms and let motion confirm an action rather than announce one.
- **Do** ship a `prefers-reduced-motion: reduce` path for every animation — typically a crossfade or an instant state change. Progress fills and streak transitions are the likely offenders.
- **Do** express hierarchy through genuinely different shapes for genuinely different information.
- **Do** show a goal that is behind schedule as behind schedule. *"A goal that's behind schedule should look behind schedule."*

### Don't:

- **Don't** build the stock dark analytics dashboard: a four-up row of identically-sized KPI cards, a donut chart, a bar chart, a table. The supplied references were provided for **palette and density only**, never for layout.
- **Don't** use **identical card grids** — equal-weight cards in a repeating grid, where structure conveys nothing about importance.
- **Don't** nest cards. A card inside a card is always a hierarchy failure.
- **Don't** build the **hero-metric template**: big number, small label, tiny delta chip, repeated four times.
- **Don't** add any **fake social or enterprise surface** — notification feeds, activity streams, team avatars, "Hello, [Name] 👋", upsell or premium panels, support-agent widgets. This is a single-user tool; all of it appears in the references and none of it applies.
- **Don't** add **gamification veneer** — badges, trophies, XP bars, levels, or streak-loss shame loops. Motivation comes from the real data being legible, not from a points economy. The Duolingo guilt mechanic is the named anti-reference.
- **Don't** drift into **cool corporate SaaS neutrality** — blue-grey everything, generic geometric sans, safe spacing. It reads competent, says nothing, and directly contradicts a warm personality.
- **Don't** use gradient text (`background-clip: text` over a gradient), decorative glassmorphism, or `border-left` / `border-right` greater than 1px as a coloured accent stripe on cards, list items, or alerts.
- **Don't** put a tracked uppercase eyebrow above every section, and don't use numbered section markers (01 / 02 / 03) as scaffolding.
- **Don't** use yellow as text on any light surface — `#FEEF4C` fails contrast badly there. It is a text colour only against the near-black field.
- **Don't** let yellow mean more than one thing. It marks recorded reality — never a state, never a category, never decoration. A goal that is behind pace does not change colour.
- **Don't** render the planned track in the accent. Plan is grey, actual is yellow; inverting that inverts the meaning of the whole system.
- **Don't** use `clamp()` for UI type. Fixed rem steps; responsive behaviour is structural.
- **Don't** use mid-grey body text on the dark surface. It is the single most common reason dark UIs feel unreadable — verify 4.5:1 against the actual surface, not against pure black.
- **Don't** reach for a modal first. Exhaust inline and progressive alternatives; modals are usually laziness.
- **Don't** animate page load. The tool opens directly into a task; nobody wants to watch their own dashboard arrive.
