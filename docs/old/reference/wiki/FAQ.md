# FAQ

> Frequently asked questions about **quirk Skills**, the quirk method, and the bundle ecosystem.

---

## 1. What is quirk Skills?

**quirk Skills** is a bundle of skills (specialized knowledge and workflows) designed to standardize software engineering through the **quirk method**. It is distributed as Markdown documentation and scripts that can be consumed by AI agents (Claude, Kilo, Codex, etc.) or by human teams that want to apply the same vocabulary and operational discipline.

---

## 2. How many skills are there?

The number varies with each version. You can check the updated inventory on the [Skills](Skills.md) page or review the skills-lock.json file in the repository root. Each skill has a dedicated folder under .agents/skills/ with its SKILL.md entry point.

---

## 3. What is the quirk method?

The **quirk method** is the workflow philosophy that governs how skills route work, preserve context, produce artifacts, review changes, repair findings, and publish. Its main pillars are:

- **Shared vocabulary**: normalized terms (seam, work-item, tracer bullet, provenance...).
- **Separation of responsibilities**: each skill does one thing and does it well.
- **Explicit quality**: Standards and Spec axes for reviews, automated validation, and quality gates.
- **Traceability**: artifacts, locks, and execution logs.

---

## 4. How do I install the bundle?

It depends on the case:

- **New repository (greenfield)**: use the greenfield prompt described in [Installation](../../how-to/installation.md).
- **Existing repository**: use the existing-repo prompt described in [Installation](../../how-to/installation.md).

Both flows copy the canonical files and configure the compatibility view (.claude/skills/) without erasing the project local context.

---

## 5. What is the difference between .agents/skills/ and .claude/skills/?

| Path | Role |
|---|---|
| .agents/skills/ | **Canonical source** of the bundle. Contains the real skill folders and skills-lock.json. |
| .claude/skills/ | **Compatibility view**: symlinks that expose canonical skills to tools expecting that structure. |

Edit only the canonical folder; the symlinks reflect its content automatically.

---

## 6. What is a canonical skill?

A **canonical skill** is a real and authorized skill within the bundle. It is recognized because:

- It has its own folder under .agents/skills/.
- It includes an SKILL.md file as entry point.
- It is registered in skills-lock.json with its hash.

A copy, a broken symlink, or a skill commented out in the lockfile is not considered canonical.

---

## 7. What is skills-lock.json?

skills-lock.json is the **bundle lockfile**. It records:

- The included skills.
- Their canonical paths.
- Content hashes to detect unauthorized modifications.

It is updated via the lockfile-maintenance skill and must be synchronized every time a SKILL.md changes.

---

## 8. What is CONTEXT.md and why is it important?

CONTEXT.md is the **local context document** of a project. It defines:

- Domain vocabulary.
- Project boundaries.
- Naming conventions.
- Maintenance rules.

Skills must consult it before acting and must not introduce vocabulary from other repositories. The **Maintenance Rule** requires this file to exist and be current.

---

## 9. How do I create a new skill?

Follow the guide described in [Writing-Skills](../../tutorial/writing-skills/Writing-Skills.md) and run the skill-template-generator skill to get a skeleton with:

- Folder structure.
- SKILL.md with mandatory sections.
- Side-effects and dependencies metadata.

Then iterate in the **Skill Lab** until passing the quality gate.

---

## 10. What is the standard flow for a feature?

The typical flow combines several skills:

1. **wayfinder / to-spec**: decomposes the problem into work-items.
2. **to-tickets**: converts the plan into traceable tickets (tracer bullets).
3. **implement**: develops the solution in a dedicated branch.
4. **review-pr**: reviews the PR against the Standards and Spec axes.
5. **plan-review-fixes** (if there are findings): defines the remediation plan.
6. **implement-review-fixes**: applies the fixes.
7. **ship-subissue / publish-open-pr**: publishes and closes the cycle.

See [Workflows](../../how-to/workflows.md) for variants by work type.

---

## 11. How do I review a PR?

Use the **review-pr** skill:

1. Provide the PR and the comparison fixed point (commit, branch, or tag).
2. The skill applies the **findings detection, not patches** protocol.
3. It separates findings into two axes:
   - **Standards**: conventions, architecture, security, naming...
   - **Spec**: deviations against the specification or ticket intent.

Results are published as comments on the PR.

---

## 12. What are the review axes (Standards vs Spec)?

| Axis | Question it answers |
|---|---|
| **Standards** | Does the code meet the project conventions, patterns, and general rules? |
| **Spec** | Does the code implement exactly what the ticket or specification demands? |

Minor corrections are not mixed with contract violations.

---

## 13. How do I fix review findings?

1. **plan-review-fixes**: reads the findings and posts a remediation plan as comments on the PR.
2. **implement-review-fixes**: applies the plan commit by commit, with validation evidence.
3. Repeat the **review-pr** cycle until obtaining a clean PR or an explicit blocker.

---

## 14. What is a tracer bullet ticket?

A **tracer bullet ticket** is a small, executable, and traceable work unit that:

- Declares its blocking edges explicitly.
- Is small enough to be claimed by a single agent or person.
- Allows end-to-end validation of the complete method flow.

They are the basis of the breakdown in **to-tickets**.

