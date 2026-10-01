# Product

## Register

product

## Users

A single user: the owner, who is also the builder. This is a private internal tool — no other accounts, no sharing, no multi-tenancy, no permissions model, no public surface.

That changes the design constraints in specific ways:

- He has full context on every number. Nothing needs explaining, labelling for strangers, or a first-run tour.
- He is the one entering the data, so he sees the same screens dozens of times a week. Repetition cost is the dominant cost.
- There is no audience to impress and no metric to perform for. The tool can afford to tell him he's off track.

The job to be done: **log quickly, then get an honest read on whether he's actually moving.** Those are two distinct modes, and the interface has to serve both without one burying the other.

## Product Purpose

Personal goal and habit tracking with real progress analytics.

**v1 pillars:**

1. **Goals & progress** — named targets with a value and a deadline, tracked toward completion. Includes financial goals (savings targets, debt paydown) as a *kind of goal* rather than a separate finance module.
2. **Habits & streaks** — recurring daily/weekly commitments tracked for consistency. The read is a pattern over time, not a number going up.

**Deferred, but the data model should not preclude them:** full finance tracking (accounts, net worth, cash flow) and health/body metrics. Both were raised as eventual pillars.

**Primary constraint:** data is entered manually. Capture is a first-class surface, not a settings-page afterthought. If logging a habit takes more than a couple of seconds or more than a couple of interactions, the tool stops getting used and every chart in it goes stale.

Success looks like: opens it daily, logs without friction, and trusts what it says about momentum.

## Brand Personality

**Warm, motivating, personal.**

- **Personal** — it speaks to one person who already knows the context. First person where natural ("your streak", not "user streak"). No corporate voice, no third-person product-speak, no explaining his own data back to him.
- **Motivating** — through *honest momentum*, not cheerleading. Credit real progress specifically ("11 days"), stay quiet on ordinary days, and when a streak breaks, state it plainly and show the path back. No confetti, no manufactured praise, no guilt mechanics.
- **Warm** — carried by typography, copy, and a light canvas that never glares. Not by rounding every corner, not by emoji, not by illustration. Warmth here means *unhurried and on your side*, not soft or cute.

The tone target: a good training log, not a productivity app trying to retain you.

## Anti-references

**The stock dark analytics dashboard** — the pattern all six supplied references converge on: 4-up row of identically-sized KPI cards, a donut chart, a bar chart, a data table. It is the most-generated dashboard layout that exists. The references were provided for *palette and density*, not for layout.

Specifically avoid:

- **Identical card grids.** Equal-weight cards in a repeating grid, where structure conveys nothing about importance.
- **Nested cards.** A card inside a card is always a hierarchy failure.
- **The hero-metric template.** Big number, small label, tiny delta chip, repeated four times.
- **Fake social/enterprise surface.** Notification feeds, activity streams, team avatars, "Hello, [Name] 👋", upsell or premium panels, support-agent widgets. Single user — none of it applies, and all of it appears in the references.
- **Gamification veneer.** Badges, trophies, XP bars, levels, and streak-loss shame loops. Motivation comes from the real data being legible, not from a points economy.
- **Cool corporate SaaS neutrality.** Blue-grey everything, generic geometric sans, safe spacing. It reads competent and says nothing, and it actively contradicts a warm personality.
- **Cross-register AI tells.** Gradient text, decorative glassmorphism, thick coloured side-stripe borders on cards or alerts, a tracked uppercase eyebrow above every section, numbered section markers used as scaffolding.

## Design Principles

1. **Logging is the product.** Capture is the most-repeated action, so it gets the best real estate and the shortest path — not a modal behind a "+" in a corner. Every interaction saved on entry is compounded across every day of use. If a design decision makes the dashboard prettier and logging slower, logging wins.

2. **Honest momentum.** Show what's true, including when it's unflattering. A goal that's behind schedule should look behind schedule. Progress language stays specific and factual; the tool never inflates a number or hides a miss to preserve a mood. Trust is what makes the analytics worth having.

3. **Warmth from voice and type, not from softness.** The personality lives in copy and typography. Resist expressing "warm" through big radii, pastel washes, or illustration — those read as generic-friendly, not personal.

4. **Structure carries the hierarchy.** Importance is expressed through size, position, and density differences — not by giving everything the same card and hoping colour sorts it out. Different kinds of information get genuinely different shapes.

5. **Quiet until it matters.** Default state is calm and low-contrast in its incidentals. The accent is a scarce resource spent on the one thing that needs attention right now. If everything is highlighted, nothing is.

## Accessibility & Inclusion

Target **WCAG 2.2 AA**. Single-user tool, but the constraints are real ergonomics, not compliance theatre — this gets looked at daily, often tired.

- **Contrast.** Body text ≥4.5:1, large text ≥3:1, against its actual background. All three ink levels are verified against all three surfaces; the tightest pair is `ink-3` on `surface-3` at 4.52:1.
- **A tone for text is not a tone for a stroke.** `warn-700` is tuned for small text on light and reads as muddy brown as a line; arcs and bars take `warn-500` instead. Verify every pairing rather than assuming.
- **Never encode meaning by colour alone.** On-track vs. behind, active streak vs. broken, gain vs. loss — always pair colour with a label, shape, position, or icon. The status badge carries a drawn arrow; the pace bar and the ring carry a plan marker.
- **Reduced motion is required, not optional.** Every animation needs a `prefers-reduced-motion: reduce` path — typically a crossfade or an instant state change. Progress and streak animations are the likely offenders.
- **Keyboard-complete capture.** The logging flow must be fully operable from the keyboard, with visible focus states. This is an ergonomics win, not just an a11y one — it's the fastest path for daily entry.
- **Charts need non-colour affordances.** Direct labels over legends where possible; distinguish series by more than hue.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4.
