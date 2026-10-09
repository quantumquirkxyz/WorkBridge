# Edge Cases

Use this guide when the repository deviates from the standard shape assumed by the main workflow.

## Missing CONTEXT.md

**Detection:** `CONTEXT.md` does not exist at repo root or is empty (< 100 characters).

**Action:**
- Set assessment confidence to `Low`.
- For viability: assign `Conditional` with blocker "CONTEXT.md missing — goals cannot be verified against code." Do not assign `Not viable` solely for this reason.
- For functionality: assign `Partial` with blocker "Documented behavior cannot be cross-referenced."
- For scalability: proceed with code-only analysis but note that domain intent is unverified.
- In the report's Pre-flight Summary, record: `CONTEXT.md: missing — viability and functionality assessed with reduced confidence.`

**User prompt:** After the report, ask the user whether to create a `CONTEXT.md` before proceeding.

## Empty or Missing docs/adr/

**Detection:** `docs/adr/` directory does not exist, or contains zero `.md` files, or all files are stubs (< 200 characters).

**Action:**
- Set assessment confidence to `Low` for all dimensions that rely on ADR evidence.
- In the Evidence sections, note "ADR coverage insufficient" for findings that would normally cite an ADR.
- Do not downgrade ratings solely for missing ADRs unless the missing ADR is about a core architectural decision evident in the code.

**User prompt:** After the report, offer to run `/docs-management` to recover or create ADRs.

## Monorepos

**Detection:** Repository contains multiple top-level project directories (e.g., `packages/`, `services/`, `apps/`) with independent `CONTEXT.md` or `package.json` files.

**Action:**
- Ask the user which sub-project to assess, OR
- Assess each sub-project independently and produce one report per sub-project, OR
- Assess the repo as a whole only if there is a root `CONTEXT.md` describing the monorepo strategy.

**Rule:** Do not mix findings from different sub-projects in the same dimension. Label each finding with its sub-project path.

## Legacy Projects Without Tests

**Detection:** No test directories or CI configuration found; code predates 2015; no modern framework markers.

**Action:**
- For functionality: behavior verification relies on code reading, not test evidence. Mark all functionality findings as `Confidence: Low` unless a production behavior can be traced through actual code paths.
- Do not assign `Broken` unless a clear contradiction between `CONTEXT.md`/ADR and production code is found.

**User prompt:** After the report, suggest `/testing` to establish a baseline before further investment.

## Configuration-Only Repos

**Detection:** Repository contains only configuration files, schemas, Terraform, Docker Compose, or IaC with no application code.

**Action:**
- Project shape: classify as `configuration` or `infrastructure`.
- Viability: assess whether the configuration achieves the stated infrastructure goals.
- Functionality: assess whether the configuration matches the intended deployment topology.
- Scalability: assess whether the configuration supports scaling (e.g., autoscaling groups, multi-region).
- Do not apply application-code criteria (e.g., module depth) to configuration files.

## No ADRs but Rich Git History

**Detection:** No `docs/adr/` but git log shows structured commit messages referencing decisions.

**Action:**
- Use commit messages as lightweight decision records. Cite commits as `git log: <commit-hash> — <message>`.
- Confidence remains `Medium` at best; ADRs are still preferred.

## Single-File Projects

**Detection:** Repository contains fewer than 5 source files, or is a single script.

**Action:**
- Proceed with the standard workflow but note that "module boundaries" do not apply.
- Scalability assessment focuses on whether the single file can be decomposed without breaking behavior.

## Assessment Fatigue / Re-runs

**Detection:** A viability report already exists in `.reports/` from a recent date.

**Action:**
- Read the existing report.
- In the new report's Validation Notes, reference the previous report and note what changed.
- Focus the new assessment on delta (what changed since last assessment) plus any previously unresolved gaps.

## Dependency Health: Vulnerable Dependencies

**Detection:** Automated baseline finds one or more dependencies with known security advisories.

**Action:**
- Assign `High` risk to all findings affected by the vulnerable dependency.
- In the report's priority matrix, mark the remediation as P0.
- For functionality: assign at most `Partial` unless the vulnerable code path is confirmed unused.
- Do not assign `Complete` if any production path exercises the vulnerable dependency.

**User prompt:** After the report, suggest running `/sec-security-audit` or standard dependency update workflow before further investment.

## Dependency Health: Orphaned or Abandoned Dependencies

**Detection:** Automated baseline finds one or more dependencies with no maintainer activity for >24 months.

**Action:**
- Assign `Medium` risk unless the orphaned dependency is on a critical path.
- For viability: note that long-term maintenance is constrained by orphaned deps.
- For scalability: orphaned deps are a bounded factor unless a replacement path is unclear.

**User prompt:** After the report, suggest identifying replacement dependencies and creating an ADR.

## Dependency Health: Unpinned or Floating Versions

**Detection:** Dependency manifest uses floating versions (e.g., `^1.0.0`, `>=2.0`, `latest`).

**Action:**
- Assign `Medium` risk for all dimensions.
- For functionality: floating versions can introduce surprise behavior; downgrade confidence to `Medium`.
- For scalability: floating versions are a bounded factor; every release is a potential breaking change.

**User prompt:** After the report, suggest pinning versions and documenting the policy in an ADR.

## Baseline Cannot Be Run

**Detection:** Repository uses an unknown or unsupported dependency manifest format, or automated baseline tools are unavailable.

**Action:**
- Proceed with the standard workflow but note that automated baseline signals are missing.
- Downgrade assessment confidence to `Medium` for dimensions that rely on baseline signals.
- In the report's Pre-flight Summary, record: `Automated baseline: unavailable — assessment confidence reduced.`

**User prompt:** After the report, ask whether to manually inspect dependency health or skip for this assessment.
