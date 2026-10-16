import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRuntimeManifest,
  collectManifestInputs,
  frontmatterHash,
  manifestFileName,
} from '../scripts/build-runtime-manifests.mjs';
import {
  manifestCoverage,
  manifestInconsistencies,
  validateManifestEntry,
} from '../validate-runtime-manifests.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const SCHEMA_FILE = path.join(REPO_ROOT, 'schema', 'runtime-manifest.schema.json');
const POLICY_FILE = path.join(REPO_ROOT, 'policy', 'tool-risk.yaml');

const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));

// Representative frontmatter, mirroring the values the real skills declare in
// .agents/skills/delivery/review-pr/SKILL.md and
// .agents/skills/platform/quality-gates/gate-ci/SKILL.md. Embedded so the
// derivation test never depends on SKILL.md edits.
const REVIEW_PR_FRONTMATTER = {
  name: 'review-pr',
  category: 'delivery',
  description: 'Review a pull request against the fixed point the user supplies, separating Standards and Spec findings into distinct axes.',
  capabilities: [
    'apply review pr workflow',
    'produce review pr artifact',
    'validate review pr completion criteria',
  ],
  inputs: [
    'fixed point reference (commit, branch, tag, or merge-base)',
    'diff command',
    'originating spec or issue reference',
  ],
  modelTier: 'reasoning',
  promptVersion: '2.0',
  artifactType: 'review',
  approvalRequired: 'true',
  approvalFor: ['post-pr-comment'],
  sideEffects: ['post-pr-comment'],
  risk: 'medium',
  trustTier: '3',
  maxIterations: '6',
};

const GATE_CI_FRONTMATTER = {
  name: 'gate-ci',
  category: 'platform',
  description: 'Shift-left quality gate that runs on push-to-PR events and blocks on failure.',
  capabilities: [
    'apply ci quality gate',
    'run full test suite',
    'produce quality gate artifact',
  ],
  sideEffects: [],
  approvalRequired: 'false',
  approvalFor: [],
  risk: 'medium',
  trustTier: '1',
  maxIterations: '3',
  modelTier: 'fast',
  artifactType: 'plan',
};

const REVIEW_PR_BODY = 'Review the diff, fetch the spec source, and publish findings on the PR.';
const GATE_CI_BODY = 'Executes the full unit suite, integration tests, contract tests, and enforces a coverage threshold.';

function emptySchemasDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-manifest-schemas-'));
}

function buildReviewPr(options = {}) {
  return buildRuntimeManifest(REVIEW_PR_FRONTMATTER, {
    skill: 'delivery/review-pr',
    body: REVIEW_PR_BODY,
    schemasDir: emptySchemasDir(),
    ...options,
  });
}

function buildGateCi(options = {}) {
  return buildRuntimeManifest(GATE_CI_FRONTMATTER, {
    skill: 'platform/quality-gates/gate-ci',
    body: GATE_CI_BODY,
    schemasDir: emptySchemasDir(),
    ...options,
  });
}

test('manifests derived from real fixture frontmatter carry the required fields and validate against the schema', () => {
  const reviewPr = buildReviewPr();
  const gateCi = buildGateCi();

  for (const manifest of [reviewPr, gateCi]) {
    for (const field of ['skill', 'version', 'generatedFrom', 'role', 'execution', 'guardrails']) {
      assert.ok(manifest[field] !== undefined, `manifest for ${manifest.skill} must declare ${field}`);
    }
    assert.equal(manifest.version, 1);
    assert.equal(manifest.generatedFrom, 'frontmatter');
    assert.match(manifest.frontmatterHash, /^[0-9a-f]{64}$/);
    assert.deepEqual(validateManifestEntry(manifest, schema), []);
  }

  // delivery/review-pr: workflow role, mutating side effect, tier-3 agent.
  assert.equal(reviewPr.skill, 'delivery/review-pr');
  assert.equal(reviewPr.role, 'workflow');
  assert.deepEqual(reviewPr.router, { positive: [], negative: [], requiredSignals: [] });
  assert.equal(reviewPr.execution.defaultAgent, 'general');
  assert.equal(reviewPr.execution.isolation, 'worktree');
  assert.equal(reviewPr.execution.maxTurns, 6);
  assert.equal(reviewPr.execution.modelTier, 'reasoning');
  assert.deepEqual(reviewPr.execution.tools.allow, ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']);
  assert.deepEqual(reviewPr.execution.tools.deny, []);
  assert.deepEqual(reviewPr.guardrails.sideEffects, ['post-pr-comment']);
  assert.equal(reviewPr.guardrails.approvalRequired, true);
  assert.deepEqual(reviewPr.guardrails.approvalFor, ['post-pr-comment']);
  assert.equal(reviewPr.guardrails.risk, 'medium');
  assert.equal(reviewPr.guardrails.trustTier, 3);
  assert.deepEqual(reviewPr.verification.commands, ['node .agents/skills/platform/check-all.mjs']);
  assert.equal(reviewPr.verification.artifactSchema, null);
  assert.deepEqual(reviewPr.observability.traceEvents, ['skill.route', 'skill.execute', 'skill.verify']);

  // platform/quality-gates/gate-ci: read-only tier-1 skill on the fast tier.
  assert.equal(gateCi.role, 'workflow');
  assert.equal(gateCi.execution.defaultAgent, 'explore');
  assert.equal(gateCi.execution.isolation, 'none');
  assert.equal(gateCi.execution.maxTurns, 3);
  assert.equal(gateCi.execution.modelTier, 'fast');
  assert.deepEqual(gateCi.execution.tools.allow, ['Read', 'Grep', 'Glob']);
  assert.deepEqual(gateCi.guardrails.sideEffects, []);
  assert.equal(gateCi.guardrails.approvalRequired, false);
  assert.equal(gateCi.guardrails.trustTier, 1);
  assert.deepEqual(gateCi.verification.commands, ['node .agents/skills/platform/check-all.mjs']);
  assert.equal(gateCi.verification.artifactSchema, null);
  assert.deepEqual(validateManifestEntry(gateCi, schema), []);
});

test('manifest coverage over the real bundle is complete and exact', () => {
  const inputs = collectManifestInputs(REPO_ROOT);
  assert.equal(inputs.length, 253);

  const coverage = manifestCoverage(
    inputs.map((input) => ({ skill: input.skill })),
    inputs.map((input) => input.manifest),
  );
  assert.equal(coverage.skills, 253);
  assert.equal(coverage.manifests, 253);
  assert.deepEqual(coverage.missing, []);
  assert.deepEqual(coverage.extra, []);
  assert.equal(coverage.complete, true);

  // One manifest per skill, under the documented file name.
  const fileNames = inputs.map((input) => manifestFileName(input.skill));
  assert.equal(new Set(fileNames).size, inputs.length);
  assert.equal(manifestFileName('delivery/review-pr'), 'delivery-review-pr.runtime.json');

  // A skill without its manifest is reported as missing.
  const partial = manifestCoverage(
    inputs.map((input) => ({ skill: input.skill })),
    inputs.filter((input) => input.skill !== 'delivery/review-pr').map((input) => input.manifest),
  );
  assert.deepEqual(partial.missing, ['delivery/review-pr']);
  assert.equal(partial.complete, false);

  // A manifest without its skill is reported as extra.
  const withOrphan = manifestCoverage(
    inputs.slice(0, 1).map((input) => ({ skill: input.skill })),
    [{ skill: 'routing/wayfinder' }],
  );
  assert.deepEqual(withOrphan.extra, ['routing/wayfinder']);
  assert.equal(withOrphan.complete, false);
});

test('a manifest whose guardrails.risk disagrees with the frontmatter is inconsistent', () => {
  const manifest = buildReviewPr();
  const expected = buildReviewPr();

  const tamperedRisk = {
    ...manifest,
    guardrails: { ...manifest.guardrails, risk: 'low' },
  };
  const riskIssues = manifestInconsistencies(tamperedRisk, expected);
  assert.ok(
    riskIssues.some((issue) => issue.includes('guardrails.risk')),
    `expected a guardrails.risk issue, got: ${riskIssues.join('; ')}`,
  );
  assert.deepEqual(manifestInconsistencies(manifest, expected), []);

  const tamperedTurns = {
    ...manifest,
    execution: { ...manifest.execution, maxTurns: 12 },
  };
  assert.ok(
    manifestInconsistencies(tamperedTurns, expected).some((issue) => issue.includes('execution.maxTurns')),
  );

  const tamperedTier = {
    ...manifest,
    execution: { ...manifest.execution, modelTier: 'fast' },
  };
  assert.ok(
    manifestInconsistencies(tamperedTier, expected).some((issue) => issue.includes('execution.modelTier')),
  );

  const tamperedEffects = {
    ...manifest,
    guardrails: { ...manifest.guardrails, sideEffects: ['write-code'] },
  };
  assert.ok(
    manifestInconsistencies(tamperedEffects, expected).some((issue) => issue.includes('guardrails.sideEffects')),
  );
});

test('the validator rejects a manifest missing a required field', () => {
  const manifest = buildGateCi();

  const missingGuardrails = { ...manifest };
  delete missingGuardrails.guardrails;
  const guardrailErrors = validateManifestEntry(missingGuardrails, schema);
  assert.ok(
    guardrailErrors.some((error) => error.includes('missing required "guardrails"')),
    `expected a missing-required error, got: ${guardrailErrors.join('; ')}`,
  );

  const missingTools = {
    ...manifest,
    execution: { ...manifest.execution, tools: undefined },
  };
  delete missingTools.execution.tools;
  const toolErrors = validateManifestEntry(missingTools, schema);
  assert.ok(
    toolErrors.some((error) => error.includes('missing required "tools"')),
    `expected a missing-required error, got: ${toolErrors.join('; ')}`,
  );

  const extraField = { ...manifest, surprise: true };
  assert.ok(
    validateManifestEntry(extraField, schema).some((error) => error.includes('additional property "surprise"')),
  );

  const badEnum = {
    ...manifest,
    execution: { ...manifest.execution, isolation: 'sandbox' },
  };
  assert.ok(
    validateManifestEntry(badEnum, schema).some((error) => error.includes('not in enum')),
  );

  const badTrustTier = {
    ...manifest,
    guardrails: { ...manifest.guardrails, trustTier: 7 },
  };
  assert.ok(
    validateManifestEntry(badTrustTier, schema).some((error) => error.includes('above maximum 4')),
  );
});

test('tool and guardrail derivation follows the documented rules', () => {
  const writer = buildRuntimeManifest(
    { ...REVIEW_PR_FRONTMATTER, sideEffects: ['write-code'], trustTier: '2' },
    { skill: 'delivery/implement', body: 'Implements the change.', schemasDir: emptySchemasDir() },
  );
  assert.deepEqual(writer.execution.tools.allow, ['Read', 'Grep', 'Glob', 'Edit', 'Write']);
  assert.equal(writer.execution.isolation, 'worktree');
  assert.equal(writer.execution.defaultAgent, 'general');

  const runner = buildRuntimeManifest(
    { ...REVIEW_PR_FRONTMATTER, sideEffects: [], trustTier: '1' },
    { skill: 'qa/qa-automation', body: 'Run the test suite before finishing.', schemasDir: emptySchemasDir() },
  );
  assert.ok(runner.execution.tools.allow.includes('Bash'));
  assert.equal(runner.execution.isolation, 'none');
  assert.equal(runner.execution.defaultAgent, 'explore');

  const risky = buildRuntimeManifest(
    { ...REVIEW_PR_FRONTMATTER, risk: 'high', trustTier: '4', sideEffects: [] },
    { skill: 'routing/ship-subissue', body: 'Fetch the issue tracker data before merging.', schemasDir: emptySchemasDir() },
  );
  assert.deepEqual(risky.execution.tools.deny, ['Bash', 'WebFetch', 'WebSearch']);
  assert.ok(risky.execution.tools.allow.includes('WebFetch'));
  assert.ok(
    manifestInconsistencies(risky, risky).some((issue) => issue.includes('allow and deny lists share')),
    'a self comparison must flag the allow/deny overlap',
  );

  const normalized = buildRuntimeManifest(
    { ...REVIEW_PR_FRONTMATTER, modelTier: 'code' },
    { skill: 'delivery/tdd', body: 'Body.', schemasDir: emptySchemasDir() },
  );
  assert.equal(normalized.execution.modelTier, 'reasoning');

  const defaults = buildRuntimeManifest(
    { name: 'x', sideEffects: [], approvalRequired: 'false', approvalFor: [] },
    { skill: 'auxiliary/execution-policy', body: 'Body.', schemasDir: emptySchemasDir() },
  );
  assert.equal(defaults.role, 'tool');
  assert.equal(defaults.execution.maxTurns, 6);
  assert.equal(defaults.execution.modelTier, 'reasoning');
  assert.equal(defaults.guardrails.risk, 'low');
  assert.equal(defaults.guardrails.trustTier, 1);
  assert.deepEqual(defaults.verification.commands, []);

  const withInputs = buildRuntimeManifest(
    { name: 'x', inputs: ['a fixed point'], artifactType: '', sideEffects: [] },
    { skill: 'routing/grill-me', body: 'Body.', schemasDir: emptySchemasDir() },
  );
  assert.equal(withInputs.role, 'workflow');

  const artifactSchemaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-manifest-artifact-schema-'));
  assert.equal(
    buildRuntimeManifest(
      { name: 'x', artifactType: 'review', sideEffects: [] },
      { skill: 'delivery/review-pr', body: 'Body.', schemasDir: artifactSchemaDir },
    ).verification.artifactSchema,
    null,
    'a missing artifact schema resolves to null',
  );
  fs.writeFileSync(path.join(artifactSchemaDir, 'review-schema.json'), '{}');
  assert.equal(
    buildRuntimeManifest(
      { name: 'x', artifactType: 'review', sideEffects: [] },
      { skill: 'delivery/review-pr', body: 'Body.', schemasDir: artifactSchemaDir },
    ).verification.artifactSchema,
    '.agents/skills/platform/schemas/review-schema.json',
    'an existing artifact schema resolves to its repository-relative path',
  );

  assert.notEqual(
    frontmatterHash({ ...REVIEW_PR_FRONTMATTER, risk: 'high' }),
    frontmatterHash(REVIEW_PR_FRONTMATTER),
    'a changed frontmatter must change the stored hash',
  );
});

test('policy/tool-risk.yaml declares the repo tool inventory and the rule set', () => {
  const text = fs.readFileSync(POLICY_FILE, 'utf8');
  const toolNames = [...text.matchAll(/^ {2}- name: (.+)$/gm)].map((match) => match[1].trim().replace(/^"|"$/g, ''));
  for (const required of [
    'Read', 'Grep', 'Glob', 'LSP', 'Bash', 'PowerShell', 'Edit', 'Write', 'NotebookEdit',
    'WebFetch', 'WebSearch', 'TodoWrite', 'Skill', 'ToolSearch', 'Task', 'Agent',
    'EnterWorktree', 'ExitWorktree', 'Monitor', 'TaskStop', 'SendMessage', 'Artifact',
    'mcp__*', 'github', 'docker',
  ]) {
    assert.ok(toolNames.includes(required), `tool-risk.yaml must declare ${required}`);
  }

  const ruleIds = [...text.matchAll(/^ {2}- id: (.+)$/gm)].map((match) => match[1].trim());
  assert.ok(ruleIds.length >= 5, `expected at least 5 rules, got ${ruleIds.length}`);
  assert.match(text, /defaultTier: deny/);
});
