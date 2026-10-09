# Typography Hierarchy

## Type Scale for Editorial

A consistent modular scale prevents arbitrary font size jumps.

| Level         | Function                          | Typical Size Range | Weight / Style          |
|---------------|-----------------------------------|--------------------|-------------------------|
| Display       | Cover lines, splash headlines     | 36–72 pt           | Bold, display face      |
| Title         | Chapter or article title          | 24–36 pt           | Semibold, display/serif |
| Subtitle      | Deck, supporting title            | 14–18 pt           | Regular, serif/sans     |
| Body          | Running text                      | 9–12 pt            | Regular, serif          |
| Lead          | Opening paragraph                 | 11–13 pt           | Regular, sometimes italic|
| Caption       | Figure captions, photo credits    | 7–9 pt             | Regular, sans or serif  |
| Footnote      | Endnotes, citations               | 7–8 pt             | Regular, same as body   |

Choose one base size and derive others with a modular ratio (major third 1.25, perfect fourth 1.333, golden ratio 1.618).

## Font Pairing Strategies

### Serif + Sans
- Pair a text serif (body) with a neutral sans (UI elements, captions, metadata).
- Ensure x-height compatibility so body and captions feel cohesive.
- Example pairings: Merriweather + Inter, Source Serif + Source Sans, Georgia + Helvetica Neue.

### Superfamily
- Use one type family that includes both serif and sans variants.
- Guarantees matching x-heights, weights, and proportions.
- Example: FF Meta, PT Superfamily, Source Pro.

### Display + Body
- Reserve a distinctive display face for titles only.
- Keep body in a highly readable text face.
- Limit to two type families maximum per publication.

## Leading, Tracking, and Kerning

### Leading (Line Height)
- Body text: 120–140% of font size.
- Dense text (reports): 130–150%.
- Display headlines: 100–110%.
- Multi-column layouts: increase leading to 130–160% to aid column jumps.

### Tracking (Letter Spacing)
- Tighten display headlines slightly (−25 to −50).
- Widen small caps or uppercase labels (+25 to +100).
- Leave body tracking at default; only adjust for optical sizing.

### Kerning
- Rely on font-internal kerning pairs first.
- Manually kern large display type, especially all-caps headlines.
- Avoid kerning body text; let the font engine handle metrics.

## Drop Caps, Pull Quotes, and Initial Styling

### Drop Caps
- Typically 2–4 lines deep.
- Align cap with text baseline; descend below baseline for lowercase letters.
- Use the same typeface and weight as body; avoid introducing a new font.
- Ensure surrounding text justification aligns cleanly to the drop cap shape.

### Pull Quotes
- Pull from the body text; do not introduce new content.
- Scale 1.5–2× body size; place in margin or within column with clear indent.
- Use same typeface family; italic or bold weight for distinction.
- Maintain consistent placement (top-right, mid-column, etc.) across chapters or sections.

### Initial Styling (Alternate Caps / Small Caps)
- Small caps for proper nouns, acronyms, or section labels.
- Track small caps (+25 to +100) to avoid uneven color.
- Use true small-cap glyphs when available; avoid fake small caps via scaling.

## Running Headers and Footers

- Running header: chapter title, article title, or section name; left/right alternation for spreads.
- Running footer: page numbers, maybe journal or book title.
- Use a size smaller than body (7–9 pt) or equal to caption size.
- Align flush-left or flush-right with the grid; never center in multi-column layouts.
- Include the publication name or logo subtly in one position only (verso/recto or every page).
