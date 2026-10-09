# Accessible Color Palettes

All palettes below are selected for colorblind safety and WCAG contrast compliance. Each palette includes hex codes, contrast ratios against white and near-black backgrounds, and usage guidance.

---

## ColorBrewer Schemes

ColorBrewer is a curated set of palettes designed for cartography and data visualization, with explicit colorblind-safe variants.

### Qualitative (categorical)

**Set2 (8 colors)**
- Hex: `#66C2A5 #FC8D62 #8DA0CB #E78AC3 #A6D854 #FFD92F #E5C494 #B3B3B3`
- Contrast vs white: 2.5:1 to 3.5:1 (use for large areas or with dark text)
- Contrast vs #1a1a1a: 4.5:1 to 6.5:1 (suitable for body text on light backgrounds)
- Colorblind-safe: Yes
- Use case: Up to 8 distinct categories with no inherent ordering

**Paired (12 colors)**
- Hex: `#A6CEE3 #1F78B4 #B2DF8A #33A02C #FB9A99 #E31A1C #FDBF6F #FF7F00 #CAB2D6 #6A3D9A #FFFF99 #B15928`
- Contrast vs white: 2.0:1 to 4.0:1
- Contrast vs #1a1a1a: 4.0:1 to 7.0:1
- Colorblind-safe: Partially (use with caution; red-green pairs may confuse)
- Use case: Paired categories (e.g., before/after, male/female across groups)

### Sequential (ordered, low to high)

**YlGnBu (9 steps)**
- Hex: `#FFFFD9 #EDF8B1 #C7E9B4 #7FCDBB #41B6C4 #1D91C0 #225EA8 #253494 #081D58`
- Contrast vs white: 1.5:1 (light steps) to 8.0:1 (dark steps)
- Contrast vs #1a1a1a: 3.5:1 (light steps) to 12.0:1 (dark steps)
- Colorblind-safe: Yes
- Use case: Heatmaps, choropleths, intensity maps

**Blues (9 steps)**
- Hex: `#F7FBFF #DEEBF7 #C6DBEF #9ECAE1 #6BAED6 #4292C6 #2171B5 #08519C #08306B`
- Contrast vs white: 1.5:1 to 8.0:1
- Contrast vs #1a1a1a: 3.5:1 to 12.0:1
- Colorblind-safe: Yes
- Use case: Monotone intensity, professional dashboards

### Diverging (two extremes with neutral midpoint)

**RdYlBu (11 steps)**
- Hex: `#A50026 #D73027 #F46D43 #FD AE61 #FEE090 #FFFFBF #E0F3F8 #ABD9E9 #74ADD1 #4575B4 #313695`
- Contrast vs white: 2.0:1 to 7.0:1
- Contrast vs #1a1a1a: 4.0:1 to 10.0:1
- Colorblind-safe: Partially (red-blue is safe, but yellow midpoint may be hard to distinguish)
- Use case: Deviation from a midpoint (profit/loss, temperature anomaly)

**PuOr (11 steps)**
- Hex: `#7F3B08 #B35806 #E66101 #FDB863 #FEE0B6 #F7F7F7 #D8DAEB #B2ABD2 #8073AC #542788 #2D004B`
- Contrast vs white: 2.0:1 to 7.0:1
- Contrast vs #1a1a1a: 4.0:1 to 10.0:1
- Colorblind-safe: Yes (purple-orange is colorblind-safe)
- Use case: Diverging data with strong colorblind safety requirement

---

## Tableau 10

Tableau’s default 10-color palette, optimized for categorical data and widely recognized.

**Hex codes**
- `#4E79A7 #F28E2B #E15759 #76B7B2 #59A14F #EDC948 #B07AA1 #FF9DA7 #9C755F #BAB0AC`

**Contrast vs white:** 2.5:1 to 4.5:1
**Contrast vs #1a1a1a:** 4.5:1 to 7.0:1
**Colorblind-safe:** Partially (avoid pairing red/green and blue/orange; blue/orange is safe)

**Use case:** Dashboards, business intelligence, categorical comparisons. Maximum 10 categories.

---

## Okabe-Ito

The Okabe-Ito palette is specifically designed to be colorblind-safe for all common forms of color vision deficiency.

**Hex codes (7 colors)**
- `#E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 #000000`

**Contrast vs white:** 2.5:1 to 7.0:1
**Contrast vs #1a1a1a:** 4.5:1 to 10.0:1
**Colorblind-safe:** Yes (all forms)

**Use case:** Scientific publications, presentations, any audience with unknown color vision. Maximum 7 categories; use black for an 8th if needed.

---

## Selection Rules

1. **Categorical data (no order):** Use Okabe-Ito or ColorBrewer Set2.
2. **Sequential data (low → high):** Use ColorBrewer Blues or YlGnBu.
3. **Diverging data (two extremes):** Use ColorBrewer PuOr or RdYlBu (with caution).
4. **Dashboards with brand alignment:** Use Tableau 10 and supplement with patterns.
5. **Always validate:** Run `scripts/validate_chart.py` to check contrast.
