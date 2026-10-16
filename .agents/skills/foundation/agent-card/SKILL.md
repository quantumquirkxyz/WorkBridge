---
name: agent-card
category: foundation
maturity: stable
version: 1
description: Generates and maintains Agent Cards for A2A (Agent-to-Agent) discovery.
license: MIT
capabilities:
  - generate-agent-card
  - validate-agent-card
  - emit-agent-card-json
  - update-agent-card-index
inputs:
  - "skill-path: relative path to the skill directory (e.g., .agents/skills/{category}/{skill})"
  - "skill-frontmatter: parsed frontmatter from SKILL.md"
outputs:
  - type: object
    description: AgentCard artifact for A2A discovery
    properties:
      agentCard:
        type: object
        description: JSON AgentCard conforming to agent-card-schema.json
        properties:
          name:
            type: string
          description:
            type: string
          url:
            type: string
          version:
            type: string
          capabilities:
            type: object
          authentication:
            type: object
          skills:
            type: array
      markdown:
        type: string
        description: Markdown representation of the Agent Card
      completionCriteriaMet:
        type: boolean
sideEffects:
  - write-files
dependencies: []
stopCondition: Agent Card JSON emitted to platform/agent-cards, index updated, and completion criteria checked.
risk: low
trustTier: 1
maxIterations: 6
modelTier: router
promptVersion: "2.0"
artifactType: plan
evaluators:
  - behavioral
  - regression
  - traceability
  - quality-bar
fixturesPath: .agents/skills/platform/fixtures/regression/agent-card.json
diataxis: how-to
tags: [agent-card, a2a, discovery, metadata]
compatibility: [mcp-server, a2a-router, skill-audit, skill-dependency-graph]
approvalRequired: false
approvalFor: []
---

# Agent Card

## Why

Agent cards enable discovery by giving every agent a self-describing, machine-readable identity document. Without a standard card format, a consumer agent would need custom parsing logic for each provider, and providers would need to publish bespoke documentation for every consumer. A2A Agent Cards solve this by declaring capabilities, authentication requirements, and endpoints in a single schema that any compliant runtime can index, filter, and trust. This makes the agent ecosystem composable: an agent can be discovered by capability, validated by schema, and invoked by URL without prior bilateral agreement.

## Contract

- **Input:** skill directory path and its frontmatter.
- **Output:** an AgentCard JSON, Markdown card, and updated index.
- **Scope:** read-only extraction from existing skill metadata; no skill content modification.
- **Rule:** validate the generated card against `agent-card-schema.json` before writing.
- **Rule:** keep the card idempotent — identical input produces identical output.
- **Rule:** do not invent capability flags not grounded in frontmatter.
- Rule: validate against the corresponding JSON schema before emitting the artifact.

## A2A Runtime

Agent Cards emitted by this skill are consumable by the A2A runtime at runtime:

- **a2a-router.mjs**: `.agents/skills/platform/a2a-router.mjs` reads Agent Cards from `.agents/skills/platform/agent-cards/` and routes requests to the appropriate skill tool. Supports `list`, `discover <capability>`, and `invoke <agentCardName>` commands.
- **mcp-server**: `.agents/skills/platform/mcp-server/server.mjs` exposes `a2a/discover` and `a2a/invoke` endpoints that filter Agent Cards by capability and return skill tool definitions in A2A-compatible format.

## Card signing and verification

Cards inside this repository are unsigned: the repository is the trust boundary, and the checker validates card bodies against the schema and the lockfile. Signing is strictly opt-in and applies when a card leaves that boundary - publishing to a live endpoint at `/.well-known/agent-card.json` (the A2A spec's well-known location, a2a-protocol.org), shipping a card to another team, or attaching one to a release artifact.

The A2A spec defines an `AgentCardSignature`: a JSON Web Signature (RFC 7515) computed over a canonicalized form of the card using the JSON Canonicalization Scheme (RFC 8785), with the signature field excluded from canonicalization. The implementation follows that rule with Ed25519 from `node:crypto`: it canonicalizes the card minus `metadata.signature` (recursive key sort, no insignificant whitespace), signs the UTF-8 bytes, and embeds the base64url signature in the card.

```bash
# sign the corpus regenerated from current frontmatter
node .agents/skills/platform/scripts/generate-agent-cards.mjs --sign --key <privateKeyPath> [--key-id <id>] [--out <dir>]

# verify every card in a directory (or one file) against the public key
node .agents/skills/platform/scripts/generate-agent-cards.mjs --verify --key <publicKeyPath> [--card <file|dir>]
```

- Rule: sign freshly generated cards, never a hand-edited corpus. Re-run generation, then sign; a card edited after signing fails verification, and a card that fails verification is worse than an unsigned card because it claims authenticity it does not have.
- Rule: signing adds only `metadata.signature`; the card body stays byte-identical to the unsigned generation, so a signed card can always be diffed against a fresh unsigned regeneration to confirm nothing else changed.
- Rule: trust the payload, not the provenance story. A signature is meaningful only together with the body it covers, so a consumer re-canonicalizes the card without the signature field and verifies against a public key it already trusts. A card that arrives with a plausible source name and no verifiable signature is an unverified card.
- Rule: unsigned public cards advertise only what any caller may invoke. The spec keeps auth-gated skills behind `GetExtendedAgentCard`, which returns the extended card to an authenticated caller only (v1.0 moved the flag to `capabilities.extendedAgentCard`). A capability that needs a token, a scope, or a session is never advertised in a card meant for anonymous discovery.
- Rule: keep keys out of the repository. `--gen-key` writes a keypair only to explicit paths; private keys never enter version control, and a verification failure (exit 1, per-card pass/fail report) is treated as a discovery incident, not a warning.

## Provenance

| Quality-Bar Question | Evidence |
|---|---|
| **Intent** | Generates and maintains Agent Cards for A2A (Agent-to-Agent) discovery. |
| **Input** | skill directory path and its frontmatter. |
| **Output** | an AgentCard JSON, Markdown card, and updated index. |
| **Side effects** | write-files (JSON card, Markdown summary, index update). |
| **Boundaries** | read-only extraction from existing skill metadata; no skill content modification. |
| **Completion criteria** | Agent Card JSON emitted; schema-validated; index updated; completion criteria checked. |

## Artifact

This skill emits a structured AgentCard JSON and a Markdown card. Observability: each emitted card must include a `traceId` and `generatedAt` timestamp so that card regeneration can be correlated with skill frontmatter changes. The Markdown summary must include a `validationStatus` field indicating whether the card passed schema validation.

The JSON is the machine-readable A2A discovery record; the Markdown is the human-readable card summary. Both are emitted together so the index and skill registry stay consistent.

## Process

1. Read skill frontmatter from `.agents/skills/{category}/{skill}/SKILL.md`.
2. Validate the extracted metadata against `agent-card-schema.json`.
3. Emit AgentCard JSON to `.agents/skills/platform/agent-cards/{category}-{skill}.json`.
4. Update `index.json` in the same directory.
5. When the card leaves the repository, regenerate and sign the corpus with `--sign`, and record the key id alongside the release notes.
6. Before consuming an external card, verify it with `--verify` against a pre-trusted public key, and refuse any card whose body does not verify.

## Completion criteria

- the AgentCard JSON is written and schema-valid
- the Markdown card is emitted
- the index is updated with the new card
- completion criteria are explicitly checked

@include .agents/skills/platform/contract-base.xml
