import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSkillIndex,
  searchIndex,
  bm25Scores,
  enrichSkills,
  BASE_STOPWORDS,
  FIELD_WEIGHTS,
  BM25_K1,
  BM25_B,
} from '../scripts/build-skill-index.mjs';
import { adjacentSkills, variantOf } from '../scripts/generate-hard-negatives.mjs';
import { routingMetrics, confusionMatrix, readFixtures } from '../evals/evaluate-routing.mjs';
import { collectSkills } from '../skill-graph.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(PLATFORM_DIR, '..', '..', '..');
const ROUTING_DIR = path.join(REPO_ROOT, 'evals', 'routing');

// A representative slice: the shapes collectSkills() really returns, including
// one skill with no capabilities (the newer frontmatter ships capabilities: "").
const REPRESENTATIVE_SKILLS = [
  {
    domain: 'delivery',
    name: 'code-review',
    tier: '3',
    artifactType: 'review',
    capabilities: [
      'apply code review workflow',
      'produce code review artifact',
      'validate code review completion criteria',
    ],
    dependencies: [],
    compatibility: [],
    description: 'Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes - Standards and Spec - and publish findings only.',
    body: '## Contract\n\nArtifact shape.\n\n## Provenance\n\nTraceable.\n\n## Process\n\nRead the diff.\n',
    path: '.agents/skills/delivery/code-review',
    tags: ['delivery'],
    risk: 'medium',
  },
  {
    domain: 'delivery',
    name: 'review-pr',
    tier: '3',
    artifactType: 'review',
    capabilities: ['apply review pr workflow', 'produce review pr artifact'],
    dependencies: [],
    compatibility: [],
    description: 'Review a pull request against the fixed point the user supplies, separating Standards and Spec findings into distinct axes.',
    body: '## Contract\n\nArtifact shape.\n\n## Process\n\nRead the PR.\n',
    path: '.agents/skills/delivery/review-pr',
    tags: ['delivery'],
    risk: 'medium',
  },
  {
    domain: 'backend',
    name: 'rate-limiting',
    tier: '2',
    artifactType: 'design',
    capabilities: [],
    dependencies: [],
    compatibility: [],
    description: 'Design rate limiting and throttling with token bucket windows, quotas and a backpressure seam.',
    body: '## Contract\n\nArtifact shape.\n',
    path: '.agents/skills/backend/rate-limiting',
    tags: ['backend'],
    risk: 'medium',
  },
  {
    domain: 'platform',
    name: 'skill-audit',
    tier: '1',
    artifactType: 'audit',
    capabilities: ['apply skill audit workflow'],
    dependencies: [],
    compatibility: [],
    description: 'Audit the Skills bundle, lockfile, symlink parity and contract drift.',
    body: '## Contract\n\nBundle infrastructure, not skill content.\n',
    path: '.agents/skills/platform/skill-audit',
    tags: ['platform'],
    risk: 'low',
  },
];

