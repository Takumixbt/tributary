# Tributary Design System

Binding specification for the Tributary front end. Three builders work in
parallel from this document without talking to each other. Where it is
prescriptive, it is prescriptive on purpose: a shared decision beats a better
decision made twice in two different ways.

Read sections 0, 1, 2, 3, 5 and 9 in full whatever you are building. Then read
your own zone's section.

---

## 0. Zones, ownership, rules of engagement

| Zone | Paths you own | Also allowed |
| --- | --- | --- |
| **A. Graph** | `src/graph/**` | none |
| **B. Kinetic and landing** | `src/kinetic/**`, `src/pages/Landing.tsx`, `src/pages/landing/**` | none |
| **C. Dashboard and data** | `src/dashboard/**`, `src/data/**` | none |
| **Integrator** | `src/App.tsx`, `src/main.tsx`, `src/styles/**`, `src/shell/**`, `index.html` | everything |

Hard rules:

1. **Never write a file outside your zone.** If you need something from another
   zone, it is already stubbed with the signature you should code against. If it
   is missing, work around it locally and note it in your summary. Do not reach
   into another zone to "just add one prop".
2. **`src/lib/**` is frozen.** It is the contract: types, formatters, motion
   constants, canvas ink, env resolution, stream plumbing, stage vocabulary. Read
   it, do not edit it. Local widening inside your own zone is fine.
3. **CSS lives in your zone.** `src/graph/graph.css`, `src/kinetic/kinetic.css`,
   `src/pages/landing/landing.css`, `src/dashboard/dashboard.css`. Import it from
   your own components. Never edit `src/styles/**`, never redefine a token, never
   restyle a utility class from `global.css`.
4. **Cross-zone imports go through the barrel only:** `../graph`, `../kinetic`,
   `../data`, `../dashboard`. Never a deep path into another zone.
5. **The exported names in each zone's `index.ts` are a contract.** Internals are
   yours. Public signatures are not.
6. **`pnpm --filter @tributary/web build` must stay green in every commit.**
7. **No new dependencies.** The stack is fixed: Vite, React 18, TypeScript,
   wagmi v2, viem, TanStack Query, react-router-dom, `@fontsource*`. No UI kit,
   no Tailwind, no animation library, no charting library, no three.js. Canvas 2D
   and CSS do all of it.

Path alias: `@/` resolves to `src/`, so `@/lib/types` works. Relative imports are
also fine. Be consistent inside a file.

---

## 1. Product, brand, voice

**Name:** Tributary. Always capitalised, never "the Tributary", never an acronym.
A tributary is a stream that feeds a larger river: every agent's revenue is a
tributary flowing into the vault. Never explain the metaphor in copy.

**One-liner, exact wording, used once on the landing page in Instrument Serif:**

> We lend money to AI workers and get paid back automatically with a slice of
> every penny they earn.

**Positioning line for the top bar and meta tags:** "Credit for the agent
economy."

**What we are:** credit infrastructure for AI agents that earn through x402
nanopayments on Arc. Revenue history becomes a credit score. A vault lends
against it. Every payment the agent earns splits at its RevenueRouter until the
debt clears.

**The thesis in four words, and the site's spine:** earn, score, lend, repay.

### Voice

Confident, concrete, technical, unhurried. Short declaratives. We are a company
that has already shipped this, describing what it does. Numbers instead of
adjectives. Name the failure modes before anyone asks.

Write like this:

- "Repayment is plumbing, not a promise."
- "Interest accrues per second and lands in the share price."
- "An agent can walk away. We price that."

Not like this:

- "Revolutionary AI-powered credit protocol."
- "Seamlessly unlock liquidity for the agent economy."
- "We believe agents deserve financial access."

### Copy rules

- **No em dashes anywhere.** Use a period, a colon, or a comma. This is absolute.
- No exclamation marks. No rhetorical questions. No "simply", "just", "easily",
  "seamless", "revolutionary", "unlock", "empower", "leverage" as a verb.
- No emoji, in the UI or in code.
- No process narrative in code comments or copy. Comments explain the decision
  and the constraint, never the history of how the file was written.
- Sentence case for body and headings. UPPERCASE only for spec labels, section
  numbers, agent labels and buttons.
- Numbers: always digits, always tabular. "3 agents", not "three agents".
- Money: "USDC" as a suffix or column header, never a `$` sign. Amounts never
  round away the sub-cent tail on the tape.
- Time: relative on live surfaces ("4s ago"), absolute mono on the tape
  ("14:22:09.481").

### Lexicon, fixed

| Use | Not |
| --- | --- |
| agent | bot, worker (except in the one-liner), AI |
| nanopayment | micropayment, microtransaction |
| credit line | loan, debt facility |
| draw | borrow, take out |
| split | distribution, allocation |
| debt service | repayment amount |
| underwriter | risk engine, oracle |
| vault | pool, treasury |
| lender | LP, investor, depositor |
| terminal | dashboard, app (in user-facing copy) |
| score | rating, credit rating |

---

## 2. Color: strict monochrome

**Zero hue. Every color value in this product has R = G = B.** If you are about
to write a value where the channels differ, stop. Contrast, weight, texture and
motion do all the expressive work. There is no accent color, no success green,
no danger red, no brand hue, not even at 5% opacity.

The ramp lives in `src/styles/tokens.css` and its canvas mirror in
`src/lib/paint.ts`. Use the semantic aliases in CSS, never the ramp directly.

```
--n-000 #000000   --n-300 #2b2b2b   --n-700 #a3a3a3   --n-950  #f4f4f4
--n-050 #050505   --n-400 #414141   --n-800 #c9c9c9   --n-1000 #ffffff
--n-075 #0a0a0a   --n-500 #5c5c5c   --n-900 #e8e8e8
--n-100 #101010   --n-600 #7d7d7d
--n-150 #161616   --n-200 #1c1c1c
```

Semantic aliases, which are the only thing you write in component CSS:

| Token | Role |
| --- | --- |
| `--paper` | page surface. Dark by default (`--n-050`) |
| `--paper-raised` / `--paper-sunken` | dense panel lift, inset wells |
| `--ink` | primary text |
| `--ink-strong` | pure white. Reserved: live values, hover, the one white flash |
| `--ink-mid` | body copy, secondary values |
| `--ink-dim` | spec labels, units |
| `--ink-faint` | timestamps, disabled, annotation |
| `--ink-ghost` | structural marks you should barely see |
| `--hair` / `--hair-soft` / `--hair-strong` | 1px rules, at alpha not solid |
| `--hair-live` | the bright border used by the flash and the border current |
| `--scrim` / `--scrim-heavy` | panel backing over the graph canvas |

**Inverted surfaces.** Set `data-surface="paper"` on a section and the five
semantic aliases flip to a white page with black ink. Use it exactly twice on the
landing page: the manifesto band and one other editorial moment of your choice.
Inversion is punctuation. A third use makes the page look striped.

`data-surface="deep"` is the dashboard's surface: pure black page, `--n-075`
panels, heavier scrim.

**State without color.** Credit health is communicated by form, never hue:

| State | DOM | Graph |
| --- | --- | --- |
| healthy | value at `--ink`, hairline at `--hair` | solid edge, filled node |
| throttled | value at `--ink-mid`, 1px dashed rule above the row | dashed edge, small node jitter |
| delinquent | value at `--ink-mid`, row prefixed with a `!` in spec mono | outline-only node, 2s blink |
| cleared | one white flash, then settle | expanding 1px ring wave |

**Opacity is the syntax highlighting.** Sub-cent decimals at 0.4. Structural
marks at 0.06. Nothing between 0.4 and 1.0 for text: pick a gray token instead.

Pure `#ffffff` is a resource, not a color. It is spent on: live pulse cores, the
one-frame ledger flash, hover states, and the featured agent's node. If white is
everywhere, the page has no live layer.

---

## 3. Type

Five families, self-hosted through `@fontsource`, loaded once in `src/main.tsx`.
Do not add a weight or a family.

| Role | Family | Token | Where |
| --- | --- | --- | --- |
| Display | Space Grotesk Variable | `--font-display` | hero claim, section titles, wordmark, big numbers in headlines |
| Body | Inter Variable | `--font-body` | paragraphs, only paragraphs |
| Data | IBM Plex Mono 400/500 | `--font-mono` | every address, amount, timestamp, table cell, counter |
| Spec | Martian Mono 400 | `--font-spec` | section numbers, panel labels, axis titles, buttons, corner annotations |
| Editorial | Instrument Serif italic | `--font-serif` | the manifesto line. Nowhere else. Ever. |

### Scale

Mono and spec sizes are fixed px because data density must not breathe:
`--t-3xs 9`, `--t-2xs 10`, `--t-xs 11`, `--t-sm 12`, `--t-md 13`, `--t-lg 15`.

Everything else is a 1.25 modular scale off 16px, fluid through `clamp()`:
`--t-body`, `--t-lead`, `--t-h3`, `--t-h2`, `--t-h1`, `--t-display`, `--t-mega`.

**The barbell rule.** Huge display, tiny dense mono, almost nothing in between.
Do not reach for `--t-h3` to fill a gap: either the thing is a headline or it is
data. This is what makes the page read as designed rather than assembled.

**Three text roles per screen, maximum:** one display, one body, one mono-data.
The spec mono label does not count against the budget because it is chrome.

### Numerals, non negotiable

Every element that renders a number carries `.num` or `.mono`, which set
`font-variant-numeric: tabular-nums slashed-zero`. A rolling counter without
tabular figures shifts layout on every tick and the whole instrument illusion
collapses.

- Counts pad with leading zeros: `AGENTS 007`, via `padCount()`.
- Scores are always three columns: `formatScore()`.
- USDC groups with a thin space, never a comma: `formatUsdc()`.
- Sub-cent tails render at `.num-tail` (0.4 opacity) via `splitAmount()`, so a
  six-decimal nanopayment scans instantly instead of reading as noise.
- Share price shows six decimals. Yield and APR show two, as basis points
  formatted by `formatBps()`.
- Units are a separate `<span class="num-unit">`, 0.8em, `--ink-dim`.

### Typographic details

- Display is uppercase with `--tr-display` (-0.03em) tracking. Tight, almost
  crowded, is correct at hero sizes.
- Spec labels are uppercase, 10 to 11px, `--tr-spec` (0.08em). Never larger.
- Body copy caps at `--measure` (62ch) and sits at `--ink-mid`. It must stay
  quiet so the mono data and display caps carry the contrast.
- Never italicise anything except the manifesto line.
- No text shadows. No gradients on text. No outlined text.

---

## 4. Space, grid, layout

Spacing is a 4px scale, `--s-1` (4px) through `--s-12` (256px). Use tokens, not
literals. The only literals allowed in CSS are `1px` hairlines and canvas
geometry.

**The gap is the border.** Panels have no borders, no shadows, no radius. A grid
container paints `--hair` as its background and its children paint `--paper`, so
the 1px `gap` reads as a hairline rule. `--radius` is `0px` and stays that way:
nothing in this product is rounded.

Key layout tokens: `--page-max 1560px`, `--pad-x clamp(16px, 3.2vw, 48px)`,
`--rail-w 320px`, `--topbar-h 44px`, `--banner-h 22px`, `--tick 6px`.

Shared utilities in `global.css` (do not restyle them): `.wrap`, `.grid12`,
`.panel`, `.panel-head`, `.frame` (hairline box with engineering corner ticks),
`.rule`, `.stack`, `.row`, `.btn`, `.btn-primary`, `.sr-only`, plus the type
classes `.display .h1 .h2 .h3 .lead .body .manifesto .spec .spec-strong .mono
.num .num-tail .num-unit`.

**Shell.** `src/shell/` and `src/styles/shell.css` own the mode banner, the top
bar, the main column and the ledger rail slot. The rail is `position: sticky` at
320px on the right of every route. Below 1180px `--rail-w` becomes 0 and the rail
becomes a fixed 96px bottom ticker strip: design the rail's contents to survive
that rotation.

**Responsive targets.** 1440px and 1680px are the design widths. 1180px must be
excellent. 900px must be correct and readable. Below 700px must be graceful:
single column, graph density reduced, rail as a ticker. Mobile is not the
priority and no layout should be complicated to serve it.

---

## 5. Motion: kinetic procedural

### What "kinetic procedural" means here

Motion in this product is **generated, continuous, and caused by data**. It is
not a set of transitions that fire when the DOM changes. The page is an
instrument wired to a live payment stream: the dither shimmers, the tape ticks,
the pulses travel, the counters roll, and all of it is driven from the same
frame and the same events. If you can point at an animation and say "that plays
when you scroll to it", it does not belong here, with exactly one exception
(`Reveal`, section 8).

Three principles:

1. **One clock.** `MotionProvider` runs the only `requestAnimationFrame` loop in
   the app. Subscribe with `useTick`. Opening your own loop is a bug, because
   two loops mean the dither and the graph drift out of phase and the page stops
   reading as one machine.
2. **Data moves, so pixels move.** Every motion traces back to an event or to a
   slow procedural field. Nothing moves because it looked nice.
3. **Motion never carries information alone.** Kill every animation and the page
   still tells the whole story in text and static form. That is what makes the
   reduced-motion path honest rather than degraded.

### Timing

From `--dur-*` in tokens.css, mirrored as `DUR` in `src/lib/motion.ts`:

| Token | ms | Use |
| --- | --- | --- |
| instant | 90 | hover, focus, digit swap |
| fast | 160 | value change, small state change |
| base | 260 | panel state, camera micro-move |
| slow | 480 | reveal, hatch bar width |
| flash | 800 | ledger row white baseline decay |
| camera | 900 | scene to scene reframe |
| settle | 1200 | glyph settle on a rare high-signal change |

Easings: `--ease-out` for anything arriving, `--ease-in-out` for anything
travelling both ways, `--ease-spring` for odometer digits and pulse birth only,
`--ease-step` for anything that should feel mechanical. `EASE` in
`src/lib/motion.ts` gives the numeric equivalents for canvas.

**Use `damp(current, target, halfLife, dt)` instead of `lerp(a, b, 0.1)` in every
frame loop.** Frame-rate dependent lerp makes the page run at a different speed
on a 144Hz display, which is the single most common way work like this falls
apart on a judge's laptop.

### The twelve behaviours

These are the vocabulary. Do not invent a thirteenth without a reason you could
defend in one sentence.

1. **Odometer counters.** Every live metric renders each digit in its own
   `overflow: hidden` column that translates vertically with a spring ease when
   the value changes. Tabular figures guarantee zero layout shift. All counters
   read the same tick so the page moves as one instrument.
2. **Ledger tape.** Append-only log, new rows enter at the top with a one-frame
   pure-white top border that decays to `--hair` over 800ms. DOM is recycled past
   50 rows. This is the heartbeat of the whole site and it runs on every route.
3. **Ordered-dither field.** A slow radial gradient rendered to a 160px
   offscreen canvas, thresholded per pixel through a 4x4 Bayer matrix
   (`BAYER4`, `dither()` in `lib/paint.ts`), upscaled with
   `image-rendering: pixelated`. The field center drifts on low-frequency noise
   and its intensity kicks briefly on each payment.
4. **Glyph settle.** New digits run through two or three frames of random
   monospace glyphs before settling, CRT decode style. Reserved for score
   changes, line changes and debt clearance. Using it on the payment tape would
   make the product feel like a toy.
5. **Grid that becomes the chart.** A global hairline grid at 0.06 alpha. When a
   chart enters the viewport, the nearest grid lines animate their weight and
   position into that chart's axes, so charts feel carved out of the page.
6. **Border current.** When a payment routes to a panel, a short bright segment
   travels that panel's border as an SVG `stroke-dashoffset` animation. It reads
   as electricity arriving through a wire and it is what ties the graph world to
   the DOM world.
7. **Cursor-proximity dot grid.** Dots within ~120px of the pointer lift in
   brightness and scale by 1.3x. When the pointer is idle, the newest payment
   pulse's screen position takes the cursor's role, so the surface stays alive
   during a hands-off demo.
8. **Debt-drain hatch bar.** Debt as a 45-degree 1px hatched region that animates
   `background-position` like a barber pole while repayments stream, with a hard
   right edge that wipes left as principal clears. Repayment becomes watchable.
9. **Variable-weight throughput pulse.** A sine wave of font weight (450 to 620,
   never wider) travels through the hero headline at a speed proportional to
   payments per minute. It should be felt, not noticed.
10. **Phosphor persistence.** Canvas layers are cleared by painting translucent
    black (`phosphorClear`, alpha 0.12) instead of `clearRect`, so pulses leave
    decaying trails and heavy traffic literally glows brighter.
11. **Sparkline heads with overshoot.** 1px stroke, and only the newest point
    gets a 2px entry overshoot and a small `shadowBlur`. Blur on one point is
    cheap. Blur on a path is not.
12. **Split fork.** A pulse arriving at a router forks into two pulses with radii
    proportional to the split, with a one-frame flash on the router node. See
    section 6: this is the most important animation in the product.

### Reduced motion

`prefers-reduced-motion: reduce` (or `?motion=0`) sets `--motion-scale` to 0 and
collapses every duration to 1ms. `useMotion().motionScale` exposes the same value
to JS. Under reduced motion:

- pulse travel becomes an instant opacity blip at the origin and destination
- the dither field freezes on one frame, the grid and dot grid stay static
- odometers cross-fade the digit instead of rolling it
- the hatch barber pole stops, widths still change
- the weight wave holds at 500
- the ledger flash still decays, over 400ms, because that is how a new row
  announces itself and removing it would remove information
- the camera cuts between scenes instead of panning

Every data update stays visible in every case. Reduced motion removes travel, not
truth.

### Performance rules

- 60fps at 1680x1050 is the bar. Test with `?debug=1`.
- Anything that changes every frame is written through a `ref` inside `useTick`.
  Anything that changes per event uses the hooks in `src/data/hooks.ts`. Never
  `setState` at frame rate.
- Cap DPR at 2 (`CANVAS.dprCap`). Never resize a canvas inside the frame loop:
  do it on `resize` and on `ResizeObserver`.
- Batch canvas state changes. Group strokes by style and call `stroke()` once per
  style, not per element.
- No `box-shadow`, no `filter: blur`, no `backdrop-filter` outside the three
  places `shell.css` already uses it. No `will-change` except on the weight-wave
  characters.
- The loop pauses on `document.hidden` and clamps `dt` to 48ms on resume.

---

## 6. The network graph

The graph is the product. Everything else is annotation.

### Physical setup

Two fixed full-viewport canvases mounted once by `App` and never unmounted:

- **back** (`--z-graph-back`, behind content): edges, trails, unfeatured nodes,
  score auras. Low alpha so content stays readable over it.
- **front** (`--z-graph-front`, above content, `pointer-events: none`): pulses,
  the featured node, anchor connectors. `mix-blend-mode: screen` so a pulse
  crossing a panel brightens rather than blots it.

Both are cleared with `phosphorClear`, never `clearRect`.

Scene space is a nominal 1000 x 620 box (`SCENE_BOX`). All physics and camera
math happens in scene units. `sceneToScreen` and `screenToScene` in
`src/graph/camera.ts` are the only places the conversion may live.

### Node grammar: shape is the identity channel

In strict monochrome, silhouette carries what color would. Sizes are scene units.

| Role | Form | Notes |
| --- | --- | --- |
| buyer agent | hollow circle, 1px stroke, r 3.5 | dozens of them, left side |
| seller agent | solid white disc, r 6 to 12 | radius by revenue velocity |
| RevenueRouter | 45-degree rotated square outline, 9 across | the split happens here |
| TributaryVault | concentric double rings, r 14 and 20 | right side, single instance |
| lender | small filled square, 4 across | clustered at the right edge |
| underwriter | 1px crosshair, 12 across | above the vault, watching |

Labels are 10px uppercase spec mono at `--ink-dim`, shown only for hovered,
focused or featured nodes. A labelled graph is a diagram. An unlabelled graph
with three labels is a live system.

**Score as dithered aura.** An agent's credit score renders as a stippled halo:
precomputed blue-noise points masked to a radius, density proportional to score.
Score changes animate density. Precompute the point sets per radius bucket, never
per frame.

### Edges

- Rest alpha `CANVAS.edgeAlpha` (0.16), hot alpha up to 0.34, decaying back.
- Healthy solid. Throttled credit lines dashed with a small node jitter.
- Delinquent nodes render outline-only and blink slowly, 2s period.
- Edge weight rises with traffic and decays every frame, so busy routes visibly
  thicken during a burst.

### Pulses and the split moment

A payment is a bright short segment travelling its edge, radius from
`pulseRadius(microAmount)` so a 0.0005 USDC nanopayment still registers and a
5 USDC draw does not blot the screen.

**The split moment is the single most legible demo moment in the entire product,
and the hero is choreographed around it.** When a pulse reaches a router node it
forks into two pulses whose radii are proportional to the split: 20% continues
right to the vault, 80% continues to the agent, with a one-frame flash on the
router. A judge who watches the hero for five seconds and understands nothing
else should still understand that money arrives, gets divided, and part of it
goes to the lender automatically. Hold the camera on the fork during the scripted
beat at second 34.

Other one-off events:

- debt cleared: a single expanding 1px ring wave from the router
- agent registers: node fades in on the left, small ring wave
- draw: a pulse from the vault to the agent, wider and slower than a payment
- deposit: a pulse from the lender cluster into the vault

### Physics

Velocity Verlet. Damping 0.85. Weak repulsion. Spring edges. Plus **soft pin
forces**, which are what make the topology read as a sentence:

```
buyers      x 90 to 200, spread on y
seller      x 460 to 540, center
router      x 700
vault       x 880, y 310
lenders     x 960
underwriter x 880, y 90
```

Left to right is earn, split, repay. Never let the layout scramble that. Add a
small per-node Perlin drift (`drift()` in `lib/motion.ts`) so the graph never
fully sleeps, and clamp velocity so a burst cannot fling a node off screen.

Density target: 5 seller agents, 8 to 14 buyers, 4 lenders, 1 router per agent,
1 vault, 1 underwriter. Roughly 30 nodes and 40 edges. That is enough to read as
an economy and few enough that every node stays individually legible.

### Bleed: the graph is not a widget

The graph must flow into the page. Two mechanisms:

1. **DOM anchors.** Panels and sections register connection points through
   `useGraphAnchor(ANCHORS.vaultPanel, "vault", "left")`. The registry measures
   them and the engine terminates real edges on those viewport coordinates, so
   pulses fly out of the simulation and arrive inside the vault panel's border.
   The anchor and side vocabulary is in `src/lib/stage.ts` and is shared by all
   three zones.
2. **Camera, not curtain.** Scroll drives a lerped camera over the same
   simulation. Sections wrap in `<GraphScene id="repayment">` and the camera
   reframes when that section owns the viewport. The graph never unmounts, never
   fades to zero, and never gets covered by an opaque section. Content panels sit
   over it on `--scrim` with a blur, so the graph is visible through the page at
   all times.

