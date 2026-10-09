---
name: "web3-smart-contracts"
category: "web3"
maturity: "stable"
version: "2"
description: "Design and review smart contracts — security, gas optimization, upgradeability, account abstraction, EIP-7702 — with an adversarial review step."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Artifact present with deployment recommendation."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "web3"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/web3-smart-contracts.json"
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

Emit `Web3SmartContractsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/web3-smart-contracts/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Smart Contract Design & Review

Design or review a **smart contract** — state, access control, gas, upgrade path, account abstraction — and subject it to an adversarial review before any deployment recommendation.

## When to use

- The user wants to design a smart contract architecture or review existing code.
- A DeFi protocol, token, NFT, or governance contract needs security analysis.
- Account abstraction (ERC-4337) or EIP-7702 delegation needs implementation review.
- A Foundry / Solmate-based project needs gas and security audit.

## Process

### 1. Capture requirements

State the contract's purpose: what state does it hold? What actions change it? What events does it emit? Who calls it?

**Completion criterion:** purpose and state-change surface documented.

### 2. Security review checklist

Check each item; do not skip:

- **Reentrancy:** can an external call be re-entered? Use checks-effects-interactions or ReentrancyGuard.
- **Access control:** which roles exist; how roles are granted and revoked; what happens if an admin is compromised.
- **Integer arithmetic:** overflow / underflow; use SafeMath or native overflow protection.
- **Gas denial:** unbounded loops; gas limits on external calls.
- **Upgradeability:** proxy pattern (UUPS, transparent) — what is the upgrade logic? Who triggers it?
- **Pull vs push:** payments pulled by recipients reduce reentrancy risk.
- **External dependencies:** oracles, other contracts, libraries — what if they fail?
- **MEV / sandwiching:** does the contract expose price-sensitive operations? Can front-running extract value?
- **Account abstraction (ERC-4337):** if using AA, review bundler, paymaster, validation logic, and signature aggregation.
- **EIP-7702 delegation:** if using delegation, review delegation lifecycle, revocation, and security boundaries.

**Completion criterion:** each checklist item addressed explicitly; missing protections named.

### 3. Gas audit

Identify gas hotspots:

- Storage writes (SSTORE is expensive).
- Loops over arrays or mappings.
- Redundant computations.
- Unused variables / dead code.
- Calldata vs memory for function arguments.
- Assembly optimisations (only where correctness is provable).

Suggest optimisations that don't compromise security.

**Completion criterion:** top gas costs identified; at least one cost-reducing recommendation.

### 4. Upgrade / governance / AA path

If upgradeable:

- What is the upgrade mechanism?
- Who holds upgrade rights?
- What prevents malicious upgrades?
- How is the upgrade event logged / audited?

If immutable:
- How are bugs handled?
- What is the migration path?

If using ERC-4337:
- How are user operations validated?
- Who pays gas (paymaster)?
- What is the bundler strategy?

If using EIP-7702:
- How are delegated authorities scoped?
- What happens if the delegated contract is malicious?

**Completion criterion:** upgrade mechanism and governance fully described.

### 5. Adversarial review

Write the contract from an attacker's perspective:

- What is the most damaging sequence of calls?
- What happens at extreme inputs (zero, max, empty state)?
- What happens if the owner key is lost / stolen?
- What happens if an external dependency fails?
- Can a malicious bundler or paymaster exploit the AA flow?

Document each attack path; state whether it is mitigated, unmitigated, or out of scope.

**Completion criterion:** at least one adversarial scenario documented with impact and mitigation status.

### 6. Deliver

Markdown artifact: requirements, security review, gas audit, upgrade/governance/AA, adversarial scenarios, and a **deployment recommendation** — deploy, deploy with fixes listed, or do not deploy.

**Completion criterion:** artifact present; deployment recommendation is explicit.

## Rules

- Rule: never deploy without an adversarial review.
- Rule: separate security findings from gas optimisations.
- Rule: state trust assumptions for every external call.
- Rule: document upgrade, AA, and delegation mechanisms explicitly.
- Rule: prefer minimal, audited libraries (Solmate, OpenZeppelin) over custom implementations.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml