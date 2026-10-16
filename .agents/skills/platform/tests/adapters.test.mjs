import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateAdapters, renderRootReadme, RUNTIMES } from '../scripts/generate-adapters.mjs';
import { parseFrontmatter } from '../skill-graph.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', 'scripts', 'generate-adapters.mjs');

// Synthetic bundle records: the same shape collectSkills() plus parseFrontmatter
// produce, so the pure function is exercised exactly the way the CLI feeds it.
// Embedded here so the test never depends on SKILL.md edits.
const SKILLS = [
  {
    name: 'alpha-workflow',
    domain: 'test',
    description: 'Do the alpha workflow end to end.',
    capabilities: ['apply alpha workflow', 'produce alpha artifact'],
    path: '.agents/skills/test/alpha-workflow',
    body: '## Contract\n\n- Input: alpha inputs.\n\n## Process\n\n1. Read the inputs.\n2. Produce the alpha artifact.\n3. Validate the alpha artifact.\n',
    frontmatter: {
      name: 'alpha-workflow',
      description: 'Do the alpha workflow end to end.',
      capabilities: ['apply alpha workflow', 'produce alpha artifact'],
      stopCondition: 'Alpha artifact produced and validated.',
      risk: 'low',
      trustTier: '1',
      modelTier: 'reasoning',
      artifactType: 'test-strategy',
      sideEffects: [],
    },
  },
  {
    name: 'beta-mutator',
    domain: 'test',
    description: 'Mutate the working tree for the beta flow.',
    capabilities: ['apply beta workflow'],
    path: '.agents/skills/test/beta-mutator',
    body: '## Steps\n\n1. Edit the beta files.\n2. Run the beta checks.\n',
    frontmatter: {
      name: 'beta-mutator',
      description: 'Mutate the working tree for the beta flow.',
      capabilities: ['apply beta workflow'],
      stopCondition: 'Beta files mutated and checked.',
      risk: 'medium',
      trustTier: '3',
      modelTier: 'reasoning',
      sideEffects: ['write-code'],
    },
  },
  {
    name: 'gamma-critical',
    domain: 'test',
    description: 'Merge and close the gamma subissue.',
    capabilities: ['apply gamma workflow'],
    path: '.agents/skills/test/gamma-critical',
    body: '## Process\n\n1. Merge the gamma pull request.\n2. Close the gamma issue.\n',
    frontmatter: {
      name: 'gamma-critical',
      description: 'Merge and close the gamma subissue.',
      capabilities: ['apply gamma workflow'],
      stopCondition: 'Gamma subissue merged and closed.',
      risk: 'high',
      trustTier: '4',
      approvalRequired: 'true',
      modelTier: 'router',
      sideEffects: ['merge-pull-request', 'close-issue'],
    },
  },
  {
    name: 'delta-fast',
    domain: 'test',
    description: 'Fast delta helper.',
    capabilities: ['apply delta helper'],
    path: '.agents/skills/test/delta-fast',
    body: '## Process\n\n1. Answer the delta question.\n',
    frontmatter: {
      name: 'delta-fast',
      description: 'Fast delta helper.',
      capabilities: ['apply delta helper'],
      stopCondition: 'Delta answer returned.',
      risk: 'low',
      trustTier: '1',
      modelTier: 'fast',
      sideEffects: [],
    },
  },
  {
    name: 'epsilon-router',
    domain: 'test',
    description: 'Route the epsilon request.',
    capabilities: ['apply epsilon routing'],
    path: '.agents/skills/test/epsilon-router',
    body: '## Workflow\n\n1. Route the epsilon request.\n',
    frontmatter: {
      name: 'epsilon-router',
      description: 'Route the epsilon request.',
      capabilities: ['apply epsilon routing'],
      stopCondition: 'Epsilon request routed.',
      risk: 'low',
      trustTier: '2',
      modelTier: 'router',
      sideEffects: [],
    },
  },
];

const MANIFESTS = SKILLS.map((skill) => ({
  skill: `test/${skill.name}`,
  role: 'workflow',
  execution: {
    defaultAgent: 'general',
    isolation: 'none',
    maxTurns: 6,
    modelTier: skill.frontmatter.modelTier,
    tools: { allow: ['Read', 'Grep', 'Glob'], deny: [] },
  },
  guardrails: {
    sideEffects: skill.frontmatter.sideEffects,
    approvalRequired: skill.frontmatter.approvalRequired === 'true',
    approvalFor: [],
    risk: skill.frontmatter.risk,
    trustTier: Number(skill.frontmatter.trustTier),
  },
  verification: { commands: [], artifactSchema: null },
  observability: { traceEvents: ['skill.route', 'skill.execute', 'skill.verify'] },
}));

// gamma-critical is approval-gated, so it may keep Bash in its allow-list; the
// eta skill is trustTier 4 without approvalRequired, so Bash must be stripped.
const BASH_MANIFEST = (skill, extra) => ({
  ...MANIFESTS.find((manifest) => manifest.skill === `test/${skill}`),
  execution: {
    defaultAgent: 'general',
    isolation: 'none',
    maxTurns: 6,
    modelTier: 'reasoning',
    tools: { allow: ['Read', 'Grep', 'Glob', 'Bash'], deny: [] },
  },
  ...extra,
});

function entries(generated, runtime) {
  return generated[runtime] ?? [];
}

function findEntry(generated, runtime, suffix) {
  const entry = entries(generated, runtime).find((candidate) => candidate.path.endsWith(suffix));
  assert.ok(entry, `no ${runtime} adapter for ${suffix}`);
  return entry;
}

describe('generateAdapters (pure projection)', () => {
  const generated = generateAdapters(SKILLS, MANIFESTS);

  test('every runtime is projected', () => {
    assert.deepEqual(Object.keys(generated).sort(), [...RUNTIMES].sort());
    for (const runtime of RUNTIMES) {
      if (runtime === 'mcp') {
        // mcp is a single bundle-wide manifest, not one file per skill.
        assert.equal(entries(generated, 'mcp').length, 2, 'mcp emits the manifest plus its README');
        continue;
      }
      assert.equal(entries(generated, runtime).length, SKILLS.length + 1, `${runtime} emits one adapter per skill plus its README`);
    }
  });

  test('claude agents carry parseable frontmatter with name, description, tools', () => {
    for (const skill of SKILLS) {
      const entry = findEntry(generated, 'claude', `${skill.domain}-${skill.name}.md`);
      assert.ok(entry.content.startsWith('---\n'), 'claude agent must open with frontmatter');
      const fm = parseFrontmatter(entry.content);
      assert.equal(fm.name, skill.name, `claude agent name for ${skill.name}`);
      assert.ok(typeof fm.description === 'string' && fm.description.length > 0, `claude agent description for ${skill.name}`);
      assert.ok(fm.description.length <= 200, 'claude agent description truncated to 200 chars');
      assert.ok(typeof fm.tools === 'string' && fm.tools.includes('Read'), `claude agent tools for ${skill.name}`);
      assert.ok(typeof fm.model === 'string', `claude agent model for ${skill.name}`);
    }
  });

  test('claude model derives from the manifest modelTier', () => {
    const models = Object.fromEntries(SKILLS.map((skill) => {
      const entry = findEntry(generated, 'claude', `${skill.domain}-${skill.name}.md`);
      return [skill.name, parseFrontmatter(entry.content).model];
    }));
    assert.equal(models['alpha-workflow'], 'opus');
    assert.equal(models['delta-fast'], 'haiku');
    assert.equal(models['epsilon-router'], 'sonnet');
  });

  test('claude agent denies Bash for risk high skills', () => {
    const entry = findEntry(generated, 'claude', 'test-gamma-critical.md');
    const fm = parseFrontmatter(entry.content);
    assert.equal(fm.disallowedTools, 'Bash');
  });

  test('claude agent sets permissionMode default for mutating side effects', () => {
    const mutator = parseFrontmatter(findEntry(generated, 'claude', 'test-beta-mutator.md').content);
    assert.equal(mutator.permissionMode, 'default');
    const workflow = parseFrontmatter(findEntry(generated, 'claude', 'test-alpha-workflow.md').content);
    assert.equal(workflow.permissionMode, undefined, 'non-mutating skill must not declare a permission mode');
  });

  test('Bash is stripped for trustTier >= 4 without approvalRequired and kept when approval-gated', () => {
    const noApproval = generateAdapters(SKILLS, [
      ...MANIFESTS,
      BASH_MANIFEST('delta-fast', {
        guardrails: { sideEffects: [], approvalRequired: false, approvalFor: [], risk: 'low', trustTier: 4 },
      }),
    ]);
    const stripped = findEntry(noApproval, 'claude', 'test-delta-fast.md');
    assert.ok(!parseFrontmatter(stripped.content).tools.includes('Bash'), 'trustTier 4 without approval must not carry Bash');

    const approvalGated = generateAdapters(SKILLS, [
      ...MANIFESTS.map((manifest) => (manifest.skill === 'test/gamma-critical'
        ? BASH_MANIFEST('gamma-critical')
        : manifest)),
    ]);
    const kept = findEntry(approvalGated, 'claude', 'test-gamma-critical.md');
    assert.ok(parseFrontmatter(kept.content).tools.includes('Bash'), 'approval-gated high-trust skill keeps Bash');
  });

  test('openai agent manifests parse with name, instructions, runtime.role', () => {
    for (const skill of SKILLS) {
      const entry = findEntry(generated, 'openai-agents', `${skill.name}.json`);
      const manifest = JSON.parse(entry.content);
      assert.equal(manifest.name, skill.name);
      assert.ok(manifest.instructions.includes(skill.description), 'instructions carry the skill description');
      assert.ok(manifest.instructions.includes(skill.capabilities[0]), 'instructions carry the capabilities');
      assert.equal(manifest.runtime.role, 'workflow');
      assert.equal(typeof manifest.runtime.maxTurns, 'number');
      assert.equal(manifest.runtime.isolation, 'none');
      assert.deepEqual(manifest.tools, []);
      assert.deepEqual(manifest.guardrails, { input: [], output: [] });
      assert.equal(manifest.handoff_description, skill.frontmatter.stopCondition);
    }
  });

  test('openai model derives from the manifest modelTier', () => {
    const models = Object.fromEntries(SKILLS.map((skill) => {
      const entry = findEntry(generated, 'openai-agents', `${skill.name}.json`);
      return [skill.name, JSON.parse(entry.content).model];
    }));
    assert.equal(models['delta-fast'], 'gpt-5-mini');
    assert.equal(models['alpha-workflow'], 'gpt-5');
    assert.equal(models['epsilon-router'], 'gpt-5.1');
  });

  test('langgraph workflows declare nodes, edges, and connected metadata', () => {
    for (const skill of SKILLS) {
      const entry = findEntry(generated, 'langgraph', `${skill.name}.yaml`);
      const content = entry.content;
      assert.match(content, /^name: /m);
      assert.match(content, /^kind: workflow$/m);
      assert.match(content, /^nodes:$/m);
      assert.match(content, /^edges:$/m);
      assert.match(content, /^metadata:$/m);
      const nodeIds = [...content.matchAll(/^\s+- id:\s*(\S+)$/gm)].map((match) => match[1]);
      assert.deepEqual(nodeIds, ['intake', 'context_pack', 'execute', 'verify', 'report']);
      const edges = [...content.matchAll(/\{from:\s*(\S+),\s*to:\s*(\S+)\}/g)].map((match) => [match[1], match[2]]);
      assert.equal(edges.length, 4);
      for (const [from, to] of edges) {
        assert.ok(nodeIds.includes(from), `edge source ${from} must be a declared node`);
        assert.ok(nodeIds.includes(to), `edge target ${to} must be a declared node`);
      }
      assert.match(content, new RegExp(`^\\s+skill: test/${skill.name}$`, 'm'));
      assert.match(content, new RegExp(`^\\s+risk: ${skill.frontmatter.risk}$`, 'm'));
      assert.match(content, new RegExp(`^\\s+trustTier: ${skill.frontmatter.trustTier}$`, 'm'));
    }
  });

  test('openhands automations declare trigger, runtime, steps, and policy', () => {
    for (const skill of SKILLS) {
      const entry = findEntry(generated, 'openhands', `${skill.name}.yaml`);
      assert.match(entry.content, /^trigger:$/m);
      assert.match(entry.content, /^\s+type: webhook$/m);
      assert.match(entry.content, /^\s+events: \[pull_request\.opened, issues\.opened\]$/m);
      assert.match(entry.content, /^runtime:$/m);
      assert.match(entry.content, new RegExp(`^\\s+- uses: skill/test-${skill.name}$`, 'm'));
      assert.match(entry.content, /^policy:$/m);
      const expectedApproval = skill.frontmatter.approvalRequired === 'true';
      assert.match(entry.content, new RegExp(`^\\s+approvalRequired: ${expectedApproval}$`, 'm'));
    }
  });

  test('cursor rules open with description and alwaysApply frontmatter', () => {
    for (const skill of SKILLS) {
      const entry = findEntry(generated, 'cursor', `${skill.name}.mdc`);
      assert.ok(entry.content.startsWith('---\n'), 'cursor rule must open with frontmatter');
      const fm = parseFrontmatter(entry.content);
      assert.equal(fm.description, skill.description);
      assert.deepEqual(fm.globs, []);
      assert.equal(fm.alwaysApply, 'false');
      assert.ok(entry.content.includes(skill.capabilities[0]), 'rule body derives from capabilities');
      assert.ok(entry.content.includes(skill.frontmatter.stopCondition), 'rule body carries the stop condition');
    }
  });

  test('kilo commands carry a description and a numbered workflow', () => {
    for (const skill of SKILLS) {
      const entry = findEntry(generated, 'kilo', `${skill.domain}-${skill.name}.md`);
      const fm = parseFrontmatter(entry.content);
      assert.equal(fm.description, skill.description);
      assert.match(entry.content, /^## Workflow$/m);
      const numbered = [...entry.content.matchAll(/^(\d+)\.\s+(.+)$/gm)].map((match) => match[2]);
      assert.ok(numbered.length >= 1, 'at least one workflow step');
    }
  });

  test('mcp manifest exposes trustTier <= 3 and gates trustTier >= 4', () => {
    const entry = findEntry(generated, 'mcp', 'manifest.json');
    const manifest = JSON.parse(entry.content);
    assert.equal(manifest.schemaVersion, '1.0');
    assert.equal(manifest.server.name, 'skill-lab');
    assert.equal(manifest.server.protocolVersion, '2024-11-05');
    assert.equal(manifest.skills.length, SKILLS.length);
    const byName = Object.fromEntries(manifest.skills.map((skill) => [skill.skill, skill]));
    for (const skill of SKILLS) {
      const record = byName[`test/${skill.name}`];
      assert.equal(record.trustTier, Number(skill.frontmatter.trustTier));
      assert.deepEqual(record.tools, ['get_skill']);
      assert.deepEqual(record.resources, [`skill://skill/test/${skill.name}`]);
      assert.deepEqual(record.prompts, ['use_skill']);
      const expected = Number(skill.frontmatter.trustTier) >= 4 ? false : true;
      assert.equal(record.exposed, expected, `${skill.name} exposure`);
      if (!expected) assert.equal(record.reason, 'trustTier>3');
      else assert.equal(record.reason, undefined);
    }
    assert.equal(byName['test/gamma-critical'].exposed, false);
  });

  test('allowHighTrust exposes trustTier >= 4 skills', () => {
    const generatedHighTrust = generateAdapters(SKILLS, MANIFESTS, { allowHighTrust: true });
    const manifest = JSON.parse(findEntry(generatedHighTrust, 'mcp', 'manifest.json').content);
    assert.ok(manifest.skills.every((skill) => skill.exposed === true));
  });

  test('a skill without a manifest still gets adapters from frontmatter defaults', () => {
    const orphan = {
      name: 'zeta-orphan',
      domain: 'test',
      description: 'Orphan skill without a runtime manifest.',
      capabilities: ['apply zeta orphan workflow'],
      path: '.agents/skills/test/zeta-orphan',
      body: '## Process\n\n1. Run the orphan step.\n',
      frontmatter: {
        name: 'zeta-orphan',
        description: 'Orphan skill without a runtime manifest.',
        capabilities: ['apply zeta orphan workflow'],
        stopCondition: 'Orphan step executed.',
        risk: 'medium',
        trustTier: '2',
        modelTier: 'reasoning',
        sideEffects: ['post-pr-comment'],
      },
    };
    const generatedOrphan = generateAdapters([orphan], []);
    const entry = findEntry(generatedOrphan, 'claude', 'test-zeta-orphan.md');
    const fm = parseFrontmatter(entry.content);
    assert.equal(fm.tools, 'Read, Grep, Glob', 'manifest defaults to the base tool set');
    assert.equal(fm.permissionMode, 'default');
    const mcp = JSON.parse(findEntry(generatedOrphan, 'mcp', 'manifest.json').content);
    assert.equal(mcp.skills.length, 1);
    assert.equal(mcp.skills[0].exposed, true);
  });

  test('no adapter repeats a name inside a runtime', () => {
    for (const runtime of RUNTIMES) {
      const names = entries(generated, runtime).map((entry) => path.basename(entry.path));
      assert.equal(new Set(names).size, names.length, `duplicate adapter name inside ${runtime}`);
    }
    for (const runtime of ['claude', 'openai-agents', 'langgraph', 'openhands', 'cursor']) {
      const names = entries(generated, runtime)
        .filter((entry) => !entry.path.endsWith('README.md'))
        .map((entry) => (runtime === 'claude' ? parseFrontmatter(entry.content).name : path.basename(entry.path).replace(/\.[^.]+$/, '')));
      assert.equal(new Set(names).size, names.length, `duplicate skill name inside ${runtime}`);
    }
  });

  test('generation is deterministic', () => {
    const again = generateAdapters(SKILLS, MANIFESTS);
    assert.deepEqual(again, generated);
  });

  test('every runtime emits a README and the root README documents the matrix', () => {
    for (const runtime of RUNTIMES) {
      const readme = entries(generated, runtime).find((entry) => entry.path.endsWith('README.md'));
      assert.ok(readme, `${runtime} README missing`);
      assert.ok(readme.content.includes('generated'), `${runtime} README must state it is generated`);
    }
    const root = renderRootReadme();
    for (const runtime of ['claude', 'kilo', 'openai-agents', 'langgraph', 'openhands', 'cursor']) {
      assert.ok(root.includes(runtime), `root README documents ${runtime}`);
    }
    assert.ok(root.includes('mcp/manifest.json'), 'root README documents the MCP surface');
    assert.ok(root.includes('Do not edit'), 'root README warns against hand edits');
  });
});

describe('generate-adapters.mjs CLI', () => {
  const tmpRoots = [];

  function makeRepo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-adapters-'));
    tmpRoots.push(root);
    for (const skill of SKILLS) {
      const dir = path.join(root, skill.path);
      fs.mkdirSync(dir, { recursive: true });
      const fm = Object.entries(skill.frontmatter).map(([key, value]) => (
        Array.isArray(value) ? `${key}: [${value.join(', ')}]` : `${key}: ${value}`
      )).join('\n');
      fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\n${fm}\n---\n\n${skill.body}`);
    }
    const manifestsDir = path.join(root, '.agents', 'skills', 'platform', 'manifests');
    fs.mkdirSync(manifestsDir, { recursive: true });
    for (const manifest of MANIFESTS) {
      fs.writeFileSync(
        path.join(manifestsDir, manifest.skill.replace('/', '-') + '.runtime.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
    }
    return root;
  }

  function run(args, cwd) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  }

  test('--help exits 0', () => {
    const result = run(['--help'], process.cwd());
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--write/);
  });

  test('dry run writes nothing, --write regenerates byte-identically', () => {
    const root = makeRepo();
    const adaptersDir = path.join(root, '.agents', 'skills', 'platform', 'adapters');

    const dry = run(['--json'], root);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(fs.existsSync(adaptersDir), false, 'dry run must not create the adapters tree');
    const dryReport = JSON.parse(dry.stdout);
    assert.equal(dryReport.mode, 'dry-run');
    assert.equal(dryReport.skills, SKILLS.length);
    // Six runtimes emit one file per skill, every runtime emits one README, and
    // mcp emits a single bundle-wide manifest.
    assert.equal(dryReport.adapters, SKILLS.length * (RUNTIMES.length - 1) + RUNTIMES.length + 1);

    const write = run(['--write', '--json'], root);
    assert.equal(write.status, 0, write.stderr);
    const writeReport = JSON.parse(write.stdout);
    assert.equal(writeReport.mode, 'write');
    assert.equal(writeReport.pruned, 0);

    const snapshot = (dir) => {
      const out = {};
      const walk = (current, prefix) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
          const target = path.join(current, entry.name);
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) walk(target, rel);
          else out[rel] = fs.readFileSync(target, 'utf8');
        }
      };
      walk(dir, '');
      return out;
    };
    const first = snapshot(adaptersDir);
    assert.ok(Object.keys(first).length > 0, 'write mode must produce files');

    // A stale file must be pruned on the next full run.
    fs.writeFileSync(path.join(adaptersDir, 'cursor', 'rules', 'stale-rule.mdc'), 'stale\n');
    const second = run(['--write', '--json'], root);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(fs.existsSync(path.join(adaptersDir, 'cursor', 'rules', 'stale-rule.mdc')), false, 'stale files are pruned');
    assert.equal(JSON.parse(second.stdout).pruned, 1);
    assert.deepEqual(snapshot(adaptersDir), first, 'regeneration is byte-identical');
  });

  test('--skill skips the bundle-wide mcp manifest, unknown input exits 2', () => {
    const root = makeRepo();
    const skills = run(['--skill', 'test/alpha-workflow', '--json'], root);
    assert.equal(skills.status, 0, skills.stderr);
    const report = JSON.parse(skills.stdout);
    assert.equal(report.skills, 1);
    assert.ok(!report.runtimes.includes('mcp'), 'skill-filtered runs skip the mcp manifest');
    assert.equal(report.skipped[0].runtime, 'mcp');

    const unknownSkill = run(['--skill', 'test/nope'], root);
    assert.equal(unknownSkill.status, 2);
    assert.match(unknownSkill.stderr, /no bundle skill matches/);

    const unknownRuntime = run(['--runtime', 'nope'], root);
    assert.equal(unknownRuntime.status, 2);
    assert.match(unknownRuntime.stderr, /unknown runtime/);

    for (const tmpRoot of tmpRoots) fs.rmSync(tmpRoot, { recursive: true, force: true });
    tmpRoots.length = 0;
  });
});
