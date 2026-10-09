# Review Axes

A code review evaluates a diff along two deliberately separate axes.

## Standards

Does the code conform to this repo's documented coding standards?

- Looks for violations of documented repo standards (`CODING_STANDARDS.md`, `CONTRIBUTING.md`, etc.).
- Carries the **smell baseline** (Fowler, *Refactoring*, ch.3) as a fixed fallback when the repo documents nothing.
- Documented repo standards override the smell baseline.
- Baseline smells are always judgement calls; documented-standard breaches can be hard violations.

## Spec

Does the code faithfully implement the originating issue / PRD / spec?

- Checks requirements the spec asked for that are missing or partial.
- Flags behaviour in the diff that wasn't asked for (scope creep).
- Identifies requirements that look implemented but where the implementation looks wrong.

## Why separate them

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.
