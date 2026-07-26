import { parseAbi } from "viem";

export const vaultAbi = parseAbi([
  "function deposit(uint256 assets) returns (uint256)",
  "function withdraw(uint256 shares) returns (uint256)",
  "function draw(uint256 amount)",
  "function repay(address agent, uint256 amount)",
  "function openLine(address agent, address router, uint128 limit, uint16 aprBps, uint16 repaymentBps)",
  "function updateLine(address agent, uint128 limit, uint16 aprBps, uint16 repaymentBps)",
  "function closeLine(address agent)",
  "function debtInfo(address agent) view returns (uint256 debt, uint16 repaymentBps)",
  "function lines(address agent) view returns (address router, uint128 limit, uint128 principal, uint128 accruedInterest, uint64 lastAccrual, uint16 aprBps, uint16 repaymentBps, bool active)",
  "function totalAssets() view returns (uint256)",
  "function availableLiquidity() view returns (uint256)",
  "function sharesOf(address) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "event Drawn(address indexed agent, uint256 amount, uint256 principalAfter)",
  "event Repaid(address indexed agent, address indexed payer, uint256 interestPaid, uint256 principalPaid)",
]);

export const registryAbi = parseAbi([
  "function register(uint256 erc8004Id, string metadataURI) returns (address)",
  "function setScore(address agent, uint32 score, string reason)",
  "function routerOf(address agent) view returns (address)",
  "function agents(address) view returns (address router, uint256 erc8004Id, uint32 score, uint64 scoredAt, string metadataURI)",
  "function agentCount() view returns (uint256)",
  "function agentList(uint256) view returns (address)",
  "event AgentRegistered(address indexed agent, address indexed router, uint256 erc8004Id, string metadataURI)",
]);

export const routerAbi = parseAbi([
  "function flush() returns (uint256 toVault, uint256 toAgent)",
  "function cumulativeRevenue() view returns (uint256)",
  "function cumulativeRepaid() view returns (uint256)",
  "function agent() view returns (address)",
  "event RevenueSplit(uint256 total, uint256 toVault, uint256 toAgent)",
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);
