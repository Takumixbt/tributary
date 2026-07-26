/*
 * Public API of the dashboard zone. Zone owner: dashboard and data builder.
 * App.tsx mounts DashboardPage on /app. There is no persistent ledger rail any
 * more: the full log lives behind the Activity disclosure on the desk itself.
 */

export { DashboardPage } from "./DashboardPage";
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
