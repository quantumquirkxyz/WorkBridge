import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { auditSkills } from '../skill-graph.mjs';

const SCRIPT = '.agents/skills/platform/skill-graph.mjs';

// Synthetic 8-skill fixture (two domains). Capability vocabulary:
//   sigma-boost  -> declared by 4 skills (ubiquitous, specificity 1/4)
//   theta-forge  -> declared by 2 skills (rare, specificity 1/2)
// alpha-lib deliberately has NO capabilities (must not crash anything).
const FIXTURE_SKILLS = [
  { domain: 'alpha', name: 'alpha-lib', caps: [], desc: 'alpha shared library', body: 'Plain body with no references.' },
  { domain: 'alpha', name: 'beta-lib', caps: ['sigma-boost'], desc: 'beta library for artifact synthesis', body: 'Plain body.' },
  { domain: 'alpha', name: 'gamma-lib', caps: ['sigma-boost'], desc: 'gamma library for artifact synthesis', body: 'Plain body.' },
  { domain: 'alpha', name: 'delta-lib', caps: ['sigma-boost'], desc: 'delta library for artifact synthesis', body: 'Plain body.' },
  { domain: 'beta', name: 'epsilon-tool', caps: ['sigma-boost', 'theta-forge'], desc: 'epsilon tool for artifact synthesis', body: 'Plain body.' },
  { domain: 'beta', name: 'zeta-tool', caps: ['theta-forge'], desc: 'zeta tool for artifact synthesis', body: 'Plain body.' },
  {
    domain: 'beta',
    name: 'eta-router',
    caps: [],
    desc: 'eta router for handoff work',
    body: 'The artifact is ready. Hands off to `epsilon-tool` for downstream synthesis.',
  },
  {
    domain: 'beta',
    name: 'compat-mate',
    caps: [],
    desc: 'compatibility partner for artifact synthesis',
    body: 'After review, set `nextConsumer` to `delta-lib` so automation can route the artifact.',
  },
];

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join('/tmp', 'quirk-skill-graph-'));
  for (const skill of FIXTURE_SKILLS) {
    const dir = path.join(root, '.agents', 'skills', skill.domain, skill.name);
    fs.mkdirSync(dir, { recursive: true });
    const caps = skill.caps.length ? `capabilities:\n${skill.caps.map((c) => `  - ${c}`).join('\n')}` : 'capabilities: ""';
    let fm = `---\nname: ${skill.name}\ncategory: ${skill.domain}\ndescription: "${skill.desc}"\n${caps}\ntrustTier: "1"\nartifactType: "plan"\n`;
    if (skill.name === 'eta-router') fm += 'dependencies:\n  - beta-lib\n';
    if (skill.name === 'compat-mate') fm += 'compatibility: [zeta-tool]\n';
    fm += '---\n';
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `${fm}\n# ${skill.name}\n\n${skill.body}\n`);
  }
  return root;
}

// The same shape check-all.mjs feeds its in-process report-only audits.
function fixtureManifest(root) {
  return FIXTURE_SKILLS.map((skill) => {
    const dir = path.join('.agents', 'skills', skill.domain, skill.name);
    return {
      path: `${dir}/SKILL.md`,
      dirPath: dir,
      domain: skill.domain,
      dirName: skill.name,
      text: fs.readFileSync(path.join(root, dir, 'SKILL.md'), 'utf8'),
    };
  }).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function graphFileOf(root) {
  return path.join(root, '.agents', 'skills', 'platform', 'graph', 'skill-graph.json');
}

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
}

