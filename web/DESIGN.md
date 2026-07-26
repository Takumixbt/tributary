# Tributary Design System

Binding specification for the Tributary front end.

---

## 0. Design direction v2: ztocks-derived

**This section supersedes every prior instruction in this document and in the
code comments.** The previous direction was kinetic maximalism: a page-wide
canvas, a dither field, a barber pole, a weight wave, a glyph scramble and two
always-on tapes. That direction is retired. What follows is the direction, and
it is not a starting point to riff on.

The reference is `https://ztocks.vercel.app`. The client's words: "I love
everything about the front end." Treat it as art direction, not inspiration.

### The rules

**Type.** Two families, both variable, both self-hosted through `@fontsource`.

- **Figtree** carries everything typographic: the hero at
  `clamp(2.5rem, 7vw, 7rem)` with `line-height: 0.9` and `-0.03em` tracking,
  section headlines at `--t-h2`, card titles, body copy, and any button that is
  not mono. Sentence case. Never uppercase a headline.
- **Geist Mono** carries data, eyebrows, labels, tags, addresses, amounts,
  timestamps, and the nav's one action.
- The old five-family stack (Space Grotesk, Inter, IBM Plex Mono, Martian Mono,
  Instrument Serif) is gone, along with the serif manifesto line.

**Color.** Pure monochrome, unchanged from v1 and still absolute: black page,
white ink, every value R = G = B. Hairlines are white at 10% (`--hair`). No
shadows. No gradients behind content. `--radius` is `0px` and nothing in this
product is rounded, including buttons.

**One inversion.** Exactly one section on the landing page runs
`data-surface="paper"`: how-it-works. White page, black ink, a diagonal hatch at
5%. A second inversion would make the page look striped.

**Motion.** Calm and sparse. The complete inventory:

1. Sections reveal once on scroll: `opacity 0 -> 1` plus an 8 to 24px rise, over
   800ms (`--dur-reveal`) or 1000ms (`--dur-reveal-long`), staggered by 100ms
   inside a group. `Reveal` is the only component that does this.
2. One horizontal marquee, at the bottom edge of the hero, carrying five facts.
   Slow, linear, seamless, pauses under the pointer. It is the only element in
   the entire product that moves on its own.
3. One letter-by-letter `char-in` on one word of the hero headline. It plays
   once, on load.
4. Four count-up figures in the numbers band. They ramp from zero over 1.4s the
   first time they enter the viewport, then track the live stream.
5. A clock in the numbers band, ticking once a second.
6. The hero graph: the same simulation engine as before, boxed, at its `ambient`
   preset. Slow drift, pulses only when a real payment lands.
7. Hover affordances: a title that leans 8px, a row that takes a 5% wash, an
   arrow that shifts 4px.

Nothing else moves. Nothing blinks, scrambles, shimmers, oscillates its font
weight, or runs a barber pole. Odometer digits are reserved for the four
headline figures and the vault's total assets. Every other number updates
plainly.

**Layout.** `--page-max` is 1400px and the nav uses the same column, so the
logo and the first character of every headline sit on one vertical line.
Sections are `--section-y` tall (80 to 128px of padding, top and bottom).
Hairline grids are built the same way everywhere: `gap: 1px` on a container with
`background: var(--hair)`, children painting `--paper`.

**Eyebrows.** Every section opens with `.eyebrow`: a 32px hairline rule, then a
mono label in sentence case. Centered sections take a rule on both sides.

**Headlines.** Two lines. The second line drops to `--ink-mid`. That single
device carries the whole page and it is used in every section head.

**Buttons.** Two of them. `.btn` is a 56px square hairline button in mono;
`.btn-primary` fills it solid white with black text. The reference rounds its
buttons; this product does not, because zero radius is the stronger rule and it
is applied without exception.

### Page structure, landing

| Section | What it is |
| --- | --- |
| Hero | `min-height: 145vh`, hairline field, boxed graph off the right shoulder, eyebrow, three-line claim with the animated word, one paragraph, two CTAs, marquee pinned to the bottom edge |
| Capabilities | Eyebrow, two-line headline, four numbered rows separated by hairlines, each with a mono index, a title, a paragraph and a static line drawing |
| How it works | The inverted band. Four numbered steps in two columns |
| Numbers | Live clock in the head, four count-up figures in a 2x2 hairline grid |
| Ecosystem | Centered head, six integrations in a 3-up hairline grid |
| Security | The threat model: pills, the attack stated plainly, three prices, the consumer-credit analogy |
| Protocol | Three deployed addresses in mono linking to arcscan, then the proven cycle as a quiet evidence table |
| CTA | One large line, one primary button, one mono note |
| Footer | Hairline top rule, four columns, mono base line naming the stream |

### Page structure, terminal

`/app` keeps its information architecture and wears this skin: Figtree
headings, Geist Mono data, hairline gaps, generous padding, sentence-case
labels. The full event ledger sits behind an `Activity` disclosure, closed by
default. The underwriter feed is three rows. There is no persistent ledger rail
and no mode banner: the footer states which stream is running.

---

## 1. Product, brand, voice

**Name:** Tributary. Always capitalised, never "the Tributary", never an
acronym.

**Positioning line:** "Credit for the agent economy."

**What we are:** credit infrastructure for AI agents that earn through x402
nanopayments on Arc. Revenue history becomes a credit score. A vault lends
against it. Every payment the agent earns splits at its RevenueRouter until the
debt clears.

**The thesis in four words:** earn, score, lend, repay.

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

### Copy rules

- **No em dashes anywhere.** Use a period, a colon, or a comma. This is absolute.
- No exclamation marks. No rhetorical questions. No "simply", "just", "easily",
  "seamless", "revolutionary", "unlock", "empower", "leverage" as a verb.
- No emoji, in the UI or in code.
- No process narrative in code comments or copy. Comments explain the decision
  and the constraint, never the history of how the file was written.
- Sentence case everywhere, including headlines. Uppercase is reserved for
  marquee tags, stat labels and underwriter action words.
- Numbers: always digits, always tabular.
- Money: "USDC" as a suffix or column header, never a `$` sign.
- Time: relative on live surfaces ("4s ago"), absolute mono on the ledger
  ("14:22:09.481").

### Lexicon, fixed

| Use | Not |
| --- | --- |
| agent | bot, worker, AI |
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

**Zero hue. Every color value in this product has R = G = B.** There is no
accent color, no success green, no danger red, not even at 5% opacity.

The ramp lives in `src/styles/tokens.css` and its canvas mirror in
`src/lib/paint.ts`. Use the semantic aliases in CSS, never the ramp directly.

```
--n-000 #000000   --n-300 #2b2b2b   --n-700 #a3a3a3   --n-950  #f4f4f4
--n-050 #050505   --n-400 #414141   --n-800 #c9c9c9   --n-1000 #ffffff
--n-075 #0a0a0a   --n-500 #5c5c5c   --n-900 #e8e8e8
--n-100 #101010   --n-600 #7d7d7d
--n-150 #161616   --n-200 #1c1c1c
```

| Token | Role |
| --- | --- |
| `--paper` | page surface. Dark by default (`--n-050`) |
| `--paper-raised` / `--paper-sunken` | hover wash, inset wells |
| `--ink` | primary text |
| `--ink-strong` | pure white. Headlines, live values, hover |
| `--ink-mid` | body copy, the dimmed second headline line |
| `--ink-dim` | eyebrows, units, roles |
| `--ink-faint` | timestamps, stat labels, notes |
| `--hair` | white at 10%. The one border value |
| `--hair-soft` / `--hair-strong` | one step either side of it |

`data-surface="paper"` flips the aliases to a white page with black ink. Used
once. `data-surface="deep"` is the terminal's surface: pure black page.

**State without color.** Credit health is form, never hue: throttled rows drop
to `--ink-mid`, flagged rows carry a static `!` in mono, and the health column
says the word. Nothing blinks.

---

## 3. Type

Two families, self-hosted through `@fontsource`, loaded once in `src/main.tsx`.

| Role | Family | Token |
| --- | --- | --- |
| Everything typographic | Figtree Variable | `--font-display`, `--font-body` |
| Everything numeric or labelled | Geist Mono Variable | `--font-mono`, `--font-spec` |

### Scale

Mono sizes are fixed px because data density must not breathe: `--t-3xs 10`,
`--t-2xs 11`, `--t-xs 12`, `--t-sm 13`, `--t-md 14`, `--t-lg 15`.

Everything else is fluid: `--t-body`, `--t-lead`, `--t-h3`, `--t-h2`, `--t-h1`,
`--t-display` (the hero, `clamp(2.5rem, 7vw, 7rem)`), `--t-mega` (the numbers
band).

Utility classes in `global.css`: `.display .h1 .h2 .h3 .lead .body .spec
.spec-strong .eyebrow .mono .num .num-tail .num-unit .btn .btn-primary .btn-sm`.

### Numerals, non negotiable

Every element that renders a number carries `.num` or `.mono`, which set
`font-variant-numeric: tabular-nums slashed-zero`.

- Counts pad with leading zeros: `padCount()`.
- Scores are always three columns: `formatScore()`.
- USDC groups with a thin space, never a comma: `formatUsdc()`.
- Sub-cent tails render at `.num-tail` (0.4 opacity) via `splitAmount()`.
- Share price shows six decimals. Yield and APR are basis points via
  `formatBps()`.

---

## 4. Space, grid, layout

Spacing is a 4px scale, `--s-1` (4px) through `--s-12` (256px). Use tokens, not
literals. The only literals allowed in CSS are `1px` hairlines and canvas
geometry.

Key tokens: `--page-max 1400px`, `--pad-x clamp(24px, 3.4vw, 48px)`,
`--section-y clamp(80px, 8vw, 128px)`, `--topbar-h 64px`,
`--panel-pad clamp(20px, 1.6vw, 32px)`, `--radius 0px`.

**The gap is the border.** A grid container paints `--hair` as its background
and its children paint `--paper`, so the 1px `gap` reads as a hairline rule.
This is how the numbers band, the ecosystem grid, the threat grid, the desk
stats and the desk grid are all built.

**Shell.** `src/shell/` and `src/styles/shell.css` own the nav, the main column
and the footer. The nav is fixed, transparent, and takes a blurred black backing
plus a hairline once the page has scrolled 64px. The landing page pulls itself
up under it with a negative top margin so the hero paints its own top edge.

**Responsive targets.** 1440px and 1680px are the design widths. 1180px must be
excellent, 1024px correct, 900px readable, 620px graceful. The nav's centre
links drop below 1024px.

---

## 5. Motion

Section 0 lists the complete inventory. The rules that keep it honest:

1. **One clock.** `MotionProvider` runs the only `requestAnimationFrame` loop in
   the app. Subscribe with `useTick`. Opening your own loop is a bug.
2. **Nothing loops without a reason.** The marquee is the one exception and it
   pauses on hover.
3. **Motion never carries information alone.** Kill every animation and the page
   still tells the whole story.

Timing tokens: `--dur-instant 90`, `--dur-fast 160`, `--dur-base 260`,
`--dur-slow 480`, `--dur-reveal 800`, `--dur-reveal-long 1000`,
`--dur-camera 900`. Easings: `--ease-out` for anything arriving,
`--ease-in-out` for anything travelling both ways.

**Reduced motion.** `prefers-reduced-motion: reduce` or `?motion=0` sets
`--motion-scale` to 0 and collapses the durations to 1ms. Under it: the reveals
become cuts, the marquee never starts, the char-in shows the word immediately,
the count-ups still run because they are data, and the graph freezes its layout
and repaints only when something happens. Reduced motion removes travel, not
truth.

**Performance.** 60fps at 1680x1050 is the bar; test with `?debug=1`. Anything
that changes every frame is written through a `ref` inside `useTick`. Never
`setState` at frame rate. Cap DPR at 2. No `box-shadow`, no `filter: blur`, and
`backdrop-filter` only on the nav.

---

## 6. The network graph

The engine in `src/graph/**` is unchanged and still the product's signature
visual. What changed is where it runs: it is no longer a pair of fixed
full-viewport canvases behind the whole app. It is one `NetworkGraph` instance,
boxed inside the hero, at the `ambient` preset.

