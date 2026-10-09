---
name: "web3-consensus"
category: "web3"
maturity: "stable"
version: "2"
description: "Analyse and compare consensus mechanisms — PoW, PoS, BFT, DA, based sequencing — with security properties, finality guarantees, MEV, and economic incentive alignment."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Consensus classified; security properties and economics assessed; recommendation tied to threat model."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "web3"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/web3-consensus.json"
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

Emit `Web3ConsensusArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/web3-consensus/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Consensus Mechanism Analysis

Analyse a **consensus mechanism** — its security model, finality, liveness, MEV, and economic incentives — and compare it against alternatives for a given threat model.

## When to use

- The user wants to choose, design, or audit a blockchain consensus protocol.
- A protocol upgrade changes the consensus layer.
- A security or decentralisation assessment is needed.
- Data availability layers or shared sequencing are being evaluated.

## Process

### 1. Classify the mechanism

Name the class and specific protocol:

- **Nakamoto (PoW):** Bitcoin; probabilistic finality, high energy cost.
- **Classical BFT:** PBFT, Tendermint, HotStuff; deterministic finality within quorum, limited scalability.
- **PoS + finality gadget:** Ethereum PoS (Casper + LMD-GHOST), Cosmos (Tendermint), Polkadot (GRANDPA/BABE).
- **PoS + chain-based:** Ouroboros (Cardano), Algorand (cryptographic sortition).
- **DAG-based:** Avalanche (Snow family), Hashgraph; high throughput, probabilistic finality.
- **Data Availability (DA):** Celestia (namespaced DA), EigenDA (erasure coding), Ethereum Danksharding (blobs).
- **Based / Shared Sequencing:** based sequencing (e.g., based preconfirmations), shared sequencer networks (Espresso, SUAVE).

**Completion criterion:** protocol named; class stated; brief description of how it works.

### 2. Security properties

For each, state the guarantee:

- **Safety:** can two conflicting blocks be finalised simultaneously? Under what adversarial power?
- **Liveness:** does the chain keep producing blocks under adversarial conditions?
- **Finality:** deterministic (BFT) or probabilistic (Nakamoto)? Time to finality?
- **Sybil resistance:** how does it prevent a 51% attack?
- **Censorship resistance:** can a coalition of validators censor transactions? Under what conditions?

**Completion criterion:** each property answered with yes/no/conditional and the threshold.

### 3. Economic incentives

- **Rewards:** block reward source (inflation, fees, MEV); amount; schedule.
- **Slashing:** conditions, penalty magnitude, percent of stake at risk.
- **MEV:** who captures MEV? Validators, builders, users? Is it transparent or extracted?
- **Disincentives:** what prevents selfish mining, MEV extraction, validator bribery?
- **Decentralisation:** are rewards concentrated? What is the minimum stake to participate?

**Completion criterion:** reward source, slashing conditions, MEV dynamics, and decentralisation state reported.

### 4. Data availability and sequencing

- **DA model:** on-chain calldata, blobs (EIP-4844), off-chain DA (Celestia, EigenDA), or validium DAC.
- **Sequencing trust:** single sequencer, decentralised sequencer set, or shared sequencer (SUAVE, Espresso).
- **Censorship resistance:** preconfirmations, inclusion lists, mev-boost integration.

**Completion criterion:** DA and sequencing trust models are explicit.

### 5. Threat model comparison

Compare the chosen consensus against alternatives under:

- **51% attack:** cost to attack (ASIC, stake, colluding validators).
- **Censorship:** under what conditions can censoring occur?
- **Network partition:** what happens during an internet split?
- **Collusion:** can a minority coalition finalise malicious blocks?
- **MEV exploitation:** can validators or builders extract unfair value?

**Completion criterion:** threat model comparison completed for at least 3 attack vectors.

### 6. Deliver

Markdown artifact: classification, security properties, economic incentives, DA/sequencing model, threat model, and a **recommendation** — which consensus fits a given use case (high-security store of value, high-throughput DeFi, censorship-resistant social, etc.).

**Completion criterion:** deliverable complete; recommendation tied to use case.

## Rules

- Rule: classify the consensus before comparing security or economic properties.
- Rule: state finality, DA, and sequencing assumptions explicitly.
- Rule: include MEV extraction and censorship resistance in the threat model.
- Rule: compare at least one meaningful alternative.
- Rule: tie recommendation to use-case priorities rather than generic rankings.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml