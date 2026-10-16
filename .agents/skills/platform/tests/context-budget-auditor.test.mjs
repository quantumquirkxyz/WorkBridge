import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { estimateTokens } from '../context-budget-auditor.mjs';

const SCRIPT = '.agents/skills/platform/context-budget-auditor.mjs';

function makeSkill(root, domain, name, description, tags) {
  const dir = path.join(root, domain, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\ntags: [${tags}]\n---\n\n# ${name}\n\nContract body.\n`);
  return dir;
}

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join('/tmp', 'quirk-context-'));
  makeSkill(root, 'alpha', 'small-skill', 'x'.repeat(40), ['one']);
  makeSkill(root, 'alpha', 'large-skill', 'y'.repeat(400), ['alpha', 'beta']);
  makeSkill(root, 'beta', 'medium-skill', 'z'.repeat(200), ['beta']);
  return root;
}

function run(auditRoot, metricsFile, extra = []) {
  return spawnSync('node', [SCRIPT, '--root', auditRoot, '--metrics', metricsFile, '--json', ...extra], { encoding: 'utf8' });
}

describe('context-budget-auditor.mjs', () => {
  test('tokens are estimated as ceil(chars / 4) per L1 field', () => {
    assert.equal(estimateTokens('x'.repeat(400)), 100);
    assert.equal(estimateTokens(''), 0);

    const root = fixtureRoot();
    const metrics = path.join(fs.mkdtempSync(path.join('/tmp', 'quirk-metrics-')), 'context-budget.json');
    const result = run(root, metrics, ['--no-write']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);

    assert.equal(report.skillCount, 3);
    assert.equal(report.totalTokens, 3 + 10 + 1 + 3 + 100 + 3 + 3 + 50 + 1);
    assert.equal(report.averageTokens, Math.round(report.totalTokens / 3));
    assert.deepEqual(report.perDomain, { alpha: 3 + 10 + 1 + 3 + 100 + 3, beta: 3 + 50 + 1 });
  });

  test('top-N ordering is by descending L1 tokens', () => {
    const root = fixtureRoot();
    const metrics = path.join(fs.mkdtempSync(path.join('/tmp', 'quirk-metrics-')), 'context-budget.json');
    const report = JSON.parse(run(root, metrics, ['--no-write', '--top', '2']).stdout);
    assert.deepEqual(report.topSkills.map((entry) => entry.skill), ['large-skill', 'medium-skill']);
    assert.equal(report.topSkills[0].tokens, 106);

    const single = JSON.parse(run(root, metrics, ['--no-write', '--top', '1']).stdout);
    assert.equal(single.topSkills.length, 1);
    assert.equal(single.topSkills[0].skill, 'large-skill');
  });

  test('a long description is warned as an L1 truncation risk', () => {
    const root = fixtureRoot();
    makeSkill(root, 'beta', 'verbose-skill', 'v'.repeat(1200), ['verbose']);
    const metrics = path.join(fs.mkdtempSync(path.join('/tmp', 'quirk-metrics-')), 'context-budget.json');
    const report = JSON.parse(run(root, metrics, ['--no-write']).stdout);
    const warned = report.warnings.map((warning) => warning.skill);
    assert.deepEqual(warned, ['verbose-skill']);
    assert.match(report.warnings[0].message, /1213 characters/);
  });

  test('--compare reports growth against the stored snapshot', () => {
    const root = fixtureRoot();
    const metricsDir = fs.mkdtempSync(path.join('/tmp', 'quirk-metrics-'));
    const metrics = path.join(metricsDir, 'context-budget.json');

    const first = run(root, metrics);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(JSON.parse(first.stdout).snapshotWritten, true);

    makeSkill(root, 'beta', 'added-skill', 'g'.repeat(400), ['added']);
    const compared = JSON.parse(run(root, metrics, ['--compare']).stdout);
    assert.equal(compared.comparison.deltaTokens, 3 + 100 + 2);
    assert.equal(compared.comparison.previousTotalTokens, compared.totalTokens - compared.comparison.deltaTokens);
    assert.ok(compared.comparison.growth > 0);
    assert.equal(compared.comparison.perDomain.find((domain) => domain.domain === 'beta').delta, 105);
    assert.equal(compared.snapshotWritten, false);
  });

  test('the snapshot file is persisted with date, per-domain and top skills', () => {
    const root = fixtureRoot();
    const metrics = path.join(fs.mkdtempSync(path.join('/tmp', 'quirk-metrics-')), 'context-budget.json');
    run(root, metrics);
    assert.ok(fs.existsSync(metrics));
    const snapshot = JSON.parse(fs.readFileSync(metrics, 'utf8'));
    assert.equal(snapshot.totalTokens, 174);
    assert.equal(snapshot.skillCount, 3);
    assert.deepEqual(Object.keys(snapshot.perDomain).sort(), ['alpha', 'beta']);
    assert.equal(snapshot.topSkills.length, 3);
    assert.match(snapshot.date, /^\d{4}-\d{2}-\d{2}$/);
  });
});
