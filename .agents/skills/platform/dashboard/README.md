# Bundle dashboard (generated)

This directory holds ONE generated artifact, `index.html`, and this explanation.
`index.html` is a static, self-contained page: inline CSS, dark theme, monospace
type, one vanilla script for the search box, and no network, CDN, or external
asset of any kind. Open it from disk; nothing is fetched.

Do not hand-edit either file. Both are produced by

    node .agents/skills/platform/scripts/build-skill-dashboard.mjs --write

and the page is a pure function of the bundle, so a re-run over unchanged
content writes byte-identical bytes. Two CLIs matter:

    node .agents/skills/platform/scripts/build-skill-dashboard.mjs --json
    node .agents/skills/platform/scripts/build-skill-dashboard.mjs --write --out path/to/dashboard.html

The first is a dry run that reports what would be written; `--write` persists the
page and the skill cards. `--skill <domain/name>` restricts the run to one card
and leaves the page alone, which is the fast path when you want to inspect a
single skill. No wall-clock value reaches the output unless `--now <iso>` is
passed, so two runs over the same bundle always agree.

## What the page shows

| section | content |
| --- | --- |
| Summary | bundle totals, the risk and trust-tier distributions, declared side effects, approvals, manifest freshness, graph size, agent cards, capability coverage |
| Skills by domain | a bar per domain plus a per-domain breakdown of risk, trust tier, approvals, side effects, and manifest state |
| Risk x trustTier | a matrix cell counting every skill that declares that row's risk and that column's tier |
| Fixture coverage | how many skills have a behavioral fixture, a regression fixture, and routing negative controls, plus the skills that have none |
| Routing metrics | top1Accuracy, top3Recall, falsePositiveRate with a color verdict, and the per-skill breakdown |
| Dependency graph | the twenty most central skills and every dependency cycle |
| Runtime manifests | skills with no runtime manifest, stale manifests, and orphan manifest files |
| Skill table | every skill in one filterable table |

All content is HTML-escaped before it reaches the page, so a skill whose
description contains angle brackets or quotes cannot break the markup.

## What each number means

- **skills / domains** - bundle entries under `.agents/skills/`, excluding the
  `platform` domain, which is infrastructure rather than skill content.
- **risk** - the frontmatter `risk` field, normalized to `low`, `medium`, or
  `high`. An unset or unspelled value counts as `low`, the same normalization
  the runtime manifests use.
- **trust tier** - the frontmatter `trustTier` field, normalized to 1-4. Tier 1
  is least trusted, tier 4 most.
- **side effects** - the frontmatter `sideEffects` array. "Declared" counts
  skills with at least one entry; the tile note sums every declared entry.
- **approval required** - skills whose frontmatter `approvalRequired` reads true;
  "approval targets" counts skills that also list `approvalFor` entries.
- **manifest ok / stale / missing** - a runtime manifest is *fresh* when its
  `frontmatterHash` still matches the hash of the current `SKILL.md`
  frontmatter, *stale* when it does not, and *missing* when no manifest file
  exists for the skill. Regenerate with
  `node .agents/skills/platform/scripts/build-runtime-manifests.mjs --write`.
- **graph nodes / edges** - the typed dependency graph built by
  `skill-graph.mjs`; edges carry a `type` such as `depends-on`, `compatible-with`,
  `handoff`, or `improves`.

## Colors

- **Risk badges** - green `low`, amber `medium`, red `high`. In the matrix, red
  cells are the combinations the tool-risk policy treats as sensitive: high risk
  at any tier, and medium risk from trust tier 3 up.
- **Routing verdicts** - green `pass` and red `fail`. A metric passes when
  `top1Accuracy >= minTop1Accuracy`, `top3Recall >= minTop3Recall`, and
  `falsePositiveRate <= maxFalsePositiveRate`. The first and third thresholds
  are read from `metrics/routing/latest.json` when it declares them; without a
  declared `minTop3Recall` the page uses 0.75. Metrics the file does not
  threshold are shown as amber `info` rather than judged.
- **Fixture chips** - green `beh`, `reg`, `neg` when the skill has a behavioral
  fixture, a regression fixture, or routing negative controls.
- **Manifest badges** - green `ok`, red `stale`, amber `missing`.

## Centrality

The dependency section ranks skills by Personalized PageRank (damping 0.85) over
the typed edge graph with a uniform seed: the same propagation
`node .agents/skills/platform/skill-graph.mjs rank` runs, seeded equally instead
of by a query. A high score means a lot of the graph's mass flows through that
skill, not that it is important by policy. Fan-in and fan-out count the edges
that point at and away from the skill. Cycles are strongly connected components
of the `depends-on` edges; an empty list means the declared dependency graph is
acyclic.

## Related artifacts

- Skill cards, one per bundle skill: `.agents/skills/platform/skill-cards/`.
- The symptom-to-command map for the platform tools:
  `docs/reference/platform-command-map.md`.
- The bundle gate: `node .agents/skills/platform/check-all.mjs`.
