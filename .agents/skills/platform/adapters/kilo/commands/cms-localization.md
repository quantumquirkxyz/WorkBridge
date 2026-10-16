---
description: "Design internationalization (i18n) and localization (l10n) — string management, locale handling, RTL support, cultural adaptation — so the product works across languages and regions."
---
# localization

When to use: Design internationalization (i18n) and localization (l10n) — string management, locale handling, RTL support, cultural adaptation — so the product works across languages and regions.

## Workflow

1. **Audit user-facing strings** — extract from code, templates, DB
2. **Choose a framework** — ICU MessageFormat, gettext, Fluent
3. **Define locale hierarchy** — en → en-GB → en-AU
4. **Handle formatting** — dates (Intl.DateTimeFormat), numbers, currencies
5. **Adapt UI** — text expansion (±30%), RTL layout, icons
6. **Integrate translations** — TMS integration, glossary, placeholders
7. **Test** — pseudolocalization, native speaker review

## Deliverables

- cms artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Design internationalization (i18n) and localization (l10n) complete; artifact saved; completion criteria checked.
