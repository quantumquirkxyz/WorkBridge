---
name: "search"
category: "integrations"
maturity: "stable"
version: "2"
description: "Design search behavior, indexing, relevance, and retrieval seams — with Elasticsearch, Algolia, Meilisearch, OpenSearch, synonyms, ranking, analytics, and autocomplete."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Search design complete; indexing and ranking strategy explicit; analytics plan named."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "integrations"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/search.json"
diataxis: "how-to"
tags: ["integrations"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: search brief, retrieval context, corpus characteristics, and relevance constraints.
- Output: search design covering architecture, indexing, ranking, synonyms, analytics, and observability.
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

Emit `SearchArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/search/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Search

Use this skill when the system needs retrieval that users can trust. It should define the retrieval seam, indexing shape, relevance controls, and observability so search stays understandable and adjustable.


## Process

### 1. Choose the search architecture

- **Full-text search:** Elasticsearch, OpenSearch, Meilisearch; inverted index, BM25 scoring.
- **Vector search:** Pinecone, Weaviate, Qdrant, Milvus; embedding-based similarity search.
- **Hybrid search:** combined full-text + vector; reciprocal rank fusion (RRF) or weighted scoring.
- **Managed SaaS:** Algolia, Typesense Cloud; hosted search with built-in relevance tuning.

**Completion criterion:** architecture named with rationale.

### 2. Design the indexing strategy

- **Document model:** what fields are searchable, filterable, sortable, facetable?
- **Language analysis:** tokenizers, analyzers, stemming, stop words, n-grams.
- **Synonyms:** explicit, one-way, multi-way; domain-specific synonym management.
- **Index lifecycle:** rollover, shrink, force merge, snapshot/restore; index templates.

**Completion criterion:** indexing strategy and field mapping named.

### 3. Define ranking and relevance

- **Text relevance:** BM25, TF-IDF, field-length normalization; query-time boosting.
- **Business ranking:** popularity, recency, personalization, business rules; function score queries.
- **Personalization:** user history, click-through data, collaborative filtering.
- **Context-aware:** location, device, time, user segment; dynamic boosting.

**Completion criterion:** ranking strategy and boosting rules named.

### 4. Design query features

- **Autocomplete:** prefix matching, edge n-grams, completion suggester; debounce and minChars.
- **Faceted search:** aggregations, filters, ranges; facet ordering and exclusion filters.
- **Typo tolerance:** fuzzy matching, edit distance, phonetic matching; per-field tolerance.
- **Highlighting:** search term highlighting, snippets; boundary scanners and fragment size.
- **Pagination:** offset vs search-after; deep pagination trade-offs; cursor-based pagination.

**Completion criterion:** query features and pagination strategy named.

### 5. Plan synonyms and language

- **Synonym management:** synonym graphs, word dictionaries, context-aware synonyms.
- **Multi-language:** per-language analyzers, language detection, per-field language boosting.
- **Stop words:** common word removal, protected words, per-language stop word lists.

**Completion criterion:** synonym and language strategy named.

### 6. Observability and analytics

- **Search analytics:** popular queries, zero-result queries, click-through rate, conversion rate.
- **Relevance metrics:** NDCG, MAP, MRR; offline evaluation with labeled queries.
- **A/B testing:** ranking variants, relevance tuning, query rewriting experiments.
- **Monitoring:** query latency, error rate, index health, node saturation, queue depth.

**Completion criterion:** analytics and monitoring plan named.

### 7. Scalability and resilience

- **Scaling:** sharding, replicas, routing; load balancing across nodes.
- **Caching:** query cache, request cache, result cache; cache invalidation strategy.
- **Rate limiting:** query complexity limits, per-user quotas, burst protection.
- **Failover:** cluster awareness, cross-cluster replication, disaster recovery.

**Completion criterion:** scalability and resilience strategy named.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml