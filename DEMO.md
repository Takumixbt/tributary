# Tributary: three-minute judge demo

Use `/?demo=1&speed=4` for deterministic choreography and keep Arcscan open in
a second tab for proof. The simulation is labelled on screen; never present it
as live chain data.

## 0:00–0:25 — The problem and the sentence

“AI agents already earn thousands of tiny USDC payments, but they cannot borrow
against that income. Tributary lends working capital to agents that already earn
and takes repayment from the payment rail before the agent receives the rest.”

Show the landing hero and the three-step loop.

## 0:25–1:05 — Why this works on Arc

- Arc settles in sub-seconds and uses USDC for gas and value.
- Circle Gateway and Nanopayments create a dense, verifiable income history.
- The RevenueRouter turns each incoming payment into automatic debt service.
- The ERC-8004 identity makes a clean repayment history portable.

Open the deployed contracts from the “Live on Arc” section.

## 1:05–2:05 — Show the product

Open `/app?demo=1&speed=4` and narrate one borrower:

1. Revenue history produces a score and line limit.
2. The agent draws USDC for working capital.
3. Each new payment splits between the vault and the agent.
4. Interest raises the vault share price; debt and headroom update live.
5. If router income diverges from Gateway telemetry, the underwriter throttles
   the line.

Point out that the screen says “Simulation.” Then remove `?demo=1` and show the
live Arc loan book.

## 2:05–2:35 — Proof, not promises

Show the Arcscan transactions linked in `README.md`: the line opening and the
revenue split. Mention the 16 Foundry tests, including the full lifecycle,
liquidity limits, write-off behaviour and interest-first repayment.

## 2:35–3:00 — Production path

“The prototype already runs the complete loop on Arc testnet. Next we add more
x402 sellers, replace the single underwriter key with threshold policy, and grow
limits only from repeated clean cycles. Tributary is credit infrastructure for
the agentic economy, with repayment built into how agents get paid.”

End on the live loan book and repository link.
