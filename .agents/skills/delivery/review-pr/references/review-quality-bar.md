# Review Quality Bar

Quality criteria for PR review findings. Every finding must satisfy these before it is published.

## Finding requirements

- Prefer the smallest exact file or hunk that proves the failure.
- Include exact file and line or hunk where the problem appears.
- Cite the repo rule, spec line, or smell name that justifies the finding.
- Explain what breaks, regresses, or becomes ambiguous.
- If operating on a GitHub PR, publish an inline comment pointing the author directly to the error.

## Standards findings

- If a standards finding is only a smell, say so explicitly (judgement call).
- If it breaches a documented repo standard, treat it as a hard violation.
- Skip anything tooling already enforces (linters, formatters).

## Spec findings

- If a spec finding is really a missing requirement from the spec source, say that instead of upgrading it into a bug.
- Quote the spec line for each requirement.
- Distinguish missing, partial, scope-creep, and implemented-incorrectly findings.

## PR-level checks

- If a PR is already obviously broken by compile or test failure, name the failing command or observable symptom first.
- If the branch already has unresolved review history, check that history before duplicating an existing concern with new wording.
- If there are no findings, publish the clean review state clearly so the PR author can see the branch was inspected.