Scene frames are defined in `SCENE_FRAMES`: hero wide at zoom 1, revenue 1.45,
score 1.9, credit 1.6, repayment 2.3, dashboard 1.25.

### Determinism as a feature

Demo mode seeds its PRNG from the URL (`?seed=`), so the choreography is
reproducible for the demo video and for live judging. A scripted 90-second loop
guarantees the full lifecycle appears: an agent joins, earns, gets scored, draws
credit, repays through the split, and clears. The beat sheet is
`src/data/simulator/choreography.ts` and it is a design document as much as a
data file. Background nanopayment traffic never stops underneath the beats.

---

## 7. Page architecture

### 7a. Landing, `/`

Full-bleed living graph with editorial panels sliding over it. Section numbers in
Martian Mono are the wayfinding. Every narrative section is wrapped in a
`GraphScene` and every section that a connector should touch registers an anchor.

| # | Section | Component | Scene | Anchor |
| --- | --- | --- | --- | --- |
| 00 | Hero | `Hero`, `MetricStrip` | `hero` | `heroClaim`, `heroMetrics` |
| 01 | Manifesto band | `Manifesto` | none | none |
| 02 | 01 REVENUE | `LoopSection` | `revenue` | `secRevenue` |
| 03 | 02 SCORE | `LoopSection` | `score` | `secScore` |
| 04 | 03 CREDIT | `LoopSection` | `credit` | `secCredit` |
| 05 | 04 REPAYMENT | `LoopSection` | `repayment` | `secRepayment` |
| 06 | 05 WHY ARC | `WhyArc` | none | none |
| 07 | 06 THREAT MODEL | `ThreatModel` | none | `threatModel` |
| 08 | CTA | `CtaTerminal` | `dashboard` | `ctaTerminal` |
| 09 | Footer | `LandingFooter` | none | none |

**Hero.** Full viewport minus the bar. The graph runs behind everything. One
centered claim, at `--t-display`, uppercase, wrapped in `WeightWave`. One metric
strip flush to the bottom of the viewport: four odometers in a hairline grid,
reading vault assets, payments per minute, active agents, average score. No
chrome beyond the hairline top bar. No scroll indicator. No secondary button.
The router split must be visible in the graph within the first five seconds
without the reader doing anything.

Approved hero copy, pick one and do not soften it:

- "Credit for machines that earn"
- "We finance the agents that already get paid"

Sub-line under the claim, one sentence maximum, at `.lead`:

> Agents sell work over x402 and get paid thousands of times a day. Tributary
> lends against that income and takes its repayment out of the stream.

**Manifesto band.** `data-surface="paper"`, the one serif line, nothing else in
the band. Full-width, generous vertical padding. This is the grandma test: a
non-technical reader gets the whole product from this one sentence.

**The credit loop, sections 01 to 04.** Each is a `LoopSection` with a spec
number, a display title, one body paragraph capped at `--measure`, and optional
inline data. The camera moves to that stage of the graph as it enters. Connectors
continue from one section's anchor to the next, so the page reads as the money's
circuit. Copy for the four sections is already in `src/pages/Landing.tsx` and is
approved: refine wording, keep the claims.

**05 WHY ARC.** Four flat claims, no hedging: USDC is gas so the credit lifecycle
never leaves the asset; sub-second finality makes real-time throttling real;
gasless nanopayments are what generate the underwriting data; ERC-8004 identity
makes the reputation worth more than the loan. Set as a hairline-gapped 4-up grid
of spec label plus one sentence.

**06 THREAT MODEL.** Honest, prominent, not a footnote. State the attack: a
borrowing agent can redirect its x402 payouts away from its router after drawing.
Then state the three prices: limits start small and grow only with repayment
history, the score is anchored to a portable ERC-8004 identity that took real
revenue to build, and the underwriter throttles the line the moment Gateway
inflows stop matching router telemetry. Close with the analogy in one line:
this is how unsecured consumer credit works, applied to borrowers whose income is
fully observable. A page that names its own failure mode is trusted more than one
that does not, and no competing hackathon page will do this.

**CTA.** The last connector in the circuit terminates here, so opening the
terminal feels like following the wire. One primary button: "Open terminal".
Nothing else competes with it.

### 7b. Terminal, `/app`

A trading desk. 12-column grid, 1px gaps, `data-surface="deep"`. No cards, no
borders, no shadows, no radius, no rounded anything. Density is the aesthetic:
whitespace lives on the landing page, not here. The persistent ledger rail is
outside the page, rendered by `App` on every route.

Grid at 1440px and up:

```
row 1   VaultPanel        cols 1-5    FeaturedAgent   cols 6-9    SplitTicker  cols 10-12
row 2   AgentRoster       cols 1-9    UnderwriterFeed cols 10-12
row 3   EventLedger       cols 1-12
```

At 1440px and below the row-1 split becomes 6 / 6 and row 2 becomes 7 / 5. Below
900px everything spans 12.

**VaultPanel** (`vaultPanel` anchor, bind `vault`, side `left`). The lender's
view: total assets as the largest odometer on the page, available liquidity,
share price to six decimals, trailing yield in basis points, lifetime interest
earned, and a utilization `HatchBar` in fill mode. A `BorderCurrent` fires on
every `repay` event, because a repayment is literally money arriving at this
panel. The graph's vault node terminates its edges on this panel's left border.

**FeaturedAgent** (`featuredAgent` anchor, bind `featured`, side `left`). The
agent under the lens: `ScoreDial` as a dithered arc with a glyph-settling number
at its center, the line terms (limit, APR, repayment share), a debt-drain
`HatchBar`, and the underwriter's latest reason in its own words. This is what
the `score` camera scene is looking at.

