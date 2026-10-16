import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultDagFile, analyze } from '../dag-scheduler.mjs';
import { auditSkills as auditContextBudget } from '../context-budget-auditor.mjs';
import { auditSkills as auditCostLedger } from '../cost-ledger.mjs';
import { auditSkills as auditSpecCompliance } from '../validate-spec-compliance.mjs';
import { auditSkills as auditSkillGraph } from '../skill-graph.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(PLATFORM_DIR, '..', '..');
const CHECK_ALL = path.join(PLATFORM_DIR, 'check-all.mjs');
const DEFAULT_DAG = path.join(PLATFORM_DIR, 'workflows', 'default-dag.json');

const REPORT_ONLY_COMMANDS = [
  'node .agents/skills/platform/context-budget-auditor.mjs --json --no-write',
  'node .agents/skills/platform/cost-ledger.mjs --json',
  'node .agents/skills/platform/validate-spec-compliance.mjs --json',
  'node .agents/skills/platform/skill-graph.mjs build --json',
];

const NEW_GATING_COMMANDS = [
  "['node', ['.agents/skills/platform/loop-runner.mjs', '--demo', '--json']]",
  "['node', ['.agents/skills/platform/idempotency.mjs', '--demo', '--intents-dir'",
];

function blockOf(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `marker not found in check-all.mjs: ${marker}`);
  const end = source.indexOf('\n];', start);
  assert.notEqual(end, -1, `block for ${marker} is not closed`);
  return source.slice(start, end);
}

function runDagScheduler(args) {
  return spawnSync('node', [path.join(PLATFORM_DIR, 'dag-scheduler.mjs'), ...args], { encoding: 'utf8' });
}

describe('check-gate wiring: default DAG gate', () => {
  test('defaultDagFile() resolves to the committed workflows/default-dag.json', () => {
    assert.equal(defaultDagFile(), DEFAULT_DAG);
    assert.ok(fs.existsSync(DEFAULT_DAG), 'the default DAG file must be committed, not generated');
  });

  test('dag-scheduler --check on the default file exits 0 with no warnings or errors', () => {
    const result = runDagScheduler(['--check', DEFAULT_DAG, '--json']);
    assert.equal(result.status, 0, result.stderr);
    const analysis = JSON.parse(result.stdout);
    assert.equal(analysis.status, 'pass');
    assert.equal(analysis.warnings.length, 0, JSON.stringify(analysis.warnings));
    assert.equal(analysis.errors.length, 0, JSON.stringify(analysis.errors));
  });

  test('the default DAG mirrors the standard-feature flow without redundant edges', () => {
    const payload = JSON.parse(fs.readFileSync(DEFAULT_DAG, 'utf8'));
    const analysis = analyze(payload);
    const levelOf = (id) => analysis.levels.find((wave) => wave.tickets.some((ticket) => ticket.id === id));
    assert.ok(levelOf('to-spec'), 'to-spec must be scheduled');
    assert.ok(levelOf('to-tickets'), 'to-tickets must be scheduled');
    assert.ok(levelOf('publish-open-pr'), 'publish-open-pr must be scheduled');
    assert.ok(levelOf('review-pr'), 'review-pr must be scheduled');
    assert.ok(levelOf('ship-subissue'), 'ship-subissue must be scheduled');
    const level = (id) => analysis.levels.findIndex((wave) => wave.tickets.some((ticket) => ticket.id === id));
    assert.equal(level('to-spec'), 0);
    assert.ok(level('to-tickets') > level('to-spec'));
    assert.ok(level('publish-open-pr') > level('to-tickets'));
    assert.ok(level('review-pr') > level('publish-open-pr'));
    assert.ok(level('ship-subissue') > level('review-pr'));
    assert.equal(analysis.warnings.length, 0, 'no redundant edges or fan-in pressure in the default DAG');
  });
});

describe('check-gate wiring: report-only audits stay report-only', () => {
  const source = fs.readFileSync(CHECK_ALL, 'utf8');
  const gatingBlock = blockOf(source, 'const checks = [');
  const reportOnlyBlock = blockOf(source, 'const reportOnlyAudits = [');

  test('the four report-only entries are declared outside the gating checks array', () => {
    for (const command of REPORT_ONLY_COMMANDS) {
      assert.ok(reportOnlyBlock.includes(`command: '${command}'`), `report-only entry missing: ${command}`);
      assert.ok(!gatingBlock.includes(command), `report-only entry leaked into gating checks: ${command}`);
    }
  });

  test('report-only entries are consumed through the shared manifest, not subprocesses', () => {
    assert.ok(source.includes('const reportOnlyAudits = ['), 'report-only audits must be declared in one place');
    assert.ok(source.includes('auditSkillGraph(manifest'), 'skill-graph must run from the shared manifest');
    assert.ok(source.includes('buildSkillManifest'), 'check-all must build the manifest exactly once');
  });

  test('the DAG gate is registered from defaultDagFile()', () => {
    assert.ok(source.includes('const dagFile = defaultDagFile();'));
    assert.ok(source.includes('dag-scheduler.mjs', ), 'the DAG gate command must stay wired');
  });

  test('the new gating entries for the unwired CLIs are present', () => {
    for (const command of NEW_GATING_COMMANDS) {
      assert.ok(gatingBlock.includes(command), `gating entry missing: ${command}`);
    }
  });
});

describe('check-gate wiring: manifest-driven audit functions', () => {
  const manifest = [
    {
      path: '.agents/skills/foundation/demo-alpha/SKILL.md',
      dirPath: '.agents/skills/foundation/demo-alpha',
      domain: 'foundation',
      dirName: 'demo-alpha',
      text: '---\nname: demo-alpha\ndescription: Demo skill one for the gate wiring test.\nlicense: MIT\ncapabilities:\n  - routing\n  - tests\n---\n\n# Demo Alpha\n\nBody text.\n',
    },
    {
      path: '.agents/skills/platform/demo-beta/SKILL.md',
      dirPath: '.agents/skills/platform/demo-beta',
      domain: 'platform',
      dirName: 'demo-beta',
      text: '---\nname: demo-beta\ndescription: Demo skill two for the gate wiring test.\nlicense: MIT\ncapabilities:\n  - tests\n---\n\n# Demo Beta\n\nBody text.\n',
    },
  ];

  test('every report-only tool exports auditSkills(manifest)', () => {
    assert.equal(typeof auditContextBudget, 'function');
    assert.equal(typeof auditCostLedger, 'function');
    assert.equal(typeof auditSpecCompliance, 'function');
    assert.equal(typeof auditSkillGraph, 'function');
  });

  test('auditSkills drives each report from the manifest without walking the bundle', () => {
    const budget = auditContextBudget(manifest);
    assert.equal(budget.tool, 'context-budget-auditor');
    assert.equal(budget.skillCount, 2);
    assert.ok(budget.totalTokens > 0);

    const spec = auditSpecCompliance(manifest);
    assert.equal(spec.skills, 2);
    assert.equal(spec.status, 'pass');
    assert.equal(spec.errors.length, 0);

    const graphRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-graph-wiring-'));
    try {
      const graph = auditSkillGraph(manifest, { root: graphRoot, save: false });
      assert.equal(graph.nodes, 1, 'platform skills are excluded from the skill graph');
      assert.equal(graph.status, 'dry-run');
    } finally {
      fs.rmSync(graphRoot, { recursive: true, force: true });
    }

    const ledger = auditCostLedger(manifest, { tracesDir: path.join(graphRoot, 'missing-traces') });
    assert.equal(ledger.tool, 'cost-ledger');
    assert.equal(ledger.totalTraces, 0);
    assert.equal(ledger.status, 'pass');
  });
});
