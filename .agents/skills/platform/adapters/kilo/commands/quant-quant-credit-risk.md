---
description: "Model credit risk — PD, LGD, EAD, expected loss, loss distribution, credit VaR — with default correlation and portfolio-level risk aggregation."
---
# quant-credit-risk

When to use: Model credit risk — PD, LGD, EAD, expected loss, loss distribution, credit VaR — with default correlation and portfolio-level risk aggregation.

## Workflow

1. Define scope — single name / portfolio; rating grade; time horizon (1Y PD, lifetime PD)
2. Estimate PD — historical default frequency,迁移矩阵, KMV-Merton model, or logistic regression on financial ratios
3. Estimate LGD — workout LGD vs market LGD; recovery rate; downturn LGD (regulatory)
4. Estimate EAD — drawn amount + credit conversion factor (CCF) for off-balance-sheet
5. Compute Expected Loss (EL) = PD × LGD × EAD; Unexpected Loss (UL) = √(variance of loss)
6. Default correlation — Basel rho formula (equity-based), or copula (Gaussian, t-copula). Aggregate portfolio loss distribution
7. Stress testing — PD + 2 grades, LGD × 1.5, portfolio loss at 99.9%
8. Deliver — artifact: PD/LGD/EAD estimates with methodology, EL/UL, correlation, stress test, and regulatory compliance note (Basel III / IFRS 9)

## Deliverables

- quant artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Model credit risk complete; required sections present; completion criteria checked.
