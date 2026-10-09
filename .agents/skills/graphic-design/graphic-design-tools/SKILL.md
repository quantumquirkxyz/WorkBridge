---
name: "graphic-design-tools"
category: "graphic-design"
maturity: "experimental"
version: "1"
description: "Connect graphic design tools — Figma, Adobe Creative Cloud, Canva, and local production tools — to agent workflows with explicit authentication, scopes, and safety boundaries."
capabilities: ""
outputs: ""
sideEffects: ""
dependencies: []
stopCondition: "Graphic design tools integration plan complete; tool selection, authentication, use cases, and safety boundaries explicit."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/graphic-design-tools.json"
diataxis: "how-to"
tags: ["graphic-design"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: tool inventory, team workflow, security constraints, and integration goals.
- Output: graphic design tools artifact covering tool selection, authentication, use-case mapping, data flow, and safety boundaries.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

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

Emit `GraphicDesignToolsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/graphic-design-tools/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Graphic Design Tools

Use this skill when the workflow needs to connect graphic design tools to agent or team automation. It should evaluate Figma, Adobe Creative Cloud, Canva, and local production tools against the team workflow, then define explicit authentication, scopes, data flow, and safety boundaries before any integration is built.


## Steps

### 1. Inventory the tool landscape

- List current tools: Figma, Adobe CC (Photoshop, Illustrator, InDesign, XD), Canva, Sketch, Affinity, Penpot, or local tools.
- Identify how each tool is currently used: design, review, handoff, production, asset management.
- Identify pain points and automation opportunities.

**Completion criterion:** tool inventory and current workflow summary saved.

### 2. Evaluate integration options per tool

For each tool, document:
- **Figma:** plugin API, REST API, MCP server, variables, components, auto layout, design tokens.
- **Adobe CC:** UXP automation, Adobe I/O, REST APIs per app, Firefly generative APIs.
- **Canva:** Canva Button, API, MCP server, brand kit, design automation.
- **Local tools:** CLI automation, file watching, export pipelines, batch processing.
- **Open alternatives:** Penpot (open-source Figma alternative), GIMP, Inkscape, Scribus.

**Completion criterion:** integration options per tool documented with scope and limitations.

### 3. Define authentication and access policy

- Choose authentication method per tool: OAuth, service account, API key, personal access token.
- Define minimum scopes required for each use case.
- Document credential storage, rotation, and audit requirements.
- Define who can approve new integrations and revoke access.

**Completion criterion:** authentication design and access policy saved.

### 4. Map use cases and data flow

- For each use case: describe input, processing, output, and owner.
- Examples: design-to-code handoff, asset export, brand token sync, batch image processing, design review automation.
- Define data residency and retention rules for design files and exported assets.
- Define rate limits, retry behavior, and backoff strategy.

**Completion criterion:** use-case map and data flow diagram saved.

### 5. Design safety boundaries

- Define what the integration must never do: overwrite production files without approval, delete source files, publish without review.
- Define approval gates: human review required for publishing, brand-critical changes, and external sharing.
- Define audit logging: what is logged, where, and for how long.
- Define incident response: what happens on quota exhaustion, API change, or unauthorized access.

**Completion criterion:** safety boundaries and fallback behavior saved.

### 6. Specify implementation path

- Order integrations by value and risk: start with read-only, then supervised write, then autonomous write.
- Define validation steps for each integration.
- Define rollback procedure if an integration misbehaves.

**Completion criterion:** implementation path with validation and rollback saved.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml