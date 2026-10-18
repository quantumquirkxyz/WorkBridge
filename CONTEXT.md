# Context

This repository (`Agent-Hackathon`) uses the repository-local quirk Skills bundle
installed under `.agents/skills/`. Durability rules and vocabulary for the workflow
itself live in `docs/explanation/quirk-method.md`; this file records the *project's own*
domain vocabulary and boundaries only.

## Repository role

- **Agent-Hackathon** is the working repository for an agent-focused build.
- It follows the quirk method: clarify before building, preserve context, split work into
  claimable slices, review on separate Standards and Spec axes, and ship only on clean evidence.
- The canonical skills are `.agents/skills/`; `.claude/skills/` is a symlink compatibility view.
- Durable design decisions are recorded as ADRs under `.agents/adr/`.

## Project brief

**Puente Laboral Panamá** is a multi-agent employability system for young people. It evaluates
readiness for a specific job, recognizes formal and informal experience, verifies credentials,
identifies skill gaps, recommends a constrained learning or internship roadmap, and prepares a
job application for human approval.

The first demonstrable scope is junior technical support, customer service, and administrative
roles across Panama Metro and Panama Oeste.

## Project vocabulary

| Term | Meaning |
|---|---|
| Apt | Meets mandatory job requirements and practical constraints. |
| Apt with gaps | Can progress, but has actionable skill, credential, experience, or preparation gaps. |
| Not currently apt | Fails a hard constraint such as an unverified mandatory credential, incompatible schedule, or infeasible commute. |
| Evidence | A declared, extracted, verified, or inferred fact supporting a profile or requirement. |
| Informal experience | Experience from family businesses, volunteering, projects, academic work, or unregistered work. |
| Roadmap | Ranked actions such as courses, certifications, projects, or internships that address a gap. |
| Adapted application | A CV, cover letter, and application answers tailored to one vacancy without inventing facts. |
| Workflow graph | Explicit states, agent transitions, tools, fallbacks, and human approval points. |
| Ground truth | A known expected verification result used to measure classifier errors. |

The vocabulary and decisions are documented in English; user-facing interaction may remain in Spanish.

## Boundaries

- Domain terms from other repositories must not appear here.
- New terminology is added only through `grill-with-docs` / `domain-modeling`, each recorded
  as an ADR when the decision is hard to reverse.
- The current project brief is refined but the technical contract for the Certo integration
  remains unresolved; use an adapter and deterministic mock until confirmed.
- Stack, tracker, and validation commands are recorded below once confirmed.

## Stack (confirmed)

| Concern | Value |
|---|---|
| Language / runtime | _to confirm during implementation planning_ |
| Package manager | _to confirm during implementation planning_ |
| Issue tracker | GitHub Issues in `quantumquirkxyz/Agent-Hackathon` |
| Docs surface | `docs/reference/agents/`, `docs/how-to/`, `docs/explanation/` |
| ADRs | `.agents/adr/` |

## Maintenance rule

Keep this file limited to this repository's domain. Skills should reference it and avoid
vocabulary from unrelated repositories.
