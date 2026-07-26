# Tributary

**Credit infrastructure for the agent economy, built on Arc and Circle Nanopayments.**

AI agents that sell services over x402 get paid in thousands of tiny USDC payments. That income stream is the most transparent revenue history any borrower has ever had: cryptographically verifiable, real time, sub-second granularity. Tributary turns it into credit.

- Agents earn a **credit score** from their nanopayment revenue history.
- A **lending vault** extends them USDC working capital against future earnings, priced per second.
- Repayment is **enforced by the payment rail itself**: every incoming payment auto-splits between the lender and the agent until the loan clears. Repayment is plumbing, not a promise.
- The loan book is managed by an autonomous **underwriter agent** that watches live revenue and throttles credit in real time.

In one sentence: we lend money to AI workers and get paid back automatically with a slice of every penny they earn.

## Why Arc

- **USDC is gas and money.** The entire credit lifecycle (deposit, draw, split, repay) stays in one asset.
- **Sub-second finality** makes real-time credit control real: when an agent's revenue stops, the underwriter can throttle its line within a block.
- **Nanopayments (x402 + Circle Gateway)** produce the underwriting data. Sub-cent payments at zero gas mean even a small agent builds a dense, honest revenue history in days.
- **ERC-8004 agent identity** makes reputation portable. A defaulting agent burns an identity worth more than the loan.

## Architecture

```mermaid
flowchart LR
    B[Buyers / other agents] -- "x402 nanopayments (USDC)" --> G[Circle Gateway]
    G -- "withdrawals" --> R[RevenueRouter]
    R -- "repayment slice" --> V[TributaryVault]
    R -- "remainder" --> A[Agent wallet]
    L[Lenders] -- "deposit USDC" --> V
    V -- "credit draws" --> A
    U[Underwriter agent] -- "scores + credit lines" --> V
    G -. "revenue telemetry" .-> U
    R -. "onchain telemetry" .-> U
```

Three small contracts:

| Contract | Role |
| --- | --- |
| `TributaryVault` | Lender deposits (share-based), credit lines, per-second simple interest, draws and repayments. Interest paid raises the share price, so lender yield comes from real agent cashflows. |
| `AgentRegistry` | Onboards an agent, deploys its `RevenueRouter`, stores its metadata, ERC-8004 identity and underwriter-posted credit score. |
| `RevenueRouter` | The agent's payout address. On every flush it splits accumulated revenue: while debt is outstanding, a fixed share services the loan and the rest forwards to the agent. Debt cleared means 100% passthrough. |

An Arc-specific detail: native gas and the USDC ERC-20 are two views of the same balance on Arc, so the router handles both plain native transfers and ERC-20 transfers with a single code path.

## The credit loop

1. An agent registers. Its `RevenueRouter` is deployed and becomes its x402 payout address.
2. It sells services (per query, per page, per job) via Nanopayments. Revenue history accumulates in Gateway and on the router.
3. The underwriter agent reads that history, posts a score, and opens a credit line sized to it.
4. The agent draws working capital when a job needs upfront spend (compute, data, API costs).
5. Every payment it earns auto-splits at the router until the debt plus interest is repaid.
6. Its score and limit grow with each clean cycle. Lenders collect the interest.

## Honest threat model

A borrowing agent could redirect its x402 payouts away from its router after drawing. Tributary prices this instead of pretending it away:

- Credit limits start small and grow only with repayment history, so the value of the standing line exceeds any one-time theft.
- The score is anchored to the agent's ERC-8004 identity. Defaulting burns a portable reputation that took real revenue to build.
- The underwriter watches Gateway revenue in real time and throttles the line the moment inflows deviate from the router's telemetry.

This is the same logic that makes unsecured consumer credit work, applied to borrowers whose income is fully observable.

## Repo layout

```
contracts/   Solidity (Foundry): vault, registry, router + tests
agents/      TypeScript: seller agent (x402), underwriter agent   [in progress]
web/         Lender dashboard + live split visualization          [in progress]
```

## Development

```bash
cd contracts
forge test
```

Deploy to Arc Testnet (chain id 5042002, gas is USDC, faucet at faucet.circle.com):

```bash
UNDERWRITER_ADDRESS=0x... forge script script/Deploy.s.sol \
  --rpc-url https://rpc.testnet.arc.network --broadcast
```

## Status

Built for the Arc Programmable Money hackathon (Encode Club, 2026). Contracts and test suite working; agents and dashboard in progress. Testnet addresses will be listed here after deployment.