Scene space is a nominal 1000 x 620 box (`SCENE_BOX`). All physics and camera
math happens in scene units. `sceneToScreen` and `screenToScene` in
`src/graph/camera.ts` are the only places the conversion may live.

### Node grammar: shape is the identity channel

| Role | Form |
| --- | --- |
| buyer agent | hollow circle, 1px stroke, r 3.5 |
| seller agent | solid white disc, r 6 to 12, by revenue velocity |
| RevenueRouter | 45-degree rotated square outline, 9 across |
| TributaryVault | concentric double rings, r 14 and 20 |
| lender | small filled square, 4 across |
| underwriter | 1px crosshair, 12 across |

### Pulses and the split moment

A payment is a bright short segment travelling its edge, radius from
`pulseRadius(microAmount)`. **The split moment is the most legible thing the
graph does:** a pulse reaching a router forks into two pulses whose radii are
proportional to the split, 20% continuing to the vault and 80% to the agent,
with a one-frame flash on the router.

Physics is velocity Verlet with damping 0.85, weak repulsion, spring edges and
soft pin forces that hold the left-to-right reading: buyers, seller, router,
vault, lenders, with the underwriter above. Left to right is earn, split, repay.
Never let the layout scramble that.

Density target: 5 seller agents, 8 to 14 buyers, 4 lenders, 1 router per agent,
1 vault, 1 underwriter.

**Determinism as a feature.** Demo mode seeds its PRNG from the URL (`?seed=`),
so the choreography is reproducible for the demo video and for live judging. The
beat sheet is `src/data/simulator/choreography.ts`.

The DOM anchor registry (`src/graph/anchors.tsx`) still exists and still works,
but nothing registers an anchor at present: with the full-bleed stage gone there
is no viewport-wide layer for a connector to cross. Leave it wired.

---

## 7. Component inventory

### Frozen contract, `src/lib/**`

| Path | Exports |
| --- | --- |
| `src/lib/types.ts` | every event and state type, `isKind`, `EventStream` |
| `src/lib/stream.ts` | `createEventHub`, `hubToStream`, `createNullStream`, empties |
| `src/lib/format.ts` | `formatUsdc`, `splitAmount`, `compactUsdc`, `toUsdcNumber`, `toMicro`, `formatBps`, `formatScore`, `padCount`, `shortAddress`, `formatClock`, `formatAgo`, `formatRate`, `bpsOf`, `formatSharePrice`, `THIN`, `FIGURE` |
| `src/lib/motion.ts` | `DUR`, `EASE`, `clamp`, `lerp`, `damp`, `smoothstep`, `wrap`, `noise2`, `drift`, reduced-motion helpers |
| `src/lib/paint.ts` | `PAINT`, `ink`, `CANVAS`, `fitCanvas`, `phosphorClear`, `BAYER4`, `dither`, `pulseRadius` |
| `src/lib/env.ts` | `ADDRESSES`, `RPC_URL`, `STREAM_MODE`, `IS_DEMO`, `DEMO_SEED`, `DEMO_SPEED`, `DEBUG`, `hasChainConfig`, `ARC_CHAIN_ID` |
| `src/lib/deployment.ts` | `DEPLOYED`, `EXPLORER`, `explorerAddress`. The live Arc testnet addresses the page states as fact |
| `src/lib/stage.ts` | `ANCHORS`, `SCENES`, `SCENE_FRAMES`, `SCENE_BOX` |

### Kinetic, `src/kinetic/**`

Four primitives survive v2.

| Path | Export |
| --- | --- |
| `MotionProvider.tsx` | `MotionProvider`, `useMotion`, `useTick`. The one rAF loop |
| `Odometer.tsx` | `Odometer`. Headline figures only |
| `Sparkline.tsx` | `Sparkline`. 1px path, `live={false}` everywhere now |
| `Reveal.tsx` | `Reveal({delay, rise, long})`. The one scroll behaviour |
| `Marquee.tsx` | `Marquee({speed, pauseOnHover, label})`. The one moving strip |

Deleted in v2: `BorderCurrent`, `DitherField`, `DotGrid`, `GlyphSettle`,
`HairlineGrid`, `HatchBar`, `WeightWave`. Do not reintroduce them.

