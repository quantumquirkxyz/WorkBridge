---
name: "api-contracts"
category: "integrations"
maturity: "stable"
version: "2"
description: "Define the request and response contracts, versioning rules, compatibility boundaries, OpenAPI/JSON Schema, and breaking change detection for APIs — with explicit consumer obligations."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "API contracts defined; versioning strategy explicit; breaking change policy and migration path named."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/api-contracts.json"
diataxis: "how-to"
tags: ["integrations"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: API contract brief, consumer context, compatibility constraints, and versioning goals.
- Output: contract design covering endpoints, schemas, versioning, breaking change policy, and consumer obligations.
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

Emit `ApiContractsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/api-contracts/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# API Contracts

Use this skill when the request and response surfaces need to be pinned down precisely. It should define what callers send, what they receive, how the contract can evolve, and what consumers must do to stay compatible.


## Process

### 1. Identify the consumer jobs

- **Primary consumers:** internal services, external partners, public API, mobile/web clients.
- **Consumer constraints:** latency tolerance, payload size, auth method, rate limits.
- **Non-consumers:** what the API should not expose; internal-only fields.

**Completion criterion:** consumer jobs and constraints named.

### 2. Define request and response shapes

- **Request:** method, path, query params, headers, body schema; required vs optional fields.
- **Response:** status codes, body schema, headers, error envelope; consistent error format.
- **Pagination:** cursor-based vs offset; page size, max page size, continuation tokens.
- **Filtering and sorting:** query parameters, filter syntax, sort order, default sort.

**Completion criterion:** request and response schemas named.

### 3. Choose the contract format

- **OpenAPI 3.1:** REST APIs; JSON Schema for data shapes; reusable components.
- **JSON Schema:** standalone schema validation; independent of transport.
- **GraphQL SDL:** schema-first design; type system, queries, mutations, subscriptions.
- **gRPC protobuf:** strongly typed contracts; streaming; code generation.

**Completion criterion:** contract format chosen with rationale.

### 4. Design versioning strategy

- **URL versioning:** `/v1/`, `/v2/`; explicit but proliferates endpoints.
- **Header versioning:** `API-Version` header; single endpoint, multiple versions.
- **Content negotiation:** `Accept` header; media type versioning; flexible but complex.
- **Deprecation policy:** sunset headers, deprecation timeline, migration guides.

**Completion criterion:** versioning strategy named with deprecation policy.

### 5. Define compatibility boundaries

- **Backward compatibility:** new fields optional; old fields not removed without notice.
- **Forward compatibility:** consumers ignore unknown fields; extensibility by design.
- **Breaking changes:** removing fields, renaming, type changes, required fields added; breaking change policy.
- **Safe changes:** adding optional fields, adding endpoints, deprecating without removing.

**Completion criterion:** compatibility rules and breaking change policy named.

### 6. Plan error handling and retries

- **Error envelope:** consistent structure (code, message, details, trace ID).
- **Status codes:** 2xx success, 4xx client error, 5xx server error; specific codes for common failures.
- **Retry guidance:** safe-to-retry methods (GET, PUT, DELETE), unsafe (POST without idempotency).
- **Rate limiting:** `429 Too Many Requests`, `Retry-After` header, rate limit headers.

**Completion criterion:** error and retry conventions named.

### 7. Security and auth in contracts

- **Authentication:** API key, Bearer token, OAuth2, mTLS; where credentials go.
- **Authorization:** scopes, roles, permissions; what each role can access.
- **Input validation:** required fields, formats, ranges, enums; validation error messages.

**Completion criterion:** auth and validation requirements explicit.

### 8. Documentation and discoverability

- **OpenAPI docs:** interactive docs (Swagger UI, Redoc); try-it-out functionality.
- **Changelog:** versioned changelog per API version; migration guides.
- **SDKs and examples:** client libraries, code snippets, Postman collections.

**Completion criterion:** documentation plan named.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml