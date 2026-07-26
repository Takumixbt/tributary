/*
 * The stage contract. FROZEN: owned by the design lead.
 *
 * The graph is not a boxed widget. It runs on two fixed full-viewport canvases,
 * one behind the content and one above it, and its edges physically terminate
 * on DOM elements owned by other zones. That only works if everyone agrees on
 * two vocabularies:
 *
 *   ANCHORS  where an edge may land, and which side of the rect it lands on
 *   SCENES   where the camera looks, section by section
 *
 * Both live here so the graph zone, the landing zone and the dashboard zone can
 * be built in parallel without talking to each other.
 */

/** Which node an anchored edge belongs to. "featured" resolves at runtime. */
export type AnchorBind = "buyers" | "agent" | "router" | "vault" | "lenders" | "underwriter" | "featured";

/** Which edge of the anchor's bounding box the connection terminates on. */
export type AnchorSide = "left" | "right" | "top" | "bottom" | "center";

export type AnchorId =
  | "hero-claim"
  | "hero-metrics"
  | "sec-revenue"
  | "sec-score"
  | "sec-credit"
  | "sec-repayment"
  | "threat-model"
  | "cta-terminal"
  | "vault-panel"
  | "roster-panel"
  | "featured-agent"
  | "split-ticker"
  | "underwriter-feed"
  | "event-ledger"
  | "ledger-rail";

/**
 * Canonical anchor ids. Import the constant, never the string literal, so a
 * rename is a compile error instead of a silently dead connector.
 */
export const ANCHORS = {
  heroClaim: "hero-claim",
  heroMetrics: "hero-metrics",
  secRevenue: "sec-revenue",
  secScore: "sec-score",
  secCredit: "sec-credit",
  secRepayment: "sec-repayment",
  threatModel: "threat-model",
  ctaTerminal: "cta-terminal",
  vaultPanel: "vault-panel",
  rosterPanel: "roster-panel",
  featuredAgent: "featured-agent",
  splitTicker: "split-ticker",
  underwriterFeed: "underwriter-feed",
  eventLedger: "event-ledger",
  ledgerRail: "ledger-rail",
} as const satisfies Record<string, AnchorId>;

/**
 * Camera scenes. The graph never unmounts and never hides: scrolling moves a
 * lerped camera over one continuous simulation, so the page reads as a tour of
 * a single living system.
 *
 *   hero       the whole economy, wide
 *   revenue    the buyer cluster paying into one seller
 *   score      one agent's neighborhood, score aura legible
 *   credit     the vault reaching out to the agent as a draw
 *   repayment  the router split, close enough to read both forks
 *   dashboard  the vault cluster, framed so its edges land in the panels
 */
export type SceneId = "hero" | "revenue" | "score" | "credit" | "repayment" | "dashboard";

export const SCENES = {
  hero: "hero",
  revenue: "revenue",
  score: "score",
  credit: "credit",
  repayment: "repayment",
  dashboard: "dashboard",
} as const satisfies Record<string, SceneId>;

export const SCENE_ORDER: readonly SceneId[] = [
  "hero",
  "revenue",
  "score",
  "credit",
  "repayment",
  "dashboard",
];

/**
 * Where each scene puts the camera, in scene-space units. The simulation lives
 * in a nominal 1000 x 620 box with buyers around x=120, the seller around
 * x=500, the router at x=700 and the vault at x=880.
 */
export interface CameraFrame {
  /** Center of interest in scene space. */
  x: number;
  y: number;
  /** 1 = the whole 1000-unit box fits the viewport width. */
  zoom: number;
}

export const SCENE_FRAMES: Record<SceneId, CameraFrame> = {
  hero: { x: 500, y: 310, zoom: 1 },
  revenue: { x: 300, y: 310, zoom: 1.45 },
  score: { x: 500, y: 300, zoom: 1.9 },
  credit: { x: 700, y: 300, zoom: 1.6 },
  repayment: { x: 720, y: 310, zoom: 2.3 },
  dashboard: { x: 830, y: 300, zoom: 1.25 },
};

/** Nominal simulation box. Physics anchors and camera frames share these units. */
export const SCENE_BOX = { width: 1000, height: 620 } as const;