### Landing, `src/pages/landing/**`

`Landing.tsx` composes, in order: `Hero`, `Capabilities`, `HowItWorks`,
`Numbers`, `Ecosystem`, `Security`, `Protocol`, `CtaBand`. `bits.tsx` holds
`Eyebrow` and `SectionHead`; `Diagrams.tsx` holds the four static line drawings.

### Terminal, `src/dashboard/**`

`DashboardPage` renders the head, six mono readings, the panel grid and the
Activity disclosure. Panels: `VaultPanel`, `FeaturedAgent` (with `ScoreDial`,
now a quiet number and meter, and `DebtBar`, now a hairline bar), `SplitTicker`,
`AgentRoster` plus `AgentRow`, `UnderwriterFeed` (three rows), `EventLedger`
(inside the disclosure). `parts.tsx` holds `Amount`, `PanelHead`, `Waiting`,
`Meter`, `useAgentLabels`, `useSeconds`.

Deleted in v2: `LedgerRail`, `ModeBanner`.

Empty states are part of the design. Before the first event, panels show their
labels and a `--ink-faint` line: "waiting for the first payment". Never a
spinner.

---

## 8. Data contract and modes

`src/lib/types.ts` is the contract in full. The essentials:

- **Money is always `Micro`: a bigint of 6-decimal USDC base units.** 1 USDC is
  `1_000_000n`. Convert at the edge of rendering.
- **Time is always `at`: milliseconds since epoch, as a number.**
- Events are a discriminated union on `kind`. Narrow with `isKind`.
- A payment and its split are separate events, with a delay between them.
- `subscribe` delivers only events after the moment of subscription. Use
  `history()` for what already happened.
- `onSnapshot` fires immediately, then on change, coalesced to one call per
  frame.
- Producers replace objects, they never mutate them.

**Mode selection** is in `src/lib/env.ts` and nothing else may decide it:
`?demo=1` forces demo, `?demo=0` forces chain, `VITE_STREAM_MODE` overrides, and
otherwise demo is chosen when any required address is missing. Both modes drive
identical UI. The footer names the mode, because honesty is part of the design.

Chain mode that cannot read sets status `stalled` with a reason and keeps
rendering the last snapshot. A frozen terminal that admits it is frozen beats a
terminal that lies.

URL parameters: `?demo=`, `?seed=`, `?speed=`, `?motion=0`, `?debug=1`.

---

## 9. Accessibility

- Contrast: body text at `--ink-mid` on `--paper` clears 7:1.
- Canvas layers are `aria-hidden`. Everything the graph shows is also text.
- Odometers set an `aria-label` with the plain value.
- Focus is a 1px `--ink-strong` outline at 2px offset. Never remove it.
- Every interactive element is a real `button` or `a`. No clickable divs.
- Respect `prefers-reduced-motion` through `useMotion`.
- The marquee duplicates its content, so the copies are `aria-hidden`.

---

## 10. Definition of done

1. `pnpm --filter @tributary/web typecheck` and `build` are green from the repo
   root.
2. No hue anywhere. Search the diff for `#` values and confirm R = G = B, and
   for `hsl`, `rgb(` with unequal channels, and any color name.
3. No em dashes in any string a user can see, or anywhere else.
4. 60fps at 1680x1050 with `?debug=1`, and no console errors.
5. `?motion=0` verified: everything readable, every value still updating.
6. Layout correct at 1680, 1440, 1180, 1024 and 900px, graceful at 390px.
7. No `setState` in a frame loop. No second `requestAnimationFrame`.
8. Nothing unused ships in the bundle graph.

---

## 11. Do not

- Do not add a color. Not one.
- Do not round a corner, add a shadow, or add a gradient behind content.
- Do not add a second inverted section.
- Do not add a second thing that moves on its own.
- Do not reintroduce a dither field, a barber pole, a glyph scramble, a weight
  wave or a persistent tape.
- Do not uppercase a headline.
- Do not open a second animation loop.
- Do not write a number without tabular figures.
- Do not use an em dash.
- Do not describe the product with adjectives when a number is available.
