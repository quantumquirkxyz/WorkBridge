---
name: "data-catalog"
category: "data"
maturity: "stable"
version: "1"
description: "Data catalog (metadata management, discovery, classification, data mesh, governance)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Catalog schema saved; discovery interface designed; governance policy defined."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "data"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/data-catalog.json"
diataxis: "how-to"
tags: ["data"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: data asset inventory, domain boundaries, governance requirements.
- Output: catalog schema + discovery design + governance policy.
- Scope: designs catalog; does not ingest metadata automatically.
- Rule: designs catalog; does not ingest metadata automatically.
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

Emit `DataCatalogArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/data-catalog/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Data Catalog

Design a **data catalog** — metadata management, discovery, classification, data mesh, and governance.

## Process

### 1. Inventory data assets
- Tables, files, streams, APIs, ML datasets, reports.
- Technical metadata: schema, format, location, owner, refresh frequency.
- Business metadata: description, glossary terms, domain, steward.

**Completion criterion:** asset inventory saved.

### 2. Design metadata model
- Core entities: dataset, column, domain, steward, classification, quality score.
- Attributes: name, description, type, format, size, row count, owner, tags.
- Relationships: dataset → columns, dataset → domain, dataset → lineage.

**Completion criterion:** metadata model saved.

### 3. Discovery and search
- Full-text search across names, descriptions, tags.
- Faceted filtering: domain, format, owner, classification, freshness.
- Recommendations: related datasets, popular queries, usage analytics.

**Completion criterion:** discovery interface design saved.

### 4. Classification and tagging
- Sensitivity levels: public, internal, confidential, restricted.
- PII detection: automatic tagging with manual review.
- Domain tags: business unit, product line, data mesh domain.

**Completion criterion:** classification policy saved.

### 5. Data mesh alignment
- Domain-oriented ownership: each domain owns its catalog entries.
- Self-serve infrastructure: discoverable APIs, schemas, samples.
- Federated governance: global policies with local execution.

**Completion criterion:** mesh ownership model saved.

### 6. Governance integration
- Access requests and approval workflows.
- Data quality scores and SLA tracking.
- Audit logs for catalog changes.

**Completion criterion:** governance workflow design saved.

## Rules

- Rule: define one owner per dataset and one steward per domain.
- Rule: classify sensitivity at ingestion time and enforce access boundaries from the catalog.
- Rule: separate technical metadata from business metadata so each can evolve independently.
- Rule: require approval workflows for restricted data and sensitive PII.
- Rule: make catalog entries deletable only with audit trail and steward consent.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml