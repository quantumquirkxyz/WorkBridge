# Dieline Standards

## Bleed Requirements

- **Standard bleed:** 3 mm (1/8 inch) on all trimmed sides.
- **Extended bleed for large formats:** 5 mm when total flat size exceeds 500 mm.
- **Bleed boundary:** A dashed outer path 3 mm beyond the intended cut line. Artwork and background color must extend to bleed.

## Safety Zones

- **Keep critical elements 5 mm (0.2 inch) or more from the cut line.**
- Critical elements include logos, text, barcodes, QR codes, and regulatory markings.
- Mark the safety zone with a dashed inner boundary 5 mm inside the cut line.

## Glue Tabs and Overlaps

- **Glue tab width:** typically 8 mm to 15 mm depending on stock thickness and glue type.
- **Overlap allowance:** 2 mm to 5 mm for perfect registration.
- Position glue tabs so they do not cover critical content on the adjacent panel.

## Folding Guidelines and Score Lines

- **Score lines** represent fold axes. Render as thin dashed lines.
- **Major folds:** 0.6 pt to 1.0 pt weight.
- **Crease vs. tuck:** distinguish between folds that create panels and those that close the package.
- Add fold direction arrows when the folding sequence is non-obvious.

## Registration Marks

- **Standard registration cross:** 6 mm length, 0.25 pt weight, placed outside bleed on all four sides.
- **Color bars:** CMYK and any spot colors, placed near registration marks.
- **Trim marks:** 3 mm outside bleed, small crosses or lines indicating the cut line.

## Standard Sizes and Templates

- **FEFCO codes** for corrugated: 0201 (RSC), 0203 (HSC), 0204 (FOL), 0405 (tray), 200 (half-slotted tubes).
- **Common folding carton flat sizes:** 100×150 mm, 150×200 mm, 200×250 mm, 250×350 mm.
- **Rigid box base/lid:** base interior dimensions + 1–2 mm per side for clearance.

## Software Conventions

- **Illustrator:** set document bleed to 3 mm; use separate layers for dieline (cut), fold lines, glue tab, and artwork.
- **Inkscape:** create a page-sized artboard with 3 mm bleed; use stroke styles to differentiate line types.
- **Export settings:** PDF/X-1a for print-ready artwork; include bleed and crop marks.
- **Layer naming:** `dieline-cut`, `dieline-fold`, `dieline-glue`, `artwork`, `text`, `safety-zone`.

## Line Styles Reference

| Element            | Line Type      | Color        | Weight  |
|--------------------|----------------|--------------|---------|
| Cut line           | Solid          | Red          | 0.75 pt |
| Fold line          | Dashed         | Blue         | 0.5 pt  |
| Glue area          | Solid          | Green        | 0.5 pt  |
| Bleed boundary     | Long dashed    | Magenta      | 0.25 pt |
| Safety zone        | Dotted         | Orange       | 0.25 pt |
| Registration       | Solid          | Black        | 0.25 pt |