function runJson(args) {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

describe('skill-graph.mjs', () => {
  test('build extracts nodes and all four edge types from a synthetic bundle', () => {
    const root = fixtureRoot();
    const result = runJson(['build', '--root', root, '--json']);
    assert.equal(result.status, 'written');
    assert.equal(result.nodes, 8);
    // eta-router -> beta-lib (depends-on); eta-router -> epsilon-tool (handoff phrase);
    // theta-compat -> delta-lib (handoff via nextConsumer); theta-compat -> zeta-tool (compatible);
    // capability edges: 6 among the four sigma-boost holders + 1 epsilon<->zeta = 7.
    assert.equal(result.edges, 11);
    assert.deepEqual(result.edgeTypes, {
      'depends-on': 1,
      compatible: 1,
      handoff: 2,
      capability: 7,
    });
    const graphFile = path.join(root, '.agents', 'skills', 'platform', 'graph', 'skill-graph.json');
    assert.ok(fs.existsSync(graphFile));
    const graph = JSON.parse(fs.readFileSync(graphFile, 'utf8'));
    assert.deepEqual(graph.nodes['alpha-lib'].capabilities, []);
    assert.equal(graph.nodes['zeta-tool'].domain, 'beta');
    assert.equal(graph.nodes['zeta-tool'].tier, '1');
    assert.equal(graph.nodes['zeta-tool'].artifactType, 'plan');
  });

  test('exact/keyword seeds always outrank pure neighborhood activation', () => {
    const root = fixtureRoot();
    runJson(['build', '--root', root, '--json']);
    const result = runJson(['rank', 'zeta-tool', '--root', root, '--json', '--limit', '100']);
    assert.equal(result.top1, 'zeta-tool');
    assert.equal(result.candidates[0].tier, 1);
    assert.match(result.candidates[0].reason, /exact name/);
    // Tier invariant: no tier-2 candidate may appear above any tier-1 candidate.
    const lastTier1 = result.candidates.map((c) => c.tier).lastIndexOf(1);
    const firstTier2 = result.candidates.map((c) => c.tier).indexOf(2);
    assert.ok(firstTier2 > lastTier1, `tier-2 at ${firstTier2} leaks above tier-1 ending at ${lastTier1}`);
    // theta-compat is reachable from zeta-tool only through the compatible edge:
    // it must land in tier 2 with a neighborhood-activation reason.
    const activated = result.candidates.find((c) => c.name === 'compat-mate');
    assert.equal(activated.tier, 2);
    assert.match(activated.reason, /neighborhood activation via zeta-tool \(compatible\)/);
  });

  test('a rare capability outweighs a ubiquitous one (graph specificity = 1/df)', () => {
    const root = fixtureRoot();
    runJson(['build', '--root', root, '--json']);
    const rare = runJson(['rank', 'theta-forge', '--root', root, '--json', '--limit', '100']);
    const ubiquitous = runJson(['rank', 'sigma-boost', '--root', root, '--json', '--limit', '100']);
    // theta-forge: df=2 -> 1.5 x 0.5 = 0.75 per holder; sigma-boost: df=4 -> 1.5 x 0.25 = 0.375.
    assert.equal(rare.candidates[0].seedScore, 1.5);
    assert.equal(ubiquitous.candidates[0].seedScore, 0.75);
    assert.ok(rare.candidates[0].seedScore > ubiquitous.candidates[0].seedScore);
    // The rare query seeds only the two theta-forge holders; the ubiquitous one seeds four.
    assert.deepEqual(
      rare.candidates.filter((c) => c.tier === 1).map((c) => c.name).sort(),
      ['epsilon-tool', 'zeta-tool'],
    );
    assert.equal(ubiquitous.seedCount, 4);
  });

  test('neighbors reports prerequisite fan-in and fan-out per edge type', () => {
    const root = fixtureRoot();
    runJson(['build', '--root', root, '--json']);
    const zeta = runJson(['neighbors', 'zeta-tool', '--root', root, '--json']);
    assert.equal(zeta.exists, true);
    assert.ok(zeta.fanIn.some((e) => e.from === 'compat-mate' && e.type === 'compatible' && e.weight === 0.4));
    assert.ok(zeta.fanIn.some((e) => e.from === 'epsilon-tool' && e.type === 'capability'));
    assert.equal(zeta.fanOut.length, 0);
    const beta = runJson(['neighbors', 'beta-lib', '--root', root, '--json']);
    assert.ok(beta.fanIn.some((e) => e.from === 'eta-router' && e.type === 'depends-on' && e.weight === 1));
    const epsilon = runJson(['neighbors', 'epsilon-tool', '--root', root, '--json']);
    assert.ok(epsilon.fanIn.some((e) => e.from === 'eta-router' && e.type === 'handoff'));
  });

  test('damped propagation converges with scores summing to ~1', () => {
    const root = fixtureRoot();
    runJson(['build', '--root', root, '--json']);
    const result = runJson(['rank', 'theta-forge', '--root', root, '--json', '--limit', '100']);
    assert.equal(result.converged, true);
    assert.equal(result.damping, 0.85);
    assert.ok(result.iterations < 200);
    const sum = result.candidates.reduce((total, c) => total + c.score, 0);
    assert.ok(Math.abs(sum - 1) < 1e-6, `scores sum to ${sum}, expected ~1`);
  });

  test('skills with empty capabilities do not crash build or rank', () => {
    const root = fixtureRoot();
    const built = runJson(['build', '--root', root, '--json']);
    assert.equal(built.nodes, 8);
    const exact = runJson(['rank', 'alpha-lib', '--root', root, '--json']);
    assert.equal(exact.top1, 'alpha-lib');
    const unrelated = runJson(['rank', 'zzz nothing matches this', '--root', root, '--json', '--limit', '100']);
    assert.equal(unrelated.seedCount, 0);
    assert.equal(unrelated.candidates.length, 8);
  });

  test('compare mode reports top-1 agreement arithmetic', () => {
    const root = fixtureRoot();
    runJson(['build', '--root', root, '--json']);
    const logFile = path.join(fs.mkdtempSync(path.join('/tmp', 'quirk-skill-graph-log-')), 'decisions.jsonl');
    const decisions = [
      { query: 'zeta-tool', selected: 'zeta-tool' },        // exact name -> hit
      { query: 'beta-lib', selected: 'zeta-tool' },          // exact name -> miss
      { query: 'theta-forge', selected: 'epsilon-tool' },    // joint rare seed, tie broken by name -> hit
      { query: 'alpha-lib', selected: 'beta-lib' },          // exact name -> miss
    ];
    fs.writeFileSync(logFile, decisions.map((d) => JSON.stringify(d)).join('\n') + '\n');
    const result = runJson(['--compare', logFile, '--root', root, '--json']);
    assert.equal(result.entries, 4);
    assert.equal(result.top1Hits, 2);
    assert.equal(result.top1Rate, 0.5);
    assert.equal(result.misses.length, 2);
    assert.deepEqual(result.misses.map((m) => m.top1), ['beta-lib', 'alpha-lib']);
  });

  test('build persists a byte-identical graph file across runs', () => {
    const root = fixtureRoot();
    runJson(['build', '--root', root, '--json']);
    const first = fs.readFileSync(graphFileOf(root));
    runJson(['build', '--root', root, '--json']);
    const second = fs.readFileSync(graphFileOf(root));
    assert.equal(
      createHash('sha256').update(second).digest('hex'),
      createHash('sha256').update(first).digest('hex'),
      'two builds over an unchanged bundle must persist identical bytes',
    );
    // The timestamp is stdout telemetry; it must never reach disk.
    assert.equal('generatedAt' in JSON.parse(first.toString('utf8')), false);
  });

  test('the build report keeps generatedAt as stdout telemetry', () => {
    const root = fixtureRoot();
    const report = runJson(['build', '--root', root, '--json']);
    assert.match(report.generatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    assert.equal(report.status, 'written');
    const persisted = JSON.parse(fs.readFileSync(graphFileOf(root), 'utf8'));
    assert.equal(persisted.generatedAt, undefined);
  });

  test('auditSkills defaults to a dry run that writes nothing', () => {
    const root = fixtureRoot();
    // No options at all: the check-all report-only path must never dirty a
    // tracked graph file just by auditing.
    const report = auditSkills(fixtureManifest(root));
    assert.equal(report.status, 'dry-run');
    assert.equal(fs.existsSync(graphFileOf(root)), false);
    // An explicit opt-in still persists.
    const saved = auditSkills(fixtureManifest(root), { root, save: true });
    assert.equal(saved.status, 'written');
    assert.ok(fs.existsSync(graphFileOf(root)));
  });

  test('the manifest audit and the directory walk persist identical bytes', () => {
    const walkRoot = fixtureRoot();
    runJson(['build', '--root', walkRoot, '--json']);
    const auditRoot = fixtureRoot();
    auditSkills(fixtureManifest(auditRoot), { root: auditRoot, save: true });
    const walked = fs.readFileSync(graphFileOf(walkRoot));
    const audited = fs.readFileSync(graphFileOf(auditRoot));
    assert.equal(
      createHash('sha256').update(audited).digest('hex'),
      createHash('sha256').update(walked).digest('hex'),
      'both entry points must converge on the same canonical graph bytes',
    );
  });

  test('rank builds in memory when no persisted graph exists', () => {
    const root = fixtureRoot();
    const result = runJson(['rank', 'zeta-tool', '--root', root, '--json']);
    assert.equal(result.top1, 'zeta-tool');
    assert.equal(result.nodeCount, 8);
    const graphFile = path.join(root, '.agents', 'skills', 'platform', 'graph', 'skill-graph.json');
    assert.equal(fs.existsSync(graphFile), false);
  });
});
