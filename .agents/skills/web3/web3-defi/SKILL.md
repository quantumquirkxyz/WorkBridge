---
name: "web3-defi"
category: "web3"
maturity: "stable"
version: "2"
description: "Analyse DeFi protocols — AMMs, lending, stablecoins, derivatives, intents, solver networks — across protocol mechanics, economic security, MEV protection, and composability risks."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Protocol classified; mechanics and economic security documented; recommendation tied to risk profile."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "web3"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/web3-defi.json"
diataxis: "how-to"
tags: ["web3"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Emit `Web3DefiArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/web3-defi/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# DeFi Protocol Analysis

Analyse a **DeFi protocol** — AMM, lending, stablecoin, derivative, intents, or restaking — for mechanics, economic security, MEV protection, composability, and regulatory posture.

## When to use

- The user wants to understand, build on, or invest in a DeFi protocol.
- A protocol needs an economic or security due-diligence pass.
- A quant or portfolio strategy involves DeFi as an asset class or venue.
- Intents-based trading (Anoma, Essential, UniswapX) or solver networks need evaluation.

## Process

### 1. Classify the protocol type

Name the category and specific protocol:

- **AMM:** Uniswap v4 (hooks, concentrated liquidity), Curve (stableSwap, CRV), Balancer (weighted pools).
- **Lending / borrowing:** Aave v3 (isolated markets, GHO), Compound v3 (isolated risk), Morpho (peer-to-pool).
- **Stablecoins:** over-collateralised (DAI, USDS), algorithmic (not recommended), LST (stETH, rETH), LRT (eigenLayer, Renzo).
- **Derivatives / structured:** GMX v2 (GLP), dYdX v4 (off-chain order book), Synthetix (perps).
- **Intents / solver networks:** UniswapX, 1inch Fusion, Anoma, Essential; solver competition, Dutch auctions, MEV capture.
- **Restaking / AVS:** eigenLayer, Symbiotic, Puffer; slashing conditions, operator economics.

**Completion criterion:** category and protocol named; brief mechanism described.

### 2. Core mechanics

- **State variables:** what state does the protocol hold? (Reserves, collateral, positions, intents.)
- **Invariant:** what mathematical invariant holds? (x·y=k, utilisation U = borrows/supply, etc.)
- **Mechanisms:** arbitrage, liquidation, fee distribution — state each with its trigger.
- **Parameters:** fee tiers, collateral factors, liquidation thresholds, rate models, solver fees.

**Completion criterion:** invariant, mechanisms, and parameters all stated.

### 3. Economic security

- **TVL:** total value locked; source and meaning (TVL ≠ value; can be inflated).
- **Collateral:** over-collateralisation ratio; worst-case if collateral drops 50%.
- **Oracle:** how is price obtained? Chainlink? TWAP? Univ3? What if it fails?
- **Solvency:** can the protocol cover all liabilities under stress? Run a health factor simulation.
- **Liquidity:** TVL / daily volume; slippage at size; liquidity provider concentration.

**Completion criterion:** TVL, collateral ratio, oracle, solvency assessment, and liquidity documented.

### 4. MEV, intents, and solver networks

If the protocol uses intents or solver networks:

- **Intent flow:** user signs intent → solver network competes → best solution executed.
- **Solver competition:** how are solvers incentivised? Fee model, priority, reputation.
- **MEV capture:** who captures MEV? Users, solvers, protocol? Is it transparent?
- **Censorship:** can solvers censor certain transactions? Is there a fallback?
- **Latency:** intent-to-execution time; timeouts and expiration.

**Completion criterion:** intent/solver mechanics and MEV dynamics documented.

### 5. Composability and systemic risk

- **Composability:** does it call other protocols? Can a reentrancy or price-manipulation cascade occur?
- **Contagion:** if one major protocol fails (UST-style), what is the contagion path?
- **Fee sustainability:** are protocol fees sufficient to cover operations, insurance, and growth?
- **Shared risk:** does the protocol share collateral, liquidity, or oracles with other protocols?

**Completion criterion:** composability constraints and systemic risks named.

### 6. Regulatory posture

- **KYC / AML:** does the protocol restrict by jurisdiction? IP blocking, KYC gating.
- **Securities law:** does any token qualify as a security? How is compliance handled?
- **Sanctions:** does the protocol screen addresses against OFAC or other sanctions lists?

**Completion criterion:** regulatory risk and compliance posture documented.

### 7. Recommendation

Assess overall risk / reward:

- **Green:** deploy or integrate with standard risk mitigations.
- **Yellow:** proceed with caution; specific mitigations required.
- **Red:** do not deploy; fundamental design or economic flaws.

**Completion criterion:** recommendation tied to explicit risk factors.

## Rules

- Rule: classify the protocol before comparing mechanics or economics.
- Rule: state oracle, liquidation, and upgrade risks explicitly.
- Rule: include MEV, intents, and solver dynamics when relevant.
- Rule: separate protocol risk from token / governance risk.
- Rule: prefer protocols with transparent solvency, non-custodial design, and audited code.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml