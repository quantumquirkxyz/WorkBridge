#!/usr/bin/env node
// evaluate-fixtures.mjs - Runs behavioral, regression, and security fixtures against skills
// Usage: node evaluate-fixtures.mjs [--fixture-dir .agents/skills/platform/fixtures] [--threshold 0.8] [--json]

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const fixturesDir = process.argv.includes('--fixture-dir') ? process.argv[process.argv.indexOf('--fixture-dir') + 1] : path.join(root, '.agents', 'skills', 'platform', 'fixtures');
const threshold = parseFloat(process.argv.includes('--threshold') ? process.argv[process.argv.indexOf('--threshold') + 1] : '0.8');
const asJson = process.argv.includes('--json');

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const out = {};
  let active = null;
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (key) {
      active = key[1];
      out[active] = key[2] === '' || key[2] === '[]' ? [] : key[2].replace(/^["']|["']$/g, '');
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && active) {
      if (!Array.isArray(out[active])) out[active] = [];
      out[active].push(item[1].replace(/^["']|["']$/g, ''));
    }
  }
  return out;
}

async function loadFixtures(dir) {
  const fixtures = [];
  if (!(await exists(dir))) return fixtures;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const content = await fs.readFile(path.join(dir, entry.name), 'utf8');
    const data = JSON.parse(content);
    fixtures.push(...(data.fixtures || []));
  }
  return fixtures;
}

async function resolveSkillPath(skillName) {
  const candidates = [
    path.join(root, '.agents', 'skills', skillName, 'SKILL.md'),
    ...(await collectSkillDirs(path.join(root, '.agents', 'skills')))
      .filter(dir => path.basename(dir) === skillName)
      .map(dir => path.join(dir, 'SKILL.md')),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function collectSkillDirs(dir, out = []) {
  if (!(await exists(dir))) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    const skillMd = path.join(child, 'SKILL.md');
    if (await exists(skillMd)) {
      out.push(child);
    } else {
      await collectSkillDirs(child, out);
    }
  }
  return out;
}

async function runFixture(fixture) {
  fixture.type ??= 'regression';

  const skillFile = await resolveSkillPath(fixture.skill);
  if (!skillFile) {
    return { id: fixture.id, status: 'error', reason: `Skill not found: ${fixture.skill}` };
  }

  const text = await fs.readFile(skillFile, 'utf8');
  const frontmatter = text.match(/^---[\s\S]*?---/)?.[0] ?? '';
  const body = text.replace(/^---[\s\S]*?---\s*/, '').toLowerCase();

  if (fixture.type === 'behavioral') {
    const expected = fixture.expected;
    let passes = true;
    const details = [];
    if (expected.invokes !== undefined) {
      const invoked = body.length > 100;
      if (invoked !== expected.invokes) { passes = false; details.push(`invokes: expected ${expected.invokes}, got ${invoked}`); }
    }
    if (expected.outputContains) {
      for (const phrase of expected.outputContains) {
        if (!body.includes(phrase.toLowerCase())) { passes = false; details.push(`missing phrase: ${phrase}`); }
      }
    }
    if (expected.doesNotContain) {
      for (const phrase of expected.doesNotContain) {
        if (body.includes(phrase.toLowerCase())) { passes = false; details.push(`should not contain: ${phrase}`); }
      }
    }
    if (expected.frontmatterContains) {
      for (const phrase of expected.frontmatterContains) {
        if (!frontmatter.includes(phrase)) { passes = false; details.push(`frontmatter missing phrase: ${phrase}`); }
      }
    }
    return { id: fixture.id, skill: fixture.skill, type: 'behavioral', status: passes ? 'pass' : 'fail', details };
  }

  if (fixture.type === 'regression') {
    const expected = fixture.expectedOutput;
    let passes = true;
    const details = [];
    if (expected.contains) {
      for (const phrase of expected.contains) {
        if (!body.includes(phrase.toLowerCase())) { passes = false; details.push(`missing phrase: ${phrase}`); }
      }
    }
    if (expected.minLength && body.length < expected.minLength) { passes = false; details.push(`body too short: ${body.length} < ${expected.minLength}`); }
    if (expected.maxLength && body.length > expected.maxLength) { passes = false; details.push(`body too long: ${body.length} > ${expected.maxLength}`); }
    return { id: fixture.id, skill: fixture.skill, type: 'regression', status: passes ? 'pass' : 'fail', details };
  }

  if (fixture.type === 'security') {
    const expected = fixture.expected;
    const credentialPatterns = [/api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, /password\s*[:=]\s*['"][^'"]+['"]/i, /sk-[A-Za-z0-9]{20,}/];
    const injectionPatterns = [/ignore\s+(?:all\s+)?previous\s+instructions/i, /disregard\s+(?:all\s+)?(?:the\s+)?(?:above|previous)/i];
    let passes = true;
    const details = [];
    if (expected.containsCredentials !== undefined) {
      const found = credentialPatterns.some(p => p.test(text));
      if (found !== expected.containsCredentials) { passes = false; details.push(`credential check: expected ${expected.containsCredentials}, found ${found}`); }
    }
    if (expected.containsInjection !== undefined) {
      const found = injectionPatterns.some(p => p.test(text));
      if (found !== expected.containsInjection) { passes = false; details.push(`injection check: expected ${expected.containsInjection}, found ${found}`); }
    }
    if (expected.declaresSideEffects !== undefined) {
      const fm = parseFrontmatter(text);
      const effects = Array.isArray(fm.sideEffects) ? fm.sideEffects : [];
      const declared = effects.length > 0;
      if (declared !== expected.declaresSideEffects) { passes = false; details.push(`sideEffects declared: expected ${expected.declaresSideEffects}, got ${declared}`); }
    }
    return { id: fixture.id, skill: fixture.skill, type: 'security', status: passes ? 'pass' : 'fail', details };
  }

  return { id: fixture.id, status: 'skip', reason: 'unknown fixture type' };
}

async function main() {
  const results = [];
  const behavioralFixtures = await loadFixtures(path.join(fixturesDir, 'behavioral'));
  const regressionFixtures = await loadFixtures(path.join(fixturesDir, 'regression'));
  const securityFixtures = await loadFixtures(path.join(fixturesDir, 'security'));

  const allFixtures = [...behavioralFixtures, ...regressionFixtures, ...securityFixtures];

  for (const fixture of allFixtures) {
    const result = await runFixture(fixture);
    results.push(result);
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const passRate = results.length > 0 ? passed / results.length : 0;

  const summary = {
    total: results.length,
    passed,
    failed,
    skipped,
    passRate,
    threshold,
    meetsThreshold: passRate >= threshold,
    results,
  };

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`\nFixture Evaluation Results`);
    console.log(`Passed: ${passed}/${results.length} (${(passRate * 100).toFixed(1)}%)`);
    console.log(`Threshold: ${(threshold * 100).toFixed(1)}% — ${passRate >= threshold ? 'PASS' : 'FAIL'}`);
    if (failed > 0) {
      console.log('\nFailed fixtures:');
      for (const r of results.filter(r => r.status === 'fail')) {
        console.log(`  - ${r.id} (${r.skill}): ${r.details.join('; ')}`);
      }
    }
  }

  process.exit(passRate >= threshold ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
