import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const schemaPath = path.join(root, '.agents', 'skills', 'platform', 'schemas', 'delegation-brief.schema.json');
const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));

// --- Minimal JSON Schema validator for the subset used by delegation-brief.schema.json ---
// No runtime dependency is available in this repo, so the subset is validated directly.

const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
};

const matchesType = (value, type) =>
  Array.isArray(type) ? type.some((t) => matchesType(value, t)) : typeOf(value) === type ||
  (type === 'number' && typeof value === 'number');

function validate(schemaNode, instance, pointer, errors, rootSchema) {
  if (schemaNode === true || schemaNode === undefined) return;
  if (schemaNode === false) {
    errors.push(`${pointer}: schema is false`);
    return;
  }
  if (schemaNode.$ref) {
    const refPath = schemaNode.$ref.replace(/^#\//, '').split('/');
    let target = rootSchema;
    for (const segment of refPath) target = target?.[segment];
    validate(target, instance, pointer, errors, rootSchema);
    return;
  }
  if (schemaNode.type && !matchesType(instance, schemaNode.type)) {
    errors.push(`${pointer}: expected ${JSON.stringify(schemaNode.type)}, got ${typeOf(instance)}`);
    return;
  }
  if (schemaNode.const !== undefined && JSON.stringify(instance) !== JSON.stringify(schemaNode.const)) {
    errors.push(`${pointer}: expected const ${JSON.stringify(schemaNode.const)}`);
  }
  if (schemaNode.enum && !schemaNode.enum.some((v) => JSON.stringify(v) === JSON.stringify(instance))) {
    errors.push(`${pointer}: ${JSON.stringify(instance)} not in enum`);
  }
  if (typeof instance === 'string') {
    if (schemaNode.minLength !== undefined && instance.length < schemaNode.minLength) {
      errors.push(`${pointer}: shorter than minLength ${schemaNode.minLength}`);
    }
    if (schemaNode.pattern && !new RegExp(schemaNode.pattern).test(instance)) {
      errors.push(`${pointer}: does not match pattern ${schemaNode.pattern}`);
    }
  }
  if (typeof instance === 'number' && schemaNode.minimum !== undefined && instance < schemaNode.minimum) {
    errors.push(`${pointer}: below minimum ${schemaNode.minimum}`);
  }
  if (Array.isArray(instance)) {
    if (schemaNode.minItems !== undefined && instance.length < schemaNode.minItems) {
      errors.push(`${pointer}: fewer than minItems ${schemaNode.minItems}`);
    }
    instance.forEach((item, index) => {
      if (schemaNode.items) validate(schemaNode.items, item, `${pointer}/${index}`, errors, rootSchema);
    });
  }
  if (instance && typeof instance === 'object') {
    for (const key of schemaNode.required ?? []) {
      if (instance[key] === undefined) errors.push(`${pointer}: missing required "${key}"`);
    }
    for (const [key, value] of Object.entries(instance)) {
      const childSchema = schemaNode.properties?.[key];
      if (childSchema === undefined && schemaNode.additionalProperties === false) {
        errors.push(`${pointer}: additional property "${key}" not allowed`);
        continue;
      }
      if (childSchema) validate(childSchema, value, `${pointer}/${key}`, errors, rootSchema);
    }
    if (schemaNode.if) {
      const branchErrors = [];
      validate(schemaNode.if, instance, `${pointer} (if)`, branchErrors, rootSchema);
      if (branchErrors.length === 0 && schemaNode.then) {
        validate(schemaNode.then, instance, `${pointer} (then)`, errors, rootSchema);
      }
    }
    for (const sub of schemaNode.allOf ?? []) {
      validate(sub, instance, `${pointer} (allOf)`, errors, rootSchema);
    }
    for (const keyword of ['anyOf', 'oneOf']) {
      if (!schemaNode[keyword]) continue;
      const passing = schemaNode[keyword].filter((sub) => {
        const subErrors = [];
        validate(sub, instance, pointer, subErrors, rootSchema);
        return subErrors.length === 0;
      });
      if (passing.length === 0) {
        errors.push(`${pointer}: matches none of ${keyword} branches`);
      } else if (keyword === 'oneOf' && passing.length > 1) {
        errors.push(`${pointer}: matches ${passing.length} oneOf branches`);
      }
    }
  }
}

function validateAgainst(instance, ref) {
  const errors = [];
  validate({ $ref: ref }, instance, '$', errors, schema);
  return errors;
}

const briefRef = '#/$defs/DelegationBrief';
const verdictRef = '#/$defs/DelegationVerdict';

const validBrief = () => ({
  briefId: 'brief-silicon-exposure',
  objective: 'List the clauses in contracts/silicon-*.pdf exposed to a 12-week lead-time increase, one row per clause.',
  outputFormat: 'artifact-reference',
  toolGuidance: 'Read only contracts/ and data/leadtimes.csv; record "none" where a contract has no lead-time clause.',
  boundaries: [
    'Do not read news, analyst reports, or anything outside contracts/ and data/.',
    'Do not recommend a renegotiation strategy.',
  ],
  stopCondition: 'Every file matching contracts/silicon-*.pdf has a row or an explicit none.',
  effortBudget: { maxToolCalls: 40, maxSubagents: 1, maxMinutes: 20 },
  contextIsolation: 'isolated',
  readOnly: true,
  sources: ['contracts/', 'data/leadtimes.csv'],
  expectedArtifactPath: 'findings/silicon-exposure.md',
});

const validVerdict = () => ({
  briefId: 'brief-silicon-exposure',
  status: 'pass',
  criteria: [
    { id: 'row-per-contract', description: 'One row per silicon contract', met: true, evidence: 'findings/silicon-exposure.md:3-9 covers 6 of 6 contracts' },
    { id: 'no-external-sources', description: 'Only contracts/ and data/ were read', met: true, evidence: 'tool log shows 11 reads, all within the two paths' },
  ],
  negativeTestsRun: 2,
  fullSuiteRun: true,
  artifactMutating: false,
  summary: 'All 6 silicon contracts carry a lead-time clause; one is exposed to a 12-week slip. Detail in the artifact.',
  artifactRef: '.agents/skills/platform/artifacts/verify-delegation/brief-silicon-exposure.json',
  tokensUsed: 21500,
  durationMs: 184000,
});

const MUTATING_EFFECT = (effect) => effect.startsWith('write-') && effect !== 'write-temp-file';

// Mirrors the verify-delegation rule: a readOnly:false brief is only accepted when the invoking
// skill declares a mutating side effect.
function invokerAccepts(brief, sideEffects) {
  if (brief.readOnly !== false) return { accepted: true, reason: 'read-only brief' };
  if (!sideEffects.some(MUTATING_EFFECT)) {
    return { accepted: false, reason: 'readOnly:false requires the invoking skill to declare a mutating sideEffect' };
  }
  return { accepted: true, reason: 'mutating side effect declared' };
}

test('schema parses and exposes both definitions', () => {
  assert.equal(schema.title, 'Delegation Brief and Verification Verdict');
  for (const ref of [briefRef, verdictRef]) assert.ok(schema.$defs[ref.replace('#/$defs/', '')]);
});

test('a valid delegation brief validates', () => {
  assert.deepEqual(validateAgainst(validBrief(), briefRef), []);
});

test('a valid delegation verdict validates', () => {
  assert.deepEqual(validateAgainst(validVerdict(), verdictRef), []);
});

test('a brief missing boundaries fails', () => {
  const brief = validBrief();
  delete brief.boundaries;
  const errors = validateAgainst(brief, briefRef);
  assert.ok(errors.some((e) => e.includes('missing required "boundaries"')), errors.join('; '));
});

test('an empty boundaries array fails', () => {
  const errors = validateAgainst({ ...validBrief(), boundaries: [] }, briefRef);
  assert.ok(errors.some((e) => e.includes('minItems 1')), errors.join('; '));
});

test('a brief missing stopCondition fails', () => {
  const brief = validBrief();
  delete brief.stopCondition;
  const errors = validateAgainst(brief, briefRef);
  assert.ok(errors.some((e) => e.includes('missing required "stopCondition"')), errors.join('; '));
});

test('an unknown outputFormat value fails', () => {
  const errors = validateAgainst({ ...validBrief(), outputFormat: 'transcript' }, briefRef);
  assert.ok(errors.some((e) => e.includes('not in enum')), errors.join('; '));
});

test('additional properties on a brief fail', () => {
  const errors = validateAgainst({ ...validBrief(), workerNotes: 'plan narrative' }, briefRef);
  assert.ok(errors.some((e) => e.includes('additional property "workerNotes"')), errors.join('; '));
});

test('a readOnly:false brief is rejected when the invoker declares no mutating side effect', () => {
  const brief = { ...validBrief(), readOnly: false };
  assert.deepEqual(validateAgainst(brief, briefRef), []);
  const rejected = invokerAccepts(brief, ['write-temp-file']);
  assert.equal(rejected.accepted, false);
  assert.match(rejected.reason, /mutating sideEffect/);
});

test('a readOnly:false brief is accepted when the invoker declares a mutating side effect', () => {
  const brief = { ...validBrief(), readOnly: false };
  const accepted = invokerAccepts(brief, ['write-temp-file', 'write-code']);
  assert.equal(accepted.accepted, true);
});

test('a verdict pass without the full suite fails', () => {
  const errors = validateAgainst({ ...validVerdict(), fullSuiteRun: false }, verdictRef);
  assert.ok(errors.length > 0, 'schema must reject an early-victory pass');
});

test('a verdict pass over a mutating artifact without negative tests fails', () => {
  const errors = validateAgainst({ ...validVerdict(), artifactMutating: true, negativeTestsRun: 0 }, verdictRef);
  assert.ok(errors.length > 0, 'schema must reject a mutating pass with no negative tests');
});

test('a mutating pass with negative tests validates', () => {
  const verdict = { ...validVerdict(), artifactMutating: true, negativeTestsRun: 1 };
  assert.deepEqual(validateAgainst(verdict, verdictRef), []);
});

test('a verdict criterion without evidence fails', () => {
  const verdict = validVerdict();
  delete verdict.criteria[0].evidence;
  const errors = validateAgainst(verdict, verdictRef);
  assert.ok(errors.some((e) => e.includes('missing required "evidence"')), errors.join('; '));
});

test('an empty criteria array fails', () => {
  const errors = validateAgainst({ ...validVerdict(), criteria: [] }, verdictRef);
  assert.ok(errors.some((e) => e.includes('minItems 1')), errors.join('; '));
});

// Wave-1 traceability added `clauses` and `reloadPolicy` to the frontmatter of these
// files while the bodies themselves were edited, wave-2 added the spec-portable
// `license` field to every skill in the bundle, and the duplicate-fixture cleanup
// repointed `fixturesPath` on subagent-swarm to the canonical fixture file. Those
// keys are the sanctioned exception; every other frontmatter field must stay
// byte-identical.
const frontmatterExceptions = ['clauses', 'reloadPolicy', 'license', 'fixturesPath'];

// A key line plus its block: the "key:" line and every indented continuation or
// list item that belongs to it, up to the next top-level frontmatter key.
const isTopLevelKey = (line) => /^[A-Za-z][A-Za-z0-9-]*:/.test(line);

const frontmatterWithout = (text, keys) => {
  const lines = text.slice(0, text.indexOf('\n---', 3) + 4).split('\n');
  const kept = [];
  let skipping = false;
  for (const line of lines) {
    if (line === '---') { skipping = false; kept.push(line); continue; }
    if (isTopLevelKey(line)) skipping = keys.some((key) => line.startsWith(`${key}:`));
    if (!skipping) kept.push(line);
  }
  return kept.join('\n');
};

// A pinned baseline commit is reachable only when the checkout carries full history
// (actions/checkout@v4 with fetch-depth: 0); shallow clones skip instead of failing.
const commitReachable = (rev) => {
  try {
    execFileSync('git', ['cat-file', '-e', rev + '^{commit}'], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
test('the body-only skills kept their frontmatter untouched', async (t) => {
  // The baseline is pinned to the wave-0 integration commit rather than HEAD: the
  // wave-1 delegation work is now committed on main, so a HEAD-based baseline
  // would compare the files against themselves and the guard would pass vacuously.
  // Pinning keeps the guard meaningful for every later commit.
  const wave0Baseline = '6934cfd489253ae3e92c2849bd53ab03deacad79';
  if (!commitReachable(wave0Baseline)) {
    t.skip(`wave-0 baseline ${wave0Baseline} is unreachable in this checkout (shallow clone) — frontmatter guard skipped`);
    return;
  }
  const bodyOnlySkills = [
    '.agents/skills/foundation/subagent-swarm/SKILL.md',
    '.agents/skills/delivery/code-review/SKILL.md',
    '.agents/skills/project/project-viability/references/subagent-prompts.md',
  ];
  const head = (file) =>
    execFileSync('git', ['show', `${wave0Baseline}:${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  for (const file of bodyOnlySkills) {
    const current = await fs.readFile(path.join(root, file), 'utf8');
    const baseline = head(file);
    assert.ok(baseline.length > 0, `${file}: baseline commit ${wave0Baseline} must be reachable`);
    assert.equal(
      frontmatterWithout(current, frontmatterExceptions),
      frontmatterWithout(baseline, frontmatterExceptions),
      `${file}: frontmatter must not change (outside ${frontmatterExceptions.join(' and ')})`,
    );
    assert.notEqual(current, baseline, `${file}: body-only edit expected a change`);
  }
});

test('the new skill declares its lock-able identity and schema path', async () => {
  const skill = await fs.readFile(path.join(root, '.agents/skills/foundation/verify-delegation/SKILL.md'), 'utf8');
  const fm = skill.slice(0, skill.indexOf('\n---', 3));
  for (const field of ['name: "verify-delegation"', 'category: "foundation"', 'artifactType: "agent"', 'risk: "low"', 'trustTier: "2"']) {
    assert.ok(fm.includes(field), `frontmatter must declare ${field}`);
  }
  for (const section of ['## Contract', '## Provenance', '## Artifact', '## Why', '## Rules', '## Workflow', '## Guardrails', '## Completion criteria']) {
    assert.ok(skill.includes(section), `SKILL.md must declare ${section}`);
  }
  assert.ok(skill.includes('@include .agents/skills/platform/contract-base.xml'));
  assert.ok(skill.includes('references/verify-protocol.md'));
  const ref = await fs.readFile(path.join(root, '.agents/skills/foundation/verify-delegation/references/verify-protocol.md'), 'utf8');
  for (const citation of ['anthropic.com/engineering/multi-agent-research-system', 'claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them', 'arXiv:2605.00914']) {
    assert.ok(ref.includes(citation), `reference must cite ${citation}`);
  }
});
