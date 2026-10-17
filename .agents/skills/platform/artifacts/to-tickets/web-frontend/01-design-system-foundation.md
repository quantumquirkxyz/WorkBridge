# Adopt Tailwind v4, shadcn/ui, and the design tokens in apps/web

**Issue:** #33

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = web; `phase` = build; `priority` = high; `risk` = medium; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Design system](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/design-system.md) · [ADR-0007](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/.agents/adr/0007-web-styling-tailwind-shadcn.md)

## Context
Prefactor slice: "make the change easy". Replace the hand-written `apps/web/app/globals.css` with Tailwind CSS v4 and shadcn/ui so every later slice builds on the same tokens and accessible primitives. The current page keeps working, restyled. Fixes CS-1: `.danger`, `.warning-panel`, and `.result` are referenced but undefined, so "Eliminar mis datos" renders as a primary button.

## Acceptance Criteria
- [ ] Tailwind CSS v4 (`@tailwindcss/postcss`) is configured for `apps/web`; `npm run build --workspace @puente/web` succeeds.
- [ ] shadcn/ui is initialised with components generated into `apps/web/components/ui/`: Button, Card, Badge, Progress, Sheet, Dialog, AlertDialog, Collapsible, ToggleGroup, Checkbox, Input, Textarea, Select, Label, Tabs, Skeleton, Sonner, DropdownMenu, Separator, ScrollArea.
- [ ] All primitive and semantic tokens from `design-system.md § Color` are defined as CSS variables in `app/globals.css` under `:root` (light) and `.dark` (dark) and mapped with `@theme inline`.
- [ ] The theme follows `prefers-color-scheme` through `next-themes` (`attribute="class"`, `defaultTheme="system"`) with no visible toggle (AC-43).
- [ ] Plus Jakarta Sans is loaded with `next/font/google` (400/500/600/700) and is the body font; `lucide-react` is installed.
- [ ] `Button` exposes the CVA variants `primary`, `secondary`, `ghost`, `outline`, `destructive`, `link` and sizes `sm` (36 px), `md` (44 px), `lg` (52 px).
- [ ] The existing `IntakeForm` and `ExplorationDashboard` render with the new primitives; "Eliminar mis datos" uses the `destructive` variant (CS-1).
- [ ] Every color pair used in this slice appears in the contrast table of `design-system.md` with a passing ratio (AC-45).

## Validation
Run `npm run verify` and `npm run build --workspace @puente/web`. Open `/` in light and dark system themes at 360 px and 1280 px; confirm no horizontal scroll and that "Eliminar mis datos" is visually destructive. Existing handler tests stay green.

## Blocked By
- None — can start immediately.

## Risks
Class-name churn in the two legacy components; they are decomposed in the next slice, so restyle them minimally.
