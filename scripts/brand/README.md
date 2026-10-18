# WorkBridge brand assets

The mark is an arch bridge with a person crossing it: the step from informal experience to a
first job. Colours come from the app palette (ink `#111111`, blue `#2457F0`, yellow `#FFE14D`,
pink `#FF5EA8`, cream `#F3EFE6`); the wordmark is Archivo Black with `BRIDGE` on a tilted pink block.

| File | Use |
|---|---|
| `apps/web/public/brand/workbridge-mark.svg` | Square mark on light backgrounds |
| `apps/web/public/brand/workbridge-mark-dark.svg` | Square mark on dark backgrounds (cream hard shadow) |
| `apps/web/public/brand/workbridge-logo.svg` | Horizontal lockup, text outlined, for light backgrounds |
| `apps/web/public/brand/workbridge-logo-dark.svg` | Horizontal lockup for dark backgrounds |
| `apps/web/app/icon.svg`, `apple-icon.png` | Favicon and Apple touch icon (picked up by Next.js) |
| `apps/web/public/icon-{192,512,maskable-512}.png` | PWA icons referenced by `app/manifest.ts` |
| `apps/web/components/BrandMark.tsx` | The mark as a React component (headers) |

Regenerate everything with `python scripts/brand/generate-brand-assets.py <ArchivoBlack-Regular.ttf>`
(requires `fonttools` and `cairosvg`; the font is SIL OFL).
