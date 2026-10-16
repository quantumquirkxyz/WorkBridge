---
description: "Analyse market microstructure — order book dynamics, price formation, execution costs (slippage, spread, impact), and optimal execution strategies."
---
# quant-market-micro

When to use: Analyse market microstructure — order book dynamics, price formation, execution costs (slippage, spread, impact), and optimal execution strategies.

## Workflow

1. Identify venue type — lit exchange, dark pool, OTC, CEX vs DEX
2. Order book model — queueing theory (Geometric Brownian Motion of queue), Glosten-Milgrom (adverse selection), or Kyle's lambda
3. Spread decomposition — bid-ask spread = adverse selection + inventory + order processing cost
4. Execution costs — slippage vs arrival price, market impact (temporary vs permanent), timing risk from delay
5. Optimal execution — Almgren-Chriss framework (minimise expected cost + variance of execution); VWAP, TWAP, POV benchmarks
6. Data requirements — tick data, order log, trade reporting; NO OHLCV-only backtests for microstructure claims
7. Deliver — artifact: venue model, spread decomposition, cost estimate (bps), and optimal execution schedule

## Deliverables

- quant artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Analyse market microstructure complete; required sections present; completion criteria checked.
