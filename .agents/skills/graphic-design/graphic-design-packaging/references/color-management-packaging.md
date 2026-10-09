# Color Management for Packaging Print

## CMYK vs Pantone vs RGB

- **RGB** is for screen display only. Do not send RGB files to packaging printers.
- **CMYK** is the four-color process used on most offset and flexo presses. Suitable for photographic images and complex gradients.
- **Pantone (PMS)** spot colors are pre-mixed inks that provide consistent, repeatable color across print runs. Required for brand-critical solids (logos, brand colors) and for colors outside the CMYK gamut.

## Spot Colors vs Process Colors

- **Spot colors:** Use when brand guidelines specify exact color, when metallic or fluorescent ink is required, or when a color cannot be accurately reproduced in CMYK.
- **Process (CMYK):** Use for full-color images, gradients, and when cost efficiency is more important than exact color matching.
- **Combination:** Many packaging jobs use both. Spot for brand solids, CMYK for photography.

## ICC Profiles for Packaging Print

- **Coated substrates:** use ICC profiles for coated stocks (e.g., GRACoL, SWOP, PSO, FOGRA).
- **Uncoated / kraft:** use profiles tuned for uncoated paper to avoid muddy midtones.
- **Corrugated E-flute / board:** use profiles for newsprint or uncoated board depending on liner.
- Always embed or assign the correct profile in your artwork file before export.

## Dot Gain and Trapping

- **Dot gain:** halftone dots grow when pressed into paper. Expect 15%–25% dot gain on uncoated stock, 10%–18% on coated stock. Compensate in your setup if the printer does not compensate automatically.
- **Trapping:** overlaps between adjacent colors to hide misregistration. Typical trap values are 0.1 mm to 0.3 mm. Overprint and knockout settings must be explicit in the dieline.

## Proofing Requirements

- **Digital soft proof:** review color, bleed, and text before generating film or plate.
- **Hard proof (inkjet or contract proof):** required for color-critical jobs. Use FOGRA or IDEAlliance standards as contract reference.
- **Shrink / scale proof:** for flexible packaging, proof on actual film or label material under intended lighting.

## Color Specification Checklist

- [ ] All brand colors identified as Pantone spot or CMYK values.
- [ ] ICC profile assigned and embedded.
- [ ] Dot gain compensation confirmed with printer.
- [ ] Trap values set and reviewed.
- [ ] Proof approved before plate making.
