---
name: "math-cryptography"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Analyse cryptographic constructions — symmetric, asymmetric, hashing, MACs, zero-knowledge — with security reductions, hardness assumptions, and attack analysis."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Analyse cryptographic constructions complete; required sections present; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "math"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-cryptography.json"
diataxis: "how-to"
tags: ["math"]
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

Emit `MathCryptographyArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-cryptography/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Cryptographic Analysis

Analyse or design a **cryptographic construction** with explicit hardness assumptions, security reductions, and attack analysis.

## When to use

- The user wants a cryptographic protocol reviewed or designed.
- A security-critical component needs formal analysis.
- Key exchange, signatures, MACs, encryption, or ZK proofs are involved.

## Process

1. Identify the primitive type — symmetric encryption (block ciphers, stream ciphers), asymmetric (RSA, ECC, lattice-based), hash (collision-resistant, preimage), MAC / HMAC, signatures, key exchange, ZK proofs.
2. State hardness assumptions — DLP, CDH, DDH, RSA,factoring, LWE, SIS; quantify security level in bits.
3. Security goal — IND-CPA, IND-CCA, EUF-CMA, collision resistance, etc.
4. Attack analysis — birthday (hash), meet-in-the-middle, side-channel, replay, forward secrecy, oracle attacks.
5. Protocol design — if designing: use a well-known construction; do not invent primitives. Specify parties, messages, randomness sources, and secrets.
6. Deliver — artifact: primitive, hardness assumption, security goal, attack surface, and a security verdict (strong / moderate / weak / broken).

## Rules

- Rule: prefer standard, reviewed constructions over invented primitives.
- Rule: state security goals and attacker capabilities before evaluating a scheme.
- Rule: name hardness assumptions and estimated security level.
- Rule: include randomness, key management, side-channel, and replay considerations.
- Rule: mark any informal proof or missing reduction as a limitation.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml