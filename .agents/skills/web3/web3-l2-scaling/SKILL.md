---
name: "web3-l2-scaling"
category: "web3"
maturity: "stable"
version: "2"
description: "Analyse Layer-2 scaling solutions — Rollups (optimistic, ZK), validiums, based sequencing, shared sequencing — with security assumptions, data availability, and cost trade-offs."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "L2 type classified; security assumptions explicit; recommendation tied to use case."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "web3"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/web3-l2-scaling.json"
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

Emit `Web3L2ScalingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/web3-l2-scaling/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Layer-2 Scaling Analysis

Analyse a **Layer-2 scaling solution** — rollups, validiums, based sequencing, shared sequencers — for security assumptions, throughput, cost, and trade-offs vs L1.

## When to use

- The user wants to choose or build on an L2 solution.
- An L2 protocol needs an architecture review.
- Cost / throughput comparison between L1 and L2 is needed.
- Sequencing decentralisation or shared sequencing is being evaluated.

## Process

### 1. Classify the L2 architecture

Name the category and specific implementation:

- **Optimistic Rollup:** Arbitrum, Optimism; fraud proof window, 7-day withdrawal delay.
- **ZK Rollup (ZK-EVM):** zkSync Era, Scroll, Polygon zkEVM, StarkNet; validity proofs, EVM compatibility level.
- **Validium:** off-chain data availability with on-chain proof verification.
- **Based Rollup / Shared Sequencer:** based sequencing (e.g., based preconfirmations), shared sequencer networks (e.g., Espresso, SUAVE).
- **Plasma / State Channels:** niche use cases; limited contract composability.

**Completion criterion:** L2 type and specific implementation named.

### 2. Architecture and state model

- **State location:** where is account state stored? (L2 calldata, blobs, or separate DA layer).
- **Sequencer:** single sequencer vs decentralised; who can censor or reorder?
- **Prover:** who generates fraud/validity proofs? How are proofs verified on L1?
- **Bridge:** how does L1 ↔ L2 communication work? Asset locking, message passing, proof verification.

**Completion criterion:** architecture diagram or description saved.

### 3. Data availability and sequencing

- **DA model:** on-chain calldata, blobs (EIP-4844), off-chain DA (Celestia, EigenDA), or validium DAC.
- **Sequencing trust:** single sequencer, decentralised sequencer set, or shared sequencer (SUAVE, Espresso).
- **Censorship resistance:** preconfirmations, inclusion lists, mev-boost integration.

**Completion criterion:** DA and sequencing trust models are explicit.

### 4. Security assumptions

- **Optimistic:** honest verifier assumption for 7-day challenge window; 1-of-N honest asserter.
- **ZK:** soundness of proof system (Groth16, PLONK, STARK); trusted setup vs transparent setup.
- **Bridge risk:** cross-chain messaging security; proof verification correctness; upgrade key compromise.
- **Upgrade risk:** proxy upgradeability; multisig control; emergency pause mechanisms.

**Completion criterion:** security assumptions and failure modes documented.

### 5. Throughput and cost

- **TPS ceiling:** theoretical vs practical throughput; batch size, proof generation time.
- **Cost per tx:** L1 settlement cost amortised; L2 execution cost; compare to L1.
- **Finality:** soft finality (sequencer confirmation) vs hard finality (L1 inclusion).

**Completion criterion:** throughput and cost metrics are named and compared.

### 6. Composability and ecosystem

- **EVM compatibility:** bytecode-level compatibility vs trace-level; tooling support.
- **Cross-L2 messaging:** native bridging vs third-party; latency and trust.
- **Developer experience:** tooling, debugging, account abstraction support.

**Completion criterion:** composability constraints and strengths are named.

### 7. Recommendation

Match the L2 choice to use-case priorities:
- **High security / high value:** ZK-EVM with on-chain DA and decentralised sequencing.
- **Maximum EVM compatibility:** mature optimistic rollup or ZK-EVM with full equivalence.
- **High throughput / low cost:** validium or based rollup with off-chain DA.
- **Fast withdrawals:** based rollup with preconfirmations or shared sequencing.

**Completion criterion:** recommendation tied to explicit priorities; risks named.

## Rules

- Rule: classify the L2 before comparing cost, trust, or security assumptions.
- Rule: state data-availability model and sequencing trust explicitly.
- Rule: include bridge, proof, upgrade, and censorship risks.
- Rule: separate throughput claims from finality and settlement guarantees.
- Rule: match recommendation to use-case priorities rather than generic L2 rankings.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml