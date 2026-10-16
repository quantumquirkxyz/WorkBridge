#!/usr/bin/env node
// check-tool-risk-policy.mjs - cross-checks policy/tool-risk.yaml against the
// skill bundle. Every skill in the bundle (the platform domain is excluded, it
// is tooling and not a shippable skill) is mapped onto the tools it may use,
// and the policy rules are evaluated against that mapping.
//
// Tool model per skill:
//   1. .agents/skills/platform/manifests/<domain>-<skill>.runtime.json, field
//      execution.tools.allow, when that manifest exists (authoritative).
//   2. Otherwise a conservative derivation from the skill's own frontmatter and
//      body - see deriveAllowedTools(). The derivation over-approximates on
//      purpose: an audit that under-declares a tool would hide the risk.
//
// Rule implementations are matched by rule id first and by the policy's own
// `check` kind second, so a policy file that renames a rule id keeps working as
// long as its `check` kind stays the same. A rule with no implementation is
// reported as an unverified warning instead of being silently dropped.
//
// Severity vocabulary: the policy declares error / warning per rule. `high` and
// `critical` are accepted as error synonyms and anything unrecognized is
// treated as an error, because a risk policy fails closed.
//
// Usage: node check-tool-risk-policy.mjs [--json] [--policy <path>] [--skill <domain/skill>] [--strict]
// Exit codes: 0 clean, 1 policy violated (or, with --strict, warnings too), 2 usage / unreadable policy.

import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, collectSkills } from './skill-graph.mjs';
import { parseToolRiskPolicy, readToolRiskPolicy, defaultPolicyPath } from './scripts/parse-tool-risk-policy.mjs';

// Tools a skill may touch without declaring any intent to write anything.
const BASE_TOOLS = ['Read', 'Grep', 'Glob'];
// Side effects whose declaration justifies a local file-writing tool.
const WRITE_SIDE_EFFECTS = new Set(['write-code', 'write-files']);
const WRITE_TOOLS = ['Edit', 'Write'];
// Body prose that implies command execution or remote access.
const EXECUTION_HINT = /\b(?:shell|bash|sh|npm|npx|pnpm|yarn|node|tests?|testing|command(?:-line)?|scripts?)\b/i;
const NETWORK_HINT = /\b(?:web|fetch|remote|online)\b|https?:\/\//i;
// A body note that records why an approval gate is unnecessary. The policy
// statement for the side-effects rule accepts this written justification as an
// alternative to an approval gate, so the checker looks for it too.
const JUSTIFICATION_NOTE = /\b(?:justification|justified|no approval (?:is )?(?:needed|required)|approval (?:is )?not required|without approval because|approval gate (?:is )?not needed)\b/i;
// A body note that documents how remote content is treated.
const UNTRUSTED_CONTENT_NOTE = /untrusted|do not (?:trust|execute|follow)|treat (?:as|them as) (?:data|untrusted)|prompt injection/i;
// A note recording that a high-trust skill is not served over MCP.
const MCP_NON_EXPOSURE_NOTE = /(?:mcp|model context protocol)[^\n]{0,80}(?:not exposed|not exposable|excluded|do not expose|internal only)|(?:not exposed|do not expose|excluded from mcp|internal only)[^\n]{0,80}(?:mcp|model context protocol)/i;
const DYNAMIC_CONTEXT_EXECUTION = /!`/;

const RULE_IMPLEMENTATIONS = [
  {
    ids: ['canonical-skills-disallow-dynamic-context-and-hooks', 'no-dynamic-context-hooks'],
    kinds: ['skill-body'],
    title: 'canonical skills do not use pre-model execution hooks',
    run: checkNoDynamicContextOrHooks,
  },
  {
    ids: ['mutating-skill-must-declare-side-effects', 'side-effects-approval', 'r1'],
    kinds: ['frontmatter'],
    title: 'a skill with declared side effects gates them behind approval',
    run: checkSideEffectsApproval,
  },
  {
    ids: ['high-risk-skill-needs-approval-for-irreversible-tools', 'high-risk-tool-approval', 'r2'],
    kinds: ['manifest-tools'],
    title: 'a risk-high skill needs approval for approval-gated or irreversible tools',
    run: checkHighRiskTools,
  },
  {
    ids: ['untrusted-input-needs-documented-handling', 'untrusted-input-handling', 'r3'],
    kinds: ['skill-body'],
    title: 'untrusted input has documented handling',
    run: checkUntrustedInputHandling,
  },
  {
    ids: ['mcp-tools-follow-trust-tier-allow-list', 'mcp-exposure-allow-list'],
    kinds: ['manifest-tools'],
    title: 'MCP tools stay inside the per-trust-tier exposure allow-list',
    run: checkMcpExposureAllowList,
  },
  {
    ids: ['tier4-not-exposed-over-mcp-without-allow-list', 'trust-tier-four-mcp-exposure'],
    kinds: ['mcp-server'],
    title: 'a trustTier 4 skill records that it is not exposed over MCP',
    run: checkTrustTierFourNotExposed,
  },
  {
    ids: ['unknown-tools-are-denied', 'default-deny-unknown-tool', 'r5'],
    kinds: ['manifest-tools'],
    title: 'defaultTier deny rejects tools the policy does not declare',
    run: checkUnknownTools,
  },
  {
    ids: ['allow-and-deny-lists-stay-disjoint'],
    kinds: ['manifest-tools'],
    title: 'allow and deny lists stay disjoint',
    run: checkAllowDenyDisjoint,
  },
];

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function isTrue(value) {
  return String(value).trim().toLowerCase() === 'true';
}

function trustTierOf(frontmatter) {
  const raw = Number(frontmatter?.trustTier);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function globToRegExp(pattern) {
  const escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function buildToolIndex(tools) {
  const exact = new Map();
  const patterns = [];
  for (const tool of tools) {
    if (!tool || typeof tool !== 'object') continue;
    const name = String(tool.name ?? '').trim();
    if (!name) continue;
    if (isTrue(tool.isPattern) || name.includes('*')) patterns.push(tool);
    else exact.set(name, tool);
  }
  return { exact, patterns };
}

function resolveTool(toolIndex, name) {
  const key = String(name);
  const direct = toolIndex.exact.get(key);
  if (direct) return direct;
  for (const pattern of toolIndex.patterns) {
    if (globToRegExp(pattern.name).test(key)) return pattern;
  }
  return null;
}

function isMcpTool(toolIndex, name) {
  const tool = resolveTool(toolIndex, name);
  if (!tool) return false;
  if (isTrue(tool.isPattern)) return true;
  return String(tool.name).startsWith('mcp');
}

// Conservative derivation of the tools a skill may use, from what it declares
// and what its body talks about. Read/Grep/Glob are always available; writing
// tools follow a write side effect; Bash follows any mention of running
// commands; WebFetch/WebSearch follow any mention of the web.
export function deriveAllowedTools(frontmatter = {}, body = '') {
  const text = String(body ?? '');
  const effects = toList(frontmatter?.sideEffects);
  const tools = [...BASE_TOOLS];
  if (effects.some((effect) => WRITE_SIDE_EFFECTS.has(effect))) tools.push(...WRITE_TOOLS);
  if (EXECUTION_HINT.test(text)) tools.push('Bash');
  if (NETWORK_HINT.test(text)) tools.push(...['WebFetch', 'WebSearch']);
  return [...new Set(tools)];
}

function checkSideEffectsApproval(ctx) {
  const effects = toList(ctx.frontmatter?.sideEffects);
  if (!effects.length) return [];
  if (isTrue(ctx.frontmatter?.approvalRequired)) return [];
  if (toList(ctx.frontmatter?.approvalFor).length) return [];
  if (JUSTIFICATION_NOTE.test(String(ctx.body ?? ''))) return [];
  return [`declares sideEffects [${effects.join(', ')}] without an approval gate: approvalRequired is not true, approvalFor is empty, and the body records no justification`];
}

function checkHighRiskTools(ctx) {
  if (String(ctx.frontmatter?.risk ?? '').trim().toLowerCase() !== 'high') return [];
  const gated = (ctx.tools ?? []).filter((name) => {
    const tool = resolveTool(ctx.toolIndex, name);
    if (!tool) return false;
    return isTrue(tool.requiresApproval) || String(tool.tier ?? '').trim().toLowerCase() === 'irreversible';
  });
  if (!gated.length) return [];
  if (isTrue(ctx.frontmatter?.approvalRequired)) return [];
  return [`risk is high and the skill allows approval-gated or irreversible tools [${gated.join(', ')}] while approvalRequired is not true`];
}

function checkUntrustedInputHandling(ctx) {
  const untrusted = (ctx.tools ?? []).filter((name) => isTrue(resolveTool(ctx.toolIndex, name)?.untrustedInput));
  if (!untrusted.length) return [];
  if (UNTRUSTED_CONTENT_NOTE.test(String(ctx.body ?? ''))) return [];
  return [`allows untrusted-input tools [${untrusted.join(', ')}] but the body never states how fetched content is treated`];
}

function checkMcpExposureAllowList(ctx) {
  const exposure = ctx.policy?.mcpExposure ?? {};
  const allowedByTier = exposure.allowedRiskClassesByTrustTier ?? {};
  const mcpTools = (ctx.tools ?? []).filter((name) => isMcpTool(ctx.toolIndex, name));
  if (!mcpTools.length) return [];
  const tier = trustTierOf(ctx.frontmatter);
  const classes = toList(allowedByTier[String(tier)] ?? allowedByTier[tier]);
  const explicitFrom = Number(exposure.requireExplicitAllowListFromTrustTier ?? 0);
  if (tier >= explicitFrom && !classes.length) {
    return [`trustTier ${tier} has no allowed risk class in mcpExposure, so MCP tools [${mcpTools.join(', ')}] cannot be served`];
  }
  const out = [];
  for (const name of mcpTools) {
    const riskClass = String(resolveTool(ctx.toolIndex, name)?.tier ?? '');
    if (riskClass && !classes.includes(riskClass)) {
      out.push(`MCP tool ${name} carries risk class ${riskClass}, which is outside the trustTier ${tier} allow-list [${classes.join(', ')}]`);
    }
  }
  return out;
}

function checkTrustTierFourNotExposed(ctx) {
  const tier = trustTierOf(ctx.frontmatter);
  if (tier < 4) return [];
  if (MCP_NON_EXPOSURE_NOTE.test(String(ctx.body ?? ''))) return [];
  if (toList(ctx.frontmatter?.compatibility).some((entry) => MCP_NON_EXPOSURE_NOTE.test(String(entry)))) return [];
  return [`trustTier ${tier} carries no note in the body or the compatibility list recording that it is not exposed over MCP`];
}

function checkUnknownTools(ctx) {
  const unknown = (ctx.tools ?? []).filter((name) => !resolveTool(ctx.toolIndex, name));
  if (!unknown.length) return [];
  return [`allows tools with no declared risk profile while defaultTier is "${String(ctx.policy?.defaultTier ?? 'deny')}": [${unknown.join(', ')}]`];
}

function checkAllowDenyDisjoint(ctx) {
  const deny = toList(ctx.manifest?.deny);
  if (!deny.length) return [];
  const overlap = (ctx.tools ?? []).filter((name) => deny.includes(name));
  if (!overlap.length) return [];
  return [`manifest allow and deny lists share [${overlap.join(', ')}], so the deny list has no effect`];
}

function checkNoDynamicContextOrHooks(ctx) {
  const findings = [];
  const body = String(ctx.body ?? '');
  const frontmatter = ctx.frontmatter ?? {};
  if (DYNAMIC_CONTEXT_EXECUTION.test(body)) {
    findings.push('body contains dynamic-context execution syntax !`, which can run before the model evaluates the skill');
  }
  if (Object.prototype.hasOwnProperty.call(frontmatter, 'hooks')) {
    findings.push('frontmatter declares hooks, which are not allowed in canonical skills');
  }
  if (Object.prototype.hasOwnProperty.call(frontmatter, 'settings')) {
    findings.push('frontmatter declares settings; canonical skills may not enable pre-model execution through settings');
  }
  return findings;
}

const ERROR_SEVERITIES = new Set(['error', 'high', 'critical', 'block']);

function normalizeSeverity(value) {
  const severity = String(value ?? '').trim().toLowerCase();
  return ERROR_SEVERITIES.has(severity) ? 'error' : 'warning';
}

function findImplementation(rule) {
  const id = String(rule?.id ?? '').trim().toLowerCase();
  const kind = String(rule?.check ?? '').trim().toLowerCase();
  return RULE_IMPLEMENTATIONS.find((impl) => impl.ids.includes(id))
    ?? RULE_IMPLEMENTATIONS.find((impl) => impl.kinds.includes(kind))
    ?? null;
}

export function evaluateRule(rule, ctx = {}) {
  const skill = ctx?.name ?? null;
  const severity = normalizeSeverity(rule?.severity);
  const impl = findImplementation(rule);
  if (!impl) {
    return [{
      rule: String(rule?.id ?? 'unknown'),
      severity: 'warning',
      skill,
      detail: `no checker implementation for rule "${String(rule?.id ?? 'unknown')}" (check kind "${String(rule?.check ?? 'none')}"), so the rule was not verified`,
    }];
  }
  // A caller that hands over a policy but no prebuilt index still gets a working
  // check: the index is derivable from the policy alone.
  const toolIndex = ctx?.toolIndex ?? buildToolIndex(ctx?.policy?.tools ?? []);
  const implCtx = { ...ctx, toolIndex };
  let produced = [];
  try {
    produced = impl.run(implCtx, rule) ?? [];
  } catch (error) {
    produced = [`checker for rule "${String(rule.id)}" crashed: ${error?.message ?? error}`];
  }
  return produced.map((detail) => ({
    rule: String(rule.id),
    severity,
    skill,
    detail: String(detail ?? ''),
  }));
}

function skillSortKey(skill) {
  return String(skill?.path ?? skill?.name ?? '');
}

export function checkSkills(policy, skills = []) {
  const toolIndex = buildToolIndex(policy?.tools ?? []);
  const findings = [];
  const ordered = [...skills].sort((a, b) => {
    const keyA = skillSortKey(a);
    const keyB = skillSortKey(b);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  });
  for (const skill of ordered) {
    const frontmatter = skill?.frontmatter ?? {};
    const body = skill?.body ?? '';
    const tools = Array.isArray(skill?.tools)
      ? [...new Set(skill.tools.map((name) => String(name)))]
      : deriveAllowedTools(frontmatter, body);
    const ctx = { ...skill, frontmatter, body, tools, policy, toolIndex, manifest: skill?.manifest ?? null };
    for (const rule of policy?.rules ?? []) {
      findings.push(...evaluateRule(rule, ctx));
    }
  }
  return {
    status: findings.some((finding) => finding.severity === 'error') ? 'fail' : 'pass',
    policyVersion: policy?.version ?? null,
    skillsChecked: ordered.length,
    findings,
    counts: {
      errors: findings.filter((finding) => finding.severity === 'error').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
    },
  };
}

async function readManifestTools(root, skill) {
  const manifestsDir = path.join(root, '.agents', 'skills', 'platform', 'manifests');
  const candidates = [
    `${skill.domain}-${skill.name}.runtime.json`,
    `${skill.name}.runtime.json`,
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(manifestsDir, candidate), 'utf8'));
      const tools = parsed?.execution?.tools;
      const allow = toList(tools?.allow);
      const deny = toList(tools?.deny);
      if (allow.length || deny.length) return { allow, deny, file: candidate };
    } catch {
      // manifest absent or unreadable: fall through to the next candidate
    }
  }
  return null;
}

async function loadSkillContexts(root, filter = null) {
  const skills = collectSkills(root);
  const contexts = [];
  for (const skill of skills) {
    if (!matchesFilter(skill, filter)) continue;
    const skillMd = path.join(root, skill.path, 'SKILL.md');
    let text = '';
    try {
      text = await fs.readFile(skillMd, 'utf8');
    } catch {
      continue;
    }
    const frontmatter = parseFrontmatter(text);
    const manifest = await readManifestTools(root, skill);
    const tools = manifest ? manifest.allow : deriveAllowedTools(frontmatter, skill.body);
    contexts.push({
      name: skill.name,
      domain: skill.domain,
      path: skill.path,
      frontmatter,
      body: skill.body,
      manifest,
      tools,
    });
  }
  return contexts.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function matchesFilter(skill, filter) {
  if (!filter) return true;
  const needle = String(filter).trim().replace(/^\.?\/*/, '').toLowerCase();
  if (!needle) return true;
  const keys = [`${skill.domain}/${skill.name}`, skill.name, skill.path];
  return keys.some((key) => {
    const value = String(key).toLowerCase();
    return value === needle || value.endsWith(`/${needle}`);
  });
}

// bodyOf mirrors the private skill-graph helper: the CLI derives a skill's
// body from its SKILL.md text, and check-all's shared manifest carries that
// same text, so both paths see the same body.
function bodyOf(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  return end === -1 ? text : text.slice(text.indexOf('\n', end + 1) + 1);
}

// Synchronous twin of readManifestTools: same candidates, same precedence.
function readManifestToolsSync(root, domain, name) {
  const manifestsDir = path.join(root, '.agents', 'skills', 'platform', 'manifests');
  const candidates = [
    `${domain}-${name}.runtime.json`,
    `${name}.runtime.json`,
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(path.join(manifestsDir, candidate), 'utf8'));
      const tools = parsed?.execution?.tools;
      const allow = toList(tools?.allow);
      const deny = toList(tools?.deny);
      if (allow.length || deny.length) return { allow, deny, file: candidate };
    } catch {
      // manifest absent or unreadable: fall through to the next candidate
    }
  }
  return null;
}

// Maps the manifest check-all.mjs builds (one walk of the bundle: path,
// dirPath, domain, dirName, text) onto the skill contexts checkSkills()
// consumes. The platform domain is excluded exactly as collectSkills()
// excludes it: it is tooling, not shippable skill content. The audit and the
// CLI therefore cover the same skills with the same tools.
function skillContextsFromManifest(manifest, root) {
  const contexts = [];
  for (const entry of manifest ?? []) {
    if (!entry || entry.domain === 'platform') continue;
    const text = String(entry.text ?? '');
    if (!text) continue;
    const frontmatter = parseFrontmatter(text);
    const body = bodyOf(text);
    const manifestTools = readManifestToolsSync(root, entry.domain, entry.dirName);
    const tools = manifestTools ? manifestTools.allow : deriveAllowedTools(frontmatter, body);
    contexts.push({
      name: entry.dirName,
      domain: entry.domain,
      path: entry.dirPath,
      frontmatter,
      body,
      manifest: manifestTools,
      tools,
    });
  }
  return contexts.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

// auditSkillTools(manifest, root) - in-process twin of the CLI: it returns the
// same report `node check-tool-risk-policy.mjs --json` prints, so the gate's
// report-only entry mirrors that CLI without a second bundle walk or a
// subprocess. Its exit code condition is the CLI's own: exit 1 when the report
// carries error-severity findings (never for warnings, the CLI is not --strict).
export function auditSkillTools(manifest = [], root = process.cwd()) {
  const policyPath = defaultPolicyPath(root);
  let policy;
  try {
    policy = parseToolRiskPolicy(readFileSync(policyPath, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read the tool risk policy at ${policyPath}: ${error?.message ?? error}`);
  }
  return checkSkills(policy, skillContextsFromManifest(manifest, root));
}

function parseArgs(argv) {
  const args = { json: false, policy: null, skill: null, strict: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--json') args.json = true;
    else if (token === '--strict') args.strict = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--policy') {
      args.policy = argv[i + 1];
      if (args.policy === undefined) throw new Error('--policy requires a path');
      i += 1;
    } else if (token.startsWith('--policy=')) args.policy = token.slice('--policy='.length);
    else if (token === '--skill') {
      args.skill = argv[i + 1];
      if (args.skill === undefined) throw new Error('--skill requires a skill name');
      i += 1;
    } else if (token.startsWith('--skill=')) args.skill = token.slice('--skill='.length);
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`check-tool-risk-policy: ${error.message}`);
    return 2;
  }
  if (args.help) {
    console.log('usage: node check-tool-risk-policy.mjs [--json] [--policy <path>] [--skill <domain/skill>] [--strict]');
    console.log('  --json          emit the report as JSON (the default and only report form)');
    console.log('  --policy <path> policy file to read (default <repo root>/policy/tool-risk.yaml)');
    console.log('  --skill <name>  check a single skill, named either <domain>/<skill> or <skill>');
    console.log('  --strict        warnings also fail the run');
    console.log('');
    console.log('The report is always JSON: {status, policyVersion, skillsChecked, findings, counts}.');
    return 0;
  }
  const root = process.cwd();
  const policyPath = args.policy ? path.resolve(root, args.policy) : defaultPolicyPath(root);
  let policy;
  try {
    ({ policy } = await readToolRiskPolicy(policyPath));
  } catch (error) {
    console.error(`check-tool-risk-policy: ${error.message}`);
    return 2;
  }
  const skills = await loadSkillContexts(root, args.skill);
  if (!skills.length) {
    console.error(`check-tool-risk-policy: no skill matched "${String(args.skill)}" in ${path.join(root, '.agents', 'skills')}`);
    return 2;
  }
  const report = checkSkills(policy, skills);
  console.log(JSON.stringify(report, null, 2));
  if (report.counts.errors > 0) return 1;
  if (args.strict && report.counts.warnings > 0) return 1;
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((error) => {
    console.error(`check-tool-risk-policy: ${error?.message ?? error}`);
    process.exit(2);
  });
}

export { RULE_IMPLEMENTATIONS, normalizeSeverity, UNTRUSTED_CONTENT_NOTE, MCP_NON_EXPOSURE_NOTE, JUSTIFICATION_NOTE };