---

## 15. What is provenance?

**Provenance** is the record of the origin and redesign status of a skill, name, or flow. It includes:

- Original author and influence references.
- History of alias renames or retirements.
- Current status (experimental, canonical, deprecated).

It is used to avoid duplicates and to justify adoption decisions.

---

## 16. How do I validate the bundle?

Run the **skill-quality-gate** skill, which applies checks over:

- Skill schema.
- Lockfile and symlinks.
- Semantics and paths.
- Placeholder detection.
- Shared rules.
- Metadata and side-effects.

You can also use **skill-audit** for a broader diagnosis.

---

## 17. What is the quality score and how is it calculated?

The **quality score** is the score resulting from the validation gate. It is composed of:

- Percentage of skills with valid structure.
- Lockfile coverage and symlink parity.
- Absence of unresolved placeholders.
- Compliance with vocabulary rules.
- Correct declaration of side-effects and dependencies.

It is not a simple average: each category may have different weight depending on the evaluation purpose.

---

## 18. How does the NPX CLI work?

The NPX package exposes commands to:

- Install or synchronize the bundle in another repository.
- Execute individual skills from the command line.
- Manage local configurations and skill mappings.

See [Distribution](Distribution.md) for the complete list of commands and usage.

---

## 19. What is the MCP server?

The **MCP server** (Model Context Protocol) connects dynamic context (issues, PRs, traces, docs) to the quirk flow. It allows agents to access external sources safely through standardized tools and resources. It is configured in kilo.json or in the corresponding agent configuration file.

---

## 20. How do I synchronize the bundle to another repository?

Use the synchronization flow described in [Distribution](Distribution.md):

1. Identify the destination and mode (greenfield or existing-repo).
2. Execute the NPX CLI synchronization command.
3. Verify that .agents/skills/, skills-lock.json, and .claude/skills/ are consistent.
4. Adjust the destination CONTEXT.md to incorporate local vocabulary.

---

## 21. What are scenario and behavioral fixtures?

They are test artifacts for skills:

- **Scenario fixtures**: deterministic scenarios covering happy paths, errors, and edge cases.
- **Behavioral fixtures**: behavior tests that validate contracts, side-effects, and rejection boundaries.

They are used in the **Skill Lab** and before promoting a skill to canonical.

---

## 22. What is the Skill Lab?

The **Skill Lab** is the experimentation environment for skills. Here you can:

- Test prompt and contract variants.
- Execute scenario and behavior fixtures.
- Evaluate performance and side-effects before promotion.

It is an isolated sandbox that does not affect the canonical bundle.

---

## 23. How do I promote a skill from sandbox to canonical?

Follow the **skill-promoter** flow:

1. Validate the skill with **skill-testing-framework**.
2. Run **skill-quality-gate**.
3. Copy the validated skill to .agents/skills/.
4. Update skills-lock.json with the new entry and hash.
5. Regenerate .claude/skills/ symlinks.
6. Document provenance and status.

---

## 24. What is a context pack?

A **context pack** is a minimal, ordered set of reads with provenance for a high-signal handoff. It is generated by **context-pack** and includes:

- Relevant documents in reading order.
- Linked issues and PRs.
- Provenance and ownership notes.

It serves to start a session or transfer work between agents without losing direction.

---

## 25. What is a seam in quirk terminology?

A **seam** is an explicit boundary between modules or responsibilities. In quirk it is designed so that:

- Coupling is minimal and visible.
- Call contracts are documented.
- Internal changes do not spill side effects outside the seam.

See [Architecture](Architecture.md) and the **codebase-design** skill.

---

## 26. How do I resolve merge conflicts?

Use the **resolving-merge-conflicts** skill when:

- There are conflicts in an in-progress merge or rebase.
- A PR fix branch is blocked.
- You need to reconcile changes with deliberate intent.

The skill applies a documented resolution protocol instead of blind patches.

---

## 27. What are trust tiers?

**Trust tiers** classify the trust level and risk of a skill or action:

- **Low**: read-only, no side effects.
- **Medium**: controlled writing (documentation, comments) with validation.
- **High**: sensitive mutations (issue closure, merge, deploy) requiring human approval.

They are evaluated in the **execution-policy** skill and declared in each skill metadata.

---

## 28. How do I contribute to the bundle?

1. Read [Writing-Skills](../../tutorial/writing-skills/Writing-Skills.md) and the CONTEXT.md conventions.
2. Develop your skill in the **Skill Lab**.
3. Run the quality gate and fix findings.
4. Open a PR with the skill, updated lockfile, and provenance documentation.
5. A reviewer applies **review-pr** before approval.

See also **contribution-workflow-optimizer** for automatic suggestions.

---

## 29. What is the maintenance rule for CONTEXT.md?

The **Maintenance Rule** requires that:

- CONTEXT.md exists at the repository root.
- It defines local vocabulary, project boundaries, and naming conventions.
- It is kept up to date.
- Skills consult it before acting and do not introduce vocabulary from external repositories.

---

## 30. Where do I find the changelog?

The bundle **changelog** is located in the CHANGELOG.md file at the repository root or on the project **Releases** page. It documents versions, added or deprecated skills, vocabulary changes, and security fixes.
