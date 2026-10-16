# Skill search index (generated)

This directory holds ONE generated artifact, `skill-index.json`, and this
explanation. Do not hand-edit either; both are produced by

    node .agents/skills/platform/scripts/build-skill-index.mjs --write

and the JSON is a pure function of the bundle, so a re-run over unchanged
content writes byte-identical bytes.

## What is in the index

Every bundle skill except the `platform` domain (bundle infrastructure, not
skill content). Per skill:

| field | meaning |
| --- | --- |
| `skill` | `<domain>/<name>`; also the key of the `skills` object |
| `name` / `domain` | directory name and top-level domain |
| `description` | the frontmatter routing surface |
| `capabilities` / `tags` | declared arrays, empty when the skill ships none |
| `trustTier` / `risk` / `artifactType` | governance metadata |
| `tokens` | estimated tokens, `ceil(len/4)` over name + description + tags |
| `headings` | the `## X` headings of the body, in document order |
| `terms` | normalized, lowercased, stopword-free, de-duplicated tokens of description + capabilities + tags + headings |
| `bodyLines` | line count of the body |
| `path` | bundle-relative directory |

Global keys: `postings`, `docFrequency`, `docLength` and `stats`.

## The ranker

BM25 with `k1 = 1.5` and `b = 0.75`, over a weighted term frequency:

    weightedTf(term, skill) =    3 * tf(description)
                              +  2 * tf(capabilities)
                              +  1.5 * tf(headings)
                              +  1 * tf(terms)

    score(term, skill) = idf(term) * weightedTf * (k1 + 1)
                                  / (weightedTf + k1 * (1 - b + b * len/avgLen))

    idf(term) = log(1 + (N - df + 0.5) / (df + 0.5))

with `N` = indexed skills, `df` = skills containing the term, `len` =
weighted document length and `avgLen` = the mean of those lengths. Postings
are inverted (`postings[term][skillId]`), so a query touches one bucket per
term instead of the whole corpus.

## Query synonym bridge

The bundle vocabulary is English while operator prompts are frequently written
in Spanish, and operators write shortcuts the bundle spells out.
`QUERY_SYNONYMS` in `build-skill-index.mjs` expands a query token with the
bundle's own wording before scoring:

- locale bridge: "revisa" also scores "review", "hallazgos" also scores
  "findings", "audita" also scores "audit";
- surface-variant bridge: "diff" also scores "changes", because the delivery
  review skills describe their input as "Review the changes since a fixed
  point", not as "diff".

The bridge applies to the query only, it maps onto vocabulary the indexed
descriptions already use, and every entry is a single line in that map.

This bridge is what makes

    node search-skills.mjs "revisa el diff contra origin/main y dime los hallazgos"

rank `delivery/code-review` first. It is the one tuned weight in the ranker:
without it the query keeps three useful tokens, of which "diff" lands on
`integrations/pr-operations` and "origin" matches nothing at all.

## Consumers

- `scripts/search-skills.mjs` ranks a query against this file, building it in
  memory when the file is absent.
- `evals/evaluate-routing.mjs` scores the routing fixtures in
  `evals/routing/` against the same index.
- `scripts/generate-hard-negatives.mjs` proposes negative controls that a
  ranker still resolves to an adjacent skill.

## Reading it back

    node .agents/skills/platform/scripts/search-skills.mjs --query "..." --json

Both commands exit non-zero only on usage or I/O errors, never because a query
returned nothing.