**SplitTicker** (`splitTicker` anchor, bind `router`, side `left`). One row per
flush, animating the moment itself: the total arrives, a hard 1px divider slides
across it to the split ratio, leaving a vault share and an agent share labelled
in spec mono. The panel exists so the thesis stays legible even when the graph is
off screen.

**AgentRoster** (`rosterPanel` anchor, bind `agent`, side `right`). Dense table,
one row per agent: label, service, score, limit, drawn, debt, revenue
`Sparkline`, payments per minute, health. Hairline row separators only. No zebra
striping. Sort order is the snapshot's order, which is score descending. Clicking
a row sets the featured agent and the graph camera follows.

**UnderwriterFeed** (`underwriterFeed` anchor, bind `underwriter`, side `left`).
Score updates as sentences: what it saw, what it did, what the line looks like
now. `OPENED`, `RAISED`, `HELD`, `THROTTLED`, `CLOSED` in spec mono, reason in
body text, delta in mono. A feed of decisions rather than numbers is what makes
an autonomous lender believable.

**EventLedger** (`eventLedger` anchor, bind `router`, side `top`). Everything,
newest first, with a kind filter: payments, splits, draws, repayments, scores,
deposits, clearances. Same tape mechanics as the rail with more columns.

**LedgerRail.** 320px, sticky, on every route. Time, actor, kind, amount. New
rows flash white and settle over 800ms. Recycle past 50 rows. On laptop widths
the shell turns it into a fixed 96px bottom ticker: the contents must survive
that rotation.

Empty states are part of the design. Before the first event, panels show their
labels, their axes, and a `--ink-faint` line: "waiting for the first payment".
Never a spinner. Never a blank panel.

---

## 8. Component inventory

Every file below exists and compiles today. `STUB` means it renders a labelled
placeholder and is yours to implement. Signatures marked as contract are imported
by other zones: change the internals freely, never the name or the prop shape.

### Frozen contract, `src/lib/**` (design lead, do not edit)

| Path | Exports |
| --- | --- |
| `src/lib/types.ts` | `PaymentEvent`, `SplitEvent`, `ScoreEvent`, `DrawEvent`, `RepayEvent`, `DepositEvent`, `RegisterEvent`, `ClearedEvent`, `TributaryEvent`, `EventKind`, `isKind`, `VaultState`, `AgentState`, `BuyerState`, `LenderState`, `StreamStats`, `StreamSnapshot`, `EventStream`, `Series`, `Micro`, `Bps`, `Address` |
| `src/lib/stream.ts` | `createEventHub`, `hubToStream`, `createNullStream`, `emptySnapshot`, `emptyVaultState`, `emptyStats`, `emptySeries`, `ZERO_ADDRESS`, `EventDraft` |
| `src/lib/format.ts` | `formatUsdc`, `splitAmount`, `compactUsdc`, `toUsdcNumber`, `toMicro`, `formatBps`, `formatScore`, `padCount`, `shortAddress`, `formatClock`, `formatAgo`, `formatRate`, `bpsOf`, `formatSharePrice`, `THIN`, `FIGURE` |
| `src/lib/motion.ts` | `DUR`, `EASE`, `clamp`, `lerp`, `damp`, `smoothstep`, `wrap`, `noise2`, `drift`, `prefersReducedMotion`, `watchReducedMotion`, `motionScaleFor` |
| `src/lib/paint.ts` | `PAINT`, `ink`, `CANVAS`, `fitCanvas`, `phosphorClear`, `BAYER4`, `dither`, `pulseRadius` |
| `src/lib/env.ts` | `ADDRESSES`, `RPC_URL`, `STREAM_MODE`, `IS_DEMO`, `DEMO_SEED`, `DEMO_SPEED`, `FORCE_REDUCED_MOTION`, `DEBUG`, `hasChainConfig`, `ARC_CHAIN_ID` |
| `src/lib/stage.ts` | `ANCHORS`, `AnchorId`, `AnchorBind`, `AnchorSide`, `SCENES`, `SceneId`, `SCENE_ORDER`, `SCENE_FRAMES`, `SCENE_BOX` |

### Zone A, graph

| Path | Export and signature | State |
| --- | --- | --- |
| `src/graph/index.ts` | barrel. Contract: `GraphStage`, `GraphAnchorProvider`, `GraphAnchor`, `useGraphAnchor`, `useAnchorRects`, `GraphScene`, `GraphCameraProvider`, `useGraphCamera`, `useLatestPulsePoint` | keep exports |
| `src/graph/GraphStage.tsx` | `GraphStage()` no props. Mounts the canvas pair. | STUB |
| `src/graph/anchors.tsx` | `GraphAnchorProvider({children})`, `useGraphAnchor(id, bind, side?) => ref setter`, `GraphAnchor({id, bind, side?})`, `useAnchorRects() => Map<AnchorId, AnchorRect>` | working |
| `src/graph/GraphScene.tsx` | `GraphCameraProvider({children})`, `GraphScene({id, children, className?})`, `useGraphCamera() => {scene, focus}` | working |
| `src/graph/useLatestPulsePoint.ts` | `useLatestPulsePoint() => MutableRefObject<{x,y}\|null>` | STUB |
| `src/graph/camera.ts` | `createCamera`, `stepCamera`, `sceneToScreen`, `screenToScene`, `Camera` | working |
| `src/graph/useGraphEngine.ts` | `useGraphEngine({back, front}) => GraphWorld \| null` | STUB |
| `src/graph/types.ts` | `GraphNode`, `GraphEdge`, `Pulse`, `RingWave`, `GraphWorld` | working |
| `src/graph/sim/topology.ts` | `createWorld()`, `syncTopology(world, snapshot)` | STUB |
| `src/graph/sim/physics.ts` | `PHYSICS`, `PhysicsConfig`, `stepPhysics(world, dtMs, config?)` | STUB |
| `src/graph/sim/pulses.ts` | `spawnFromEvent(world, event)`, `stepPulses(world, dtMs, motionScale)` | STUB |
| `src/graph/render/edges.ts` | `drawEdges(ctx, world, camera, viewport)` | STUB |
| `src/graph/render/nodes.ts` | `drawNodes(ctx, world, camera, viewport)` | STUB |
| `src/graph/render/pulses.ts` | `drawPulses(ctx, world, camera, viewport)` | STUB |
| `src/graph/render/aura.ts` | `blueNoiseDisc(count, seed)`, `drawScoreAura(ctx, node, camera, viewport)` | STUB |
| `src/graph/graph.css` | canvas layer styling | working |

