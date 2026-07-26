/*
 * Contract read surface. Zone: src/data/**.
 *
 * Mirrors agents/src/abi.ts. Keep the two in sync by hand: the web app only
 * needs views and events, and deliberately does not import from the agents
 * package so the front end stays independently buildable.
 */

import { parseAbi } from "viem";

export const vaultAbi = parseAbi([
  "function totalAssets() view returns (uint256)",
  "function availableLiquidity() view returns (uint256)",
  "function totalShares() view returns (uint256)",
  "function totalPrincipal() view returns (uint256)",
  "function sharesOf(address) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function debtInfo(address agent) view returns (uint256 debt, uint16 repaymentBps)",
  "function lines(address agent) view returns (address router, uint128 limit, uint128 principal, uint128 accruedInterest, uint64 lastAccrual, uint16 aprBps, uint16 repaymentBps, bool active)",
  "event Deposited(address indexed lender, uint256 assets, uint256 shares)",
  "event Withdrawn(address indexed lender, uint256 assets, uint256 shares)",
  "event Drawn(address indexed agent, uint256 amount, uint256 principalAfter)",
  "event Repaid(address indexed agent, address indexed payer, uint256 interestPaid, uint256 principalPaid)",
  "event LineOpened(address indexed agent, address indexed router, uint128 limit, uint16 aprBps, uint16 repaymentBps)",
  "event LineUpdated(address indexed agent, uint128 limit, uint16 aprBps, uint16 repaymentBps)",
  "event LineClosed(address indexed agent)",
  "event InterestAccrued(address indexed agent, uint256 interest)",
  "event WrittenOff(address indexed agent, uint256 principalLost, uint256 interestLost)",
]);

export const registryAbi = parseAbi([
  "function routerOf(address agent) view returns (address)",
  "function agents(address) view returns (address router, uint256 erc8004Id, uint32 score, uint64 scoredAt, string metadataURI)",
  "function agentCount() view returns (uint256)",
  "function agentList(uint256) view returns (address)",
  "event AgentRegistered(address indexed agent, address indexed router, uint256 erc8004Id, string metadataURI)",
  "event ScoreUpdated(address indexed agent, uint32 score, string reason)",
]);

export const routerAbi = parseAbi([
  "function agent() view returns (address)",
  "function cumulativeRevenue() view returns (uint256)",
  "function cumulativeRepaid() view returns (uint256)",
  "event RevenueSplit(uint256 total, uint256 toVault, uint256 toAgent)",
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
