# Frontend design system

Puente Laboral Panamá uses Tailwind CSS v4 and shadcn/ui primitives. The system is warm,
mobile-first, and keeps semantic tokens in `apps/web/app/globals.css`.

## Color

### Primitives

| Token | Light | Dark | Use |
|---|---|---|---|
| `teal-brand` | `#0EA5A4` | `#2DD4BF` | Decorative fills and illustrations; never light-theme text or control boundaries |
| `teal-700` | `#0F766E` | `#2DD4BF` | Primary actions and links |
| `teal-tint` | `#D9F2F0` | `#12302E` | Selected and secondary surfaces |
| `coral` | `#FF6B5B` | `#FF8A7D` | Accent and milestone surfaces |
| `coral-tint` | `#FFE4DF` | `#3A1F1B` | Accent background |
| `coral-ink` | `#7A2E1F` | `#FFE4DF` | Text on accent background |
| `cream` | `#FFF8F0` | `#FFF8F0` | Light app background |
| `night` | `#0B1416` | `#0B1416` | Dark app background |
| `ink` | `#1A2B2E` | `#E6F1F0` | Body text |
| `ink-muted` | `#4B5F63` | `#9FB3B5` | Secondary text |
| `line` | `#E8E1D8` | `#1F3335` | Dividers and tracks |
| `line-strong` | `#6F8285` | `#7C9497` | Input and control borders |
| `success` | `#15803D` | `#4ADE80` | Verified and successful states |
| `warning` | `#B45309` | `#FBBF24` | Pending and review states |
| `danger` | `#B91C1C` | `#F87171` | Destructive and error states |

### Semantic tokens

| Token | Light | Dark |
|---|---|---|
| `--background` | `cream` | `night` |
| `--foreground` | `ink` | `ink` |
| `--card` / `--popover` | `#FFFFFF` | `#132224` |
| `--primary` | `teal-700` | `teal-brand` |
| `--primary-foreground` | `#FFFFFF` | `night` |
| `--secondary` | `teal-tint` | `teal-tint` |
| `--accent` | `coral` | `coral` |
| `--accent-foreground` | `ink` | `night` |
| `--muted-foreground` | `ink-muted` | `ink-muted` |
| `--border` | `line` | `line` |
| `--input` | `line-strong` | `line-strong` |
| `--ring` | `teal-700` | `teal-brand` |
| `--destructive` | `danger` | `danger` |

### Contrast table

Ratios use the WCAG 2.x relative-luminance formula. Text needs 4.5:1; large text and non-text
controls need 3:1. Every color pair used by the initial web styling slice is listed here.

| Pair | Ratio | Verdict |
|---|---:|---|
| White on `teal-brand` `#0EA5A4` | 3.03 | ✗ decorative only; never text |
| `teal-brand` on cream (non-text) | 2.87 | ✗ never a control boundary |
| White on `teal-700` (primary button) | 5.47 | ✓ |
| `teal-700` on cream (links) | 5.20 | ✓ |
| `teal-700` on `teal-tint` | 4.67 | ✓ |
| Ink on cream | 13.95 | ✓ |
| Ink on white card / popover | 14.70 | ✓ |
| Ink on line (neutral badge/muted surface) | 11.33 | ✓ |
| Ink-muted on cream / white card | 6.40 / 6.74 | ✓ |
| Ink on `teal-tint` | 12.53 | ✓ |
| White on coral | 2.80 | ✗ never white on coral |
| Ink on coral | 5.25 | ✓ |
| `coral-ink` on `coral-tint` | 7.78 | ✓ |
| `line-strong` on cream / white | 3.83 / 4.03 | ✓ non-text |
| `teal-700` progress fill vs line track | 4.22 | ✓ non-text |
| Warning / success / danger on cream | 4.77 / 4.76 / 6.14 | ✓ |
| White on danger (destructive button) | 6.47 | ✓ |
| Dark text on night / card | 16.17 / 14.20 | ✓ |
| Dark muted text on night / card | 8.52 / 7.48 | ✓ |
| Night on dark `teal-brand` primary | 10.02 | ✓ |
| Dark line-strong on card | 5.10 | ✓ non-text |
| Dark progress fill vs track | 7.13 | ✓ non-text |
| Dark warning / success / danger on night | 11.17 / 10.70 / 6.74 | ✓ |

## Typography and interaction

- Plus Jakarta Sans is loaded through `next/font/google` at weights 400, 500, 600, and 700.
- Base controls are at least 44 px tall; the Button sizes are `sm` 36 px, `md` 44 px, and `lg` 52 px.
- The layout is mobile-first with 16 px phone gutters and no viewport-level horizontal overflow.
- Theme selection follows the system preference through `next-themes` with `attribute="class"`,
  `defaultTheme="system"`, and no visible toggle.
- Status meaning is paired with text, not conveyed by color alone. Destructive actions use the
  `destructive` Button variant.

## Generated primitives

`apps/web/components/ui/` owns the editable shadcn/ui primitives: Button, Card, Badge, Progress,
Sheet, Dialog, AlertDialog, Collapsible, ToggleGroup, Checkbox, Input, Textarea, Select, Label,
Tabs, Skeleton, Sonner, DropdownMenu, Separator, and ScrollArea.