### Zone B, kinetic and landing

| Path | Export and signature | State |
| --- | --- | --- |
| `src/kinetic/index.ts` | barrel. Contract: all names below. | keep exports |
| `src/kinetic/MotionProvider.tsx` | `MotionProvider({children})`, `useMotion() => {motionScale, reduced, subscribe, fpsRef}`, `useTick(listener, enabled?)` | working |
| `src/kinetic/Odometer.tsx` | `Odometer({value, decimals?, group?, pad?, prefix?, suffix?, dimTail?, className?, label?})` | STUB |
| `src/kinetic/Sparkline.tsx` | `Sparkline({values, width?, height?, live?, className?})` | STUB |
| `src/kinetic/HatchBar.tsx` | `HatchBar({value, max, mode?, activity?, height?, label?, className?})` | STUB |
| `src/kinetic/BorderCurrent.tsx` | `BorderCurrent({trigger, duration?, direction?, className?})` | STUB |
| `src/kinetic/DitherField.tsx` | `DitherField({intensity?, kick?, resolution?, className?})` | STUB |
| `src/kinetic/DotGrid.tsx` | `DotGrid({spacing?, reach?, follow?, className?})` | STUB |
| `src/kinetic/HairlineGrid.tsx` | `HairlineGrid({step?, className?})` | STUB |
| `src/kinetic/GlyphSettle.tsx` | `GlyphSettle({value, frames?, className?})` | STUB |
| `src/kinetic/WeightWave.tsx` | `WeightWave({children, rate?, min?, max?, className?})` | STUB |
| `src/kinetic/Reveal.tsx` | `Reveal({children, delay?, className?})` | STUB |
| `src/kinetic/kinetic.css` | primitive styling | working |
| `src/pages/Landing.tsx` | `Landing()` default. Contract: App imports it. | STUB |
| `src/pages/landing/Hero.tsx` | `Hero()` | STUB |
| `src/pages/landing/MetricStrip.tsx` | `MetricStrip()` | STUB |
| `src/pages/landing/Manifesto.tsx` | `Manifesto()` | STUB |
| `src/pages/landing/SectionFrame.tsx` | `SectionFrame({index, label, children, className?})` | working |
| `src/pages/landing/LoopSection.tsx` | `LoopSection({index, label, title, body, children?})` | STUB |
| `src/pages/landing/WhyArc.tsx` | `WhyArc()` | STUB |
| `src/pages/landing/ThreatModel.tsx` | `ThreatModel()` | STUB |
| `src/pages/landing/CtaTerminal.tsx` | `CtaTerminal()` | STUB |
| `src/pages/landing/LandingFooter.tsx` | `LandingFooter()` | STUB |
| `src/pages/landing/landing.css` | landing layout | working |

### Zone C, dashboard and data

| Path | Export and signature | State |
| --- | --- | --- |
| `src/dashboard/index.ts` | barrel. Contract: `DashboardPage`, `LedgerRail` (App imports both). | keep exports |
| `src/dashboard/DashboardPage.tsx` | `DashboardPage()` | STUB |
| `src/dashboard/VaultPanel.tsx` | `VaultPanel()` | STUB |
| `src/dashboard/FeaturedAgent.tsx` | `FeaturedAgent()` | STUB |
| `src/dashboard/AgentRoster.tsx` | `AgentRoster()` | STUB |
| `src/dashboard/AgentRow.tsx` | `AgentRow({agent, featured?, onSelect?})` | STUB |
| `src/dashboard/ScoreDial.tsx` | `ScoreDial({score, size?, reason?})` | STUB |
| `src/dashboard/SplitTicker.tsx` | `SplitTicker()` | STUB |
| `src/dashboard/UnderwriterFeed.tsx` | `UnderwriterFeed()` | STUB |
| `src/dashboard/EventLedger.tsx` | `EventLedger()` | STUB |
| `src/dashboard/LedgerRail.tsx` | `LedgerRail()` | STUB |
| `src/dashboard/StatTile.tsx` | `StatTile({label, value, unit?, note?, align?})` | working |
| `src/dashboard/DebtBar.tsx` | `DebtBar({debt, limit, activity?, label?})` | STUB |
| `src/dashboard/dashboard.css` | desk grid and tape styling | working |
| `src/data/index.ts` | barrel. Contract: `EventStreamProvider`, `useEventStream`, `useSnapshot`, `useVaultState`, `useAgents`, `useAgent`, `useFeaturedAgent`, `useStats`, `useEvents`, `useEventPulse`, `wagmiConfig` | keep exports |
| `src/data/EventStreamProvider.tsx` | provider plus `useEventStream()`. Swap the two `PRODUCER` lines. | STUB |
| `src/data/hooks.ts` | selector hooks, signatures above | working |
| `src/data/simulator/prng.ts` | `createRng(seed)`, `hashSeed`, `Rng` | working |
| `src/data/simulator/fixtures.ts` | `AGENT_FIXTURES`, `BUYER_LABELS`, `LENDER_LABELS`, `DRAW_PURPOSES`, `fakeAddress` | working |
| `src/data/simulator/choreography.ts` | `BEATS`, `LOOP_SECONDS`, `Beat`, `BeatKind` | working |
| `src/data/simulator/createSimulator.ts` | `createSimulator({seed, speed?}) => EventStream` | STUB |
| `src/data/chain/createChainStream.ts` | `createChainStream({addresses, rpcUrl}) => EventStream` | STUB |
| `src/data/chain/reads.ts` | `readVault(vault)`, `readRoster(registry)` | STUB |
| `src/data/chain/wagmi.ts` | `wagmiConfig`, `arcTestnet` | working |
| `src/data/chain/abi.ts` | `vaultAbi`, `registryAbi`, `routerAbi`, `erc20Abi` | working |

