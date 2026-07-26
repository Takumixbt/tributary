/*
 * Public API of the dashboard zone. Zone owner: dashboard and data builder.
 * App.tsx mounts DashboardPage on /app and LedgerRail on every route.
 */

export { DashboardPage } from "./DashboardPage";
export { LedgerRail } from "./LedgerRail";
export { VaultPanel } from "./VaultPanel";
export { AgentRoster } from "./AgentRoster";
export { AgentRow } from "./AgentRow";
export { FeaturedAgent } from "./FeaturedAgent";
export { ScoreDial } from "./ScoreDial";
export { SplitTicker } from "./SplitTicker";
export { UnderwriterFeed } from "./UnderwriterFeed";
export { EventLedger } from "./EventLedger";
export { StatTile } from "./StatTile";
export { DebtBar } from "./DebtBar";
export { Amount, PanelHead, Waiting, Meter } from "./parts";
export { describeEvent, KIND_LABEL, KIND_ORDER } from "./describe";
