# Asset Handoff Standards Reference

## Folder Structure

```
project-name/
├── 01-brief/
│   ├── brief.md
│   └── references/
├── 02-concepts/
│   ├── v1/
│   ├── v2/
│   └── v3/
├── 03-refinement/
│   ├── v1/
│   └── v2/
├── 04-production/
│   ├── source/
│   │   ├── logo/
│   │   ├── typography/
│   │   └── imagery/
│   ├── export/
│   │   ├── print/
│   │   ├── digital/
│   │   └── social/
│   └── documentation/
│       ├── readme.md
│       ├── color-values.md
│       ├── font-licenses.md
│       └── production-notes.md
└── 05-delivery/
    ├── final/
    └── archive/
```

## Naming Conventions

### File Names
- Format: `{project}-{deliverable}-{version}-{date}.{ext}`
- Example: `acme-poster-v2-2026-09-29.pdf`
- Use lowercase with hyphens.
- Include version and date for traceability.

### Folder Names
- Use numbers for sorting: `01-brief`, `02-concepts`.
- Use descriptive names: `source`, `export`, `documentation`.

## Versioning Strategies

### Semantic Versioning
- Major: significant structural change.
- Minor: content or design change.
- Patch: correction or typo fix.
- Example: v1.2.3

### Date-Based Versioning
- Format: YYYY-MM-DD or YYYY-MM-DD-vN.
- Example: 2026-09-29 or 2026-09-29-v2
- Best for: client-facing deliverables with frequent revisions.

### Iteration-Based Versioning
- Format: v1, v2, v3, or round-1, round-2.
- Best for: internal design iterations.

## Required Documentation

### README
- Project overview.
- Folder structure explanation.
- Asset list with descriptions.
- Contact information for questions.

### Color Values
- All colors used in the project.
- Values in HEX, RGB, CMYK, Pantone as applicable.
- Contrast ratios for text-on-background pairs.

### Font Licenses
- List of all fonts used.
- License type: commercial, open-source, custom.
- Embedding and distribution rights.

### Production Notes
- Bleed and trim for print.
- Resolution requirements.
- Color space requirements.
- Special instructions for production team.

## Quality Checks Before Handoff

- [ ] All files are in required formats.
- [ ] Source files are organized and named.
- [ ] Exported files meet resolution and color requirements.
- [ ] Colors are documented with values.
- [ ] Fonts are documented with licenses.
- [ ] Production notes are complete.
- [ ] Preview files are generated for review.
- [ ] Archive contains all versions and source files.