### Integrator

| Path | Notes |
| --- | --- |
| `src/App.tsx` | provider order and routes. Do not edit from a zone. |
| `src/main.tsx` | font loading, root mount. No StrictMode, deliberately: imperative canvas engines and one shared rAF loop must not be double-invoked in development. |
| `src/styles/tokens.css` | tokens. Frozen. |
| `src/styles/global.css` | reset, type classes, utilities. Frozen. |
| `src/styles/shell.css` | banner, top bar, rail, main column. Frozen. |
| `src/shell/TopBar.tsx`, `src/shell/ModeBanner.tsx` | shell chrome. |
| `index.html`, `vite.config.ts`, `tsconfig.json`, `.env.example` | build. |

---

## 9. Data contract and modes

`src/lib/types.ts` is the contract in full. The essentials:

- **Money is always `Micro`: a bigint of 6-decimal USDC base units.** 1 USDC is
  `1_000_000n`. Never a float, never pre-divided, never a string. Convert at the
  edge of rendering with `formatUsdc` or `toUsdcNumber`.
- **Time is always `at`: milliseconds since epoch, as a number.**
- Events are a discriminated union on `kind`. Narrow with `isKind(event, "split")`.
- A payment and its split are separate events, with a delay between them, exactly
  like a real Gateway withdrawal followed by a flush.
- `subscribe` delivers only events after the moment of subscription. Use
  `history()` for what already happened.
- `onSnapshot` fires immediately with the current world, then on change,
  coalesced to at most one call per frame.
- Producers replace objects, they never mutate them. Treat every snapshot field
  as immutable.

**Mode selection** is in `src/lib/env.ts` and nothing else may decide it:
`?demo=1` forces demo, `?demo=0` forces chain, `VITE_STREAM_MODE` overrides, and
otherwise demo is chosen when any required address is missing.

The contracts are live on Arc Testnet and the addresses sit commented in
`.env.example`. They stay commented until the chain reader is implemented, so
demo is the current default and the build never depends on a testnet being up.

Both modes drive identical UI. If a
component behaves differently in demo mode, that is a bug, with one exception:
the `ModeBanner`, which says which mode is running because honesty is part of the
design.

Chain mode that cannot read sets status `stalled` with a reason and keeps
rendering the last snapshot. A frozen dashboard that admits it is frozen beats a
dashboard that lies.

Useful URL parameters, all handled in `env.ts`: `?demo=`, `?seed=`, `?speed=`,
`?motion=0`, `?debug=1`.

---

## 10. Accessibility

- Contrast: body text at `--ink-mid` on `--paper` clears 7:1. Never put live
  values below `--ink-mid`. `--ink-faint` is for text nobody needs to read.
- Canvas layers are `aria-hidden`. Everything the graph shows is also available
  as text in a panel. The graph is never the only source of a fact.
- Odometers set an `aria-label` with the plain value, because the digit columns
  are decorative markup.
- Focus is a 1px `--ink-strong` outline at 2px offset. Never remove it. Tab order
  follows the reading order: top bar, main content, then the rail.
- Every interactive element is a real `button` or `a`. No clickable divs.
- Respect `prefers-reduced-motion` through `useMotion`, never by querying the
  media feature yourself.
- Live regions: the ledger rail is `aria-label`led but not `aria-live`. A
  screen reader must not be forced to announce hundreds of nanopayments.

---

## 11. Definition of done

A zone is done when all of the following are true.

Shared:

1. `pnpm --filter @tributary/web build` is green.
2. No file outside your zone was modified.
3. No hue anywhere. Search your diff for `#` values and confirm R = G = B, and
   for `hsl`, `rgb(` with unequal channels, and any color name.
4. No em dashes in any string a user can see.
5. 60fps at 1680x1050 with `?debug=1`, and no console errors or warnings.
6. `prefers-reduced-motion` path verified with `?motion=0`: everything still
   readable, every value still updating.
7. Layout correct at 1680, 1440, 1180 and 900px, and not broken at 390px.
8. No `setState` in a frame loop. No second `requestAnimationFrame`.

Zone A also: the split fork is unmistakable at hero zoom; the graph terminates at
least three edges on real DOM anchors; the camera moves through all six scenes on
scroll without the graph ever unmounting or hiding; the graph survives a resize
and a route change.

Zone B also: all twelve motion behaviours in section 5 that belong to the landing
page are implemented; the landing page tells the whole story with JavaScript
motion disabled; the manifesto serif appears exactly once in the entire app.

Zone C also: both `EventStream` producers satisfy the contract, and swapping
between them changes nothing but the banner; the 90-second choreography plays the
full lifecycle from a cold load; the tape holds at most 50 DOM rows under a
sustained burst; every panel has a designed empty state.

---

## 12. Do not

- Do not add a color. Not one.
- Do not add a dependency.
- Do not round a corner, add a shadow, or add a gradient behind content.
- Do not use the serif for anything but the one manifesto line.
- Do not put a spinner anywhere. Panels show structure and a waiting line.
- Do not animate on scroll except `Reveal`.
- Do not open a second animation loop.
- Do not let the graph become a boxed widget, and do not hide it on scroll.
- Do not write a number without tabular figures.
- Do not use an em dash.
- Do not describe the product with adjectives when a number is available.
