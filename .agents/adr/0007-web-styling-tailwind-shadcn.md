# ADR-0007: Style `apps/web` with Tailwind CSS v4 and shadcn/ui

## Status

Proposed — 2026-10-16. Review after the first three redesigned screens ship.

## Context

`apps/web` uses one hand-written `globals.css` (182 lines, 12 custom properties). It has already
drifted: classes such as `.danger`, `.warning-panel`, and `.result` are referenced by components
but never defined, so "Eliminar mis datos" renders like a primary action. The redesign adds a
chat, sheets, dialogs, tabs, toasts, three role surfaces, light and dark themes, and a
mobile-first layout, on a hackathon timeline. Accessible primitives (focus management in dialogs
and sheets, keyboard support) are needed out of the box.

## Decision

- Use **Tailwind CSS v4** (CSS-first `@theme`, PostCSS plugin) with design tokens as CSS variables in
  `app/globals.css`, light under `:root` and dark under `.dark`.
- Use **shadcn/ui** (Radix primitives, code generated into `components/ui/`) for buttons, sheets,
  dialogs, tabs, progress, forms, and toasts; variants with **class-variance-authority**.
- Theme follows the system preference through `next-themes` (`attribute="class"`).
- Fonts through `next/font` (Plus Jakarta Sans); icons from `lucide-react`.
- Token values, contrast table, and component variants live in
  `docs/old/reference/frontend/design-system.md`; changes to tokens update that table in the same PR.

## Consequences

- Positive: accessible primitives (Radix) and a single token source; dark mode and responsive
  utilities without custom CSS; generated components stay editable in-repo (no runtime dependency
  lock-in).
- Negative: new dependencies (`tailwindcss`, `@tailwindcss/postcss`, Radix packages, `cva`,
  `tailwind-merge`, `next-themes`, `lucide-react`); long class lists in JSX.
- Migration: existing components keep working during the switch; `globals.css` is replaced by token
  definitions + Tailwind layers.

## Alternatives considered

- **Keep plain CSS / CSS Modules.** Rejected: drift already happened (CS-1), and every accessible
  primitive (dialog, sheet, tabs) would have to be built by hand.
- **MUI or Chakra UI.** Rejected: runtime CSS-in-JS cost, heavier theming to reach the brand, and
  weaker fit with React Server Components.
- **Mantine.** Viable, but its styling model diverges from the utility-first tokens chosen here
  and its components are not code-owned.

## Links

- Spec: `docs/old/reference/frontend/spec.md` (D2, G6)
- Design system: `docs/old/reference/frontend/design-system.md`