describe('build-skill-index.mjs', () => {
  test('the ranker parameters match the contract the README documents', () => {
    assert.equal(BM25_K1, 1.5);
    assert.equal(BM25_B, 0.75);
    assert.deepEqual(FIELD_WEIGHTS, { description: 3, capabilities: 2, headings: 1.5, terms: 1 });
    assert.equal(BASE_STOPWORDS.has('the'), true);
    assert.equal(BASE_STOPWORDS.has('findings'), false);
  });

  test('buildSkillIndex indexes a representative slice with terms, postings and weights', () => {
    const index = buildSkillIndex(REPRESENTATIVE_SKILLS);

    // The platform domain is bundle infrastructure and is never searched.
    assert.equal(index.stats.skills, 3);
    assert.equal(index.skills['platform/skill-audit'], undefined);
    assert.equal(index.skills['delivery/code-review'].domain, 'delivery');
    assert.equal(index.skills['delivery/code-review'].trustTier, '3');
    assert.equal(index.skills['delivery/code-review'].risk, 'medium');
    assert.equal(index.skills['delivery/code-review'].artifactType, 'review');
    assert.deepEqual(index.skills['delivery/code-review'].tags, ['delivery']);
    assert.deepEqual(index.skills['backend/rate-limiting'].capabilities, []);
    assert.equal(index.skills['delivery/code-review'].headings[0], '## Contract'.slice(3));

    // terms are normalized, lowercased, stopword-free and de-duplicated.
    const terms = index.skills['delivery/code-review'].terms;
    assert.deepEqual(terms, [...new Set(terms)].sort());
    assert.equal(terms.includes('review'), true);
    assert.equal(terms.includes('findings'), true);
    assert.equal(terms.includes('the'), false);
    assert.equal(terms.includes('and'), false);

    // tokens are the ceil(len/4) estimate over name + description + tags.
    const expectedTokens = Math.ceil(
      [REPRESENTATIVE_SKILLS[0].name, REPRESENTATIVE_SKILLS[0].description, REPRESENTATIVE_SKILLS[0].tags.join(' ')].join(' ').length / 4,
    );
    assert.equal(index.skills['delivery/code-review'].tokens, expectedTokens);

    // weightedTf is the documented sum: 3*description + 2*capabilities + 1.5*headings + 1*terms.
    const reviewInDescription = 1;
    const reviewInCapabilities = 3;
    const reviewInTerms = 1;
    const reviewHeadings = 0;
    assert.equal(
      index.postings.review['delivery/code-review'],
      3 * reviewInDescription + 2 * reviewInCapabilities + 1.5 * reviewHeadings + 1 * reviewInTerms,
    );
    assert.equal(index.docFrequency.review > 0, true);
    assert.ok(index.docLength['delivery/code-review'] > 0);
    assert.ok(index.stats.avgLength > 0);
  });

  test('the index is deterministic for identical input', () => {
    assert.deepEqual(
      buildSkillIndex(REPRESENTATIVE_SKILLS),
      buildSkillIndex([...REPRESENTATIVE_SKILLS].reverse()),
    );
  });
});

describe('searchIndex', () => {
  const index = buildSkillIndex(REPRESENTATIVE_SKILLS);

  test('the diff query resolves to delivery/code-review as top-1', () => {
    const results = searchIndex(index, 'revisa el diff contra origin/main y dime los hallazgos');
    assert.equal(results[0].skill, 'delivery/code-review');
    assert.equal(results[0].rank, 1);
    assert.equal(results[0].description.startsWith('Review the changes'), true);
    // the surface-variant bridge is what lands this one, not a raw "diff" match
    assert.equal(results[0].matchedTerms.includes('changes'), true);
    assert.equal(results[0].score > results[1].score, true);
  });

  test('limit truncates the ranking and ranks are contiguous', () => {
    const limited = searchIndex(index, 'review the findings', { limit: 1 });
    assert.equal(limited.length, 1);
    assert.equal(limited[0].rank, 1);
  });

  test('a query that matches nothing ranks nothing', () => {
    assert.deepEqual(searchIndex(index, 'qqzzz wwvvv xxyyy'), []);
  });
});

describe('bm25Scores', () => {
  const index = buildSkillIndex(REPRESENTATIVE_SKILLS);
  const query = 'review the pull request findings';

  test('is deterministic and ordered by descending score', () => {
    const first = bm25Scores(index, query);
    const second = bm25Scores(index, query);
    assert.deepEqual(first, second);
    assert.ok(first.length > 1);
    for (let i = 1; i < first.length; i++) {
      assert.ok(first[i - 1].score >= first[i].score, `${first[i - 1].skill} must not score below ${first[i].skill}`);
      if (first[i - 1].score === first[i].score) {
        assert.ok(first[i - 1].skill < first[i].skill, 'equal scores must tie-break on skill id');
      }
    }
    for (const entry of first) assert.ok(entry.score > 0);
  });

  test('the same query over an unchanged bundle keeps its ranking', () => {
    const real = buildSkillIndex(REPRESENTATIVE_SKILLS);
    assert.deepEqual(bm25Scores(real, query).map((entry) => entry.skill), bm25Scores(index, query).map((entry) => entry.skill));
  });
});

describe('routingMetrics and confusionMatrix', () => {
  const rows = [
    // positive row, ranker got it right
    { skill: 'delivery/code-review', expected: 'delivery/code-review', top1: 'delivery/code-review', top3: ['delivery/code-review'], shouldTrigger: true, adjacent: new Set(['delivery/review-pr']) },
    // positive row, ranker missed
    { skill: 'delivery/code-review', expected: 'delivery/code-review', top1: 'delivery/review-pr', top3: ['delivery/review-pr', 'delivery/code-review'], shouldTrigger: true, adjacent: new Set(['delivery/review-pr']) },
    // negative row, ranker correctly kept hands off and captured the adjacent skill
    { skill: 'delivery/code-review', expected: 'delivery/review-pr', top1: 'delivery/review-pr', top3: ['delivery/review-pr'], shouldTrigger: false, adjacent: new Set(['delivery/review-pr']) },
    // negative row, ranker put the skill under test first: a false positive
    { skill: 'delivery/code-review', expected: 'delivery/plan-review-fixes', top1: 'delivery/code-review', top3: ['delivery/code-review'], shouldTrigger: false, adjacent: new Set(['delivery/plan-review-fixes']) },
    // negative row with no answer at all
    { skill: 'delivery/code-review', expected: 'qa/qa-automation', top1: null, top3: [], shouldTrigger: false, adjacent: new Set(['qa/qa-automation']) },
  ];

  test('confusionMatrix counts expected -> selected, including no-answer rows', () => {
    assert.deepEqual(confusionMatrix(rows), {
      'delivery/code-review': { 'delivery/code-review': 1, 'delivery/review-pr': 1 },
      'delivery/review-pr': { 'delivery/review-pr': 1 },
      'delivery/plan-review-fixes': { 'delivery/code-review': 1 },
      'qa/qa-automation': { '<none>': 1 },
    });
  });

  test('routingMetrics computes top1Accuracy, top3Recall and the negative rates', () => {
    const metrics = routingMetrics(rows, { totalRows: 10 });
    assert.equal(metrics.rows, 5);
    assert.equal(metrics.evaluated, 5);
    assert.equal(metrics.positiveRows, 2);
    assert.equal(metrics.negativeRows, 3);
    assert.equal(metrics.top1Hits, 2);
    assert.equal(metrics.top1Accuracy, 0.4);
    assert.equal(metrics.top3Hits, 3);
    assert.equal(metrics.top3Recall, 0.6);
    assert.equal(metrics.coverage, 0.5);
  });

  test('routingMetrics classifies a false positive', () => {
    const metrics = routingMetrics([rows[3]]);
    assert.equal(metrics.falsePositives, 1);
    assert.equal(metrics.falsePositiveRate, 1);
    assert.equal(metrics.negativeRejections, 0);
    assert.equal(metrics.negativeRejectionRate, 0);
    // the false positive is not an adjacent capture: the top-1 IS the tested skill
    assert.equal(metrics.adjacentCaptures, 0);
    assert.equal(metrics.adjacentCaptureRate, 0);
    assert.equal(metrics.noAnswer, 0);
  });

  test('negativeRejectionRate and adjacentCaptureRate ignore rows the caller marks unevaluated', () => {
    const unevaluated = rows.map((row, position) => (position === 3 ? { ...row, evaluated: false } : row));
    const metrics = routingMetrics(unevaluated);
    assert.equal(metrics.evaluated, 4);
    assert.equal(metrics.falsePositives, 0);
    assert.equal(metrics.falsePositiveRate, 0);
    assert.equal(metrics.rows, 5);
  });
});

describe('evaluate-routing.mjs exports', () => {
  test('routingMetrics is the same pure function the CLI scores with', async () => {
    const module = await import('../evals/evaluate-routing.mjs');
    assert.equal(module.routingMetrics, routingMetrics);
    assert.equal(typeof module.bm25Scores, 'function');
    assert.equal(typeof module.topN, 'function');
    assert.equal(typeof module.confusionMatrix, 'function');
    assert.equal(module.DEFAULT_MIN_TOP1, 0.6);
    assert.equal(module.DEFAULT_MAX_FP, 0.25);
  });

  test('readFixtures reads the checked-in routing CSVs without touching them', async () => {
    const before = fs.readdirSync(ROUTING_DIR).sort();
    const skills = await enrichSkills(collectSkills(REPO_ROOT), REPO_ROOT);
    const { files, fixtures, totalRows } = await readFixtures(ROUTING_DIR, skills);
    assert.ok(files.length > 0);
    assert.equal(totalRows, fixtures.length);
    for (const row of fixtures) {
      assert.equal(typeof row.prompt, 'string');
      assert.ok(row.prompt.length > 0);
      assert.ok(row.skill.includes('/'), `every fixture row must resolve to <domain>/<skill>, got ${row.skill}`);
    }
    // readFixtures must never write: the fixture directory is byte-identical.
    assert.deepEqual(fs.readdirSync(ROUTING_DIR).sort(), before);
  });

  test('every fixture resolves to a bundle skill, so coverage is total by construction', async () => {
    const skills = await enrichSkills(collectSkills(REPO_ROOT), REPO_ROOT);
    const known = new Set(skills.map((skill) => `${skill.domain}/${skill.name}`));
    const { fixtures } = await readFixtures(ROUTING_DIR, skills);
    for (const row of fixtures) {
      assert.ok(known.has(row.skill), `${row.file} maps to unknown skill ${row.skill}`);
    }
  });
});

describe('adjacentSkills', () => {
  const skills = [
    { domain: 'delivery', name: 'code-review', capabilities: ['produce review artifact'], description: '', body: '' },
    { domain: 'delivery', name: 'review-pr', capabilities: ['produce review artifact'], description: '', body: '' },
    { domain: 'delivery', name: 'tdd', capabilities: ['apply tdd workflow'], description: '', body: '' },
    { domain: 'routing', name: 'ask-to', capabilities: ['apply ask to workflow'], description: '', body: '' },
  ];
  const graph = { edges: [{ from: 'code-review', to: 'tdd', type: 'handoff' }] };

  test('unions same domain, shared capability and graph edges', () => {
    const adjacent = adjacentSkills(graph, skills, 'delivery/code-review');
    assert.deepEqual(adjacent, ['delivery/review-pr', 'delivery/tdd']);
  });

  test('never returns the skill itself', () => {
    const adjacent = adjacentSkills(graph, skills, 'delivery/review-pr');
    assert.equal(adjacent.includes('delivery/review-pr'), false);
  });
});

describe('variantOf', () => {
  const knownNames = new Set([
    'code-review', 'review-pr', 'review-fix-loop', 'contribution-workflow-optimizer',
  ]);
  const vocabulary = [{ term: 'observations', df: 3 }, { term: 'evidence', df: 2 }];

  test('swaps one keyword and preserves the adjacent mention', () => {
    const variant = variantOf(
      { row: 12, prompt: 'review-pr #88 against the fixed point i pinned in the issue — publish the findings on the PR' },
      { knownNames, vocabulary, adjacentNames: ['review-pr'], index: null },
    );
    assert.ok(variant, 'a slot inside the prompt must produce a variant');
    assert.equal(variant.slot, 'findings');
    assert.equal(Number.isInteger(variant.originalRow), true);
    assert.equal(variant.preservedMention, 'review-pr');
    assert.equal(variant.prompt.toLowerCase().includes('findings'), false);
    assert.equal(variant.prompt.toLowerCase().includes('observations'), true);
  });

  test('returns null when the prompt offers no swappable keyword or names nothing adjacent', () => {
    assert.equal(variantOf({ row: 1, prompt: 'i need help with something else entirely' }, { knownNames, vocabulary, adjacentNames: [] }), null);
    assert.equal(variantOf({ row: 2, prompt: 'findings only, no skill named here' }, { knownNames, vocabulary, adjacentNames: [] }), null);
  });
});
