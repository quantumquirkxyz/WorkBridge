# Context

This repository (`equipo-02`) uses the repository-local quirk Skills bundle
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
readiness for a job, recognizes formal and informal experience, identifies skill gaps, recommends
training or internships, and prepares applications for human approval.

## Project vocabulary

| Term | Meaning |
|---|---|
| Apt | Meets mandatory requirements and practical constraints. |
| Apt with gaps | Can progress after addressing identified gaps. |
| Not currently apt | Fails a hard constraint at the current time. |
| Evidence | A declared, extracted, verified, or inferred fact supporting a claim. |
| Informal experience | Experience from family businesses, volunteering, projects, academic work, or unregistered work. |
| Roadmap | Ranked actions that address a candidate's gaps. |
| Workflow graph | Explicit states, agent transitions, tools, fallbacks, and human approval points. |
| Ground truth | Known expected result used to measure verification errors. |

## Boundaries

- Domain terms from other repositories must not appear here.
- New terminology is added only through `grill-with-docs` / `domain-modeling`, each recorded
  as an ADR when the decision is hard to reverse.
- Stack, tracker, and validation commands are recorded below once confirmed.

## Stack (confirmed)

| Concern | Value |
|---|---|
| Language / runtime | _to confirm with project brief_ |
| Package manager | _to confirm_ |
| Issue tracker | GitHub Issues in `HackathonFISC/equipo-02` |
| Docs surface | `docs/reference/agents/`, `docs/how-to/`, `docs/explanation/` |
| ADRs | `.agents/adr/` |

## Maintenance rule

Keep this file limited to this repository's domain. Skills should reference it and avoid
vocabulary from unrelated repositories.
