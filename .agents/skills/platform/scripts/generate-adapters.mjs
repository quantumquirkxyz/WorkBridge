#!/usr/bin/env node
// generate-adapters.mjs - Multi-runtime adapter generator for the quirk skills bundle.
//
// Projects every bundle skill (the .agents/skills/** tree, excluding the platform
// domain, which is infrastructure) plus its runtime manifest
// (.agents/skills/platform/manifests/<domain>-<skill>.runtime.json) into
// per-runtime adapters under .agents/skills/platform/adapters/<runtime>/.
//
// The derivation is mechanical and side-effect free: the same bundle and the
// same manifests always produce byte-identical bytes, so the generated tree is
// a pure function of its sources. No model, no network, no heuristics beyond
// the documented rules below.
//
// Runtimes:
//   claude/agents/<domain>-<skill>.md       Claude Code subagent definitions
//   kilo/commands/<domain>-<skill>.md       Kilo slash commands
//   openai-agents/<skill>.json              OpenAI Agents SDK agent manifests
//   langgraph/<skill>.yaml                  LangGraph workflow nodes and edges
//   openhands/automations/<skill>.yaml      OpenHands / Agent Canvas automations
//   cursor/rules/<skill>.mdc                Cursor rules
//   mcp/manifest.json                       declarative MCP surface per skill
//
// Usage:
//   node scripts/generate-adapters.mjs [--write] [--runtime <r>] [--skill <domain/skill>]
//       [--allow-high-trust] [--json]
//
// Default mode is a dry run that reports what would be written. --write applies
// the adapters, regenerates every README, and (on full runs only) prunes files
// the run did not generate, so the directory can never drift from its source.
// --runtime filters to one or more runtimes (repeatable, comma-separated).
// --skill filters to one skill (accepted as domain/skill or a bare skill name).
// --allow-high-trust keeps trustTier >= 4 skills inside the MCP allow-list.
//
// Exit codes: 0 = success, 2 = usage or I/O error.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, collectSkills } from '../skill-graph.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(HERE, '..');
const ADAPTERS_REL_DIR = '.agents/skills/platform/adapters';
const MANIFESTS_REL_DIR = '.agents/skills/platform/manifests';
const MANIFEST_SUFFIX = '.runtime.json';
const README_NAME = 'README.md';
const BUNDLE_SKILL_COUNT = 246;

export const RUNTIMES = ['claude', 'kilo', 'openai-agents', 'langgraph', 'openhands', 'cursor', 'mcp'];
export const DESCRIPTION_LIMIT = 200;
export const MAX_STEPS = 8;
export const STEP_LIMIT = 240;
export const DEFAULT_TOOLS = ['Read', 'Grep', 'Glob'];
export const DEFAULT_MAX_TURNS = 6;
export const DEFAULT_RISK = 'low';
export const DEFAULT_TRUST_TIER = 1;
export const DEFAULT_MODEL_TIER = 'reasoning';

// Side effects that mutate the working tree, the tracker, or a git remote, so
// the owning skill needs an explicit permission mode instead of silent edits.
export const MUTATING_SIDE_EFFECTS = new Set([
  'write-files', 'write-code', 'write-docs', 'write-temp-file', 'post-pr-comment',
  'post-comment', 'issue-mutation', 'create-issue', 'create-issues', 'label-issue',
  'close-issue', 'update-project', 'update-lockfile', 'git-mutation', 'commit-git',
  'push-branch', 'create-pull-request', 'merge-pull-request', 'continue-merge-or-rebase',
  'create-symlink', 'create-project', 'create-project-fields', 'link-repositories',
]);

export const MODEL_TIERS = new Set(['fast', 'reasoning', 'router']);
export const MODEL_TIER_NORMALIZATION = { code: 'reasoning' };
export const CLAUDE_MODELS = { fast: 'haiku', reasoning: 'opus', router: 'sonnet' };
export const OPENAI_MODELS = { fast: 'gpt-5-mini', reasoning: 'gpt-5', router: 'gpt-5.1' };

const GENERATED_EXTENSIONS = new Set(['.md', '.json', '.yaml', '.mdc']);

const usage = `generate-adapters options:
  (no flags)                       dry-run report into ${ADAPTERS_REL_DIR}
  --write                          apply the adapters, READMEs, and prune stale files
  --runtime <r>                    restrict the run to one runtime (repeatable, comma-separated):
                                   ${RUNTIMES.join(' | ')}
  --skill <domain/skill>           restrict the run to one skill
  --allow-high-trust               expose trustTier >= 4 skills in mcp/manifest.json
  --json                           machine-readable output
  --help                           show this help`;

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function collapse(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

// Skill bodies and frontmatter carry markdown links that resolve relative to the
// SKILL.md location. An adapter lives elsewhere, so keeping the link syntax would
// emit a broken relative link into the generated tree (the repo link audit walks
// every markdown file). The prose is kept; only the link syntax is flattened.
function stripInlineLinks(value) {
  return String(value ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

function prose(value) {
  return collapse(stripInlineLinks(value));
}

function truncate(value, limit = DESCRIPTION_LIMIT) {
  const text = collapse(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

export function normalizeRisk(value) {
  const risk = String(value ?? '').trim().toLowerCase();
  return risk === 'low' || risk === 'medium' || risk === 'high' ? risk : DEFAULT_RISK;
}

export function normalizeTrustTier(value, fallback = DEFAULT_TRUST_TIER) {
  const tier = Number(value);
  if (!Number.isInteger(tier) || tier < 1 || tier > 4) return fallback;
  return tier;
}

export function normalizeApprovalRequired(value) {
  if (typeof value === 'boolean') return value;
  return String(value ?? '').trim().toLowerCase() === 'true';
}

export function normalizeModelTier(value) {
  const tier = String(value ?? '').trim().toLowerCase();
  if (MODEL_TIERS.has(tier)) return tier;
  if (MODEL_TIER_NORMALIZATION[tier]) return MODEL_TIER_NORMALIZATION[tier];
  return DEFAULT_MODEL_TIER;
}

function normalizeMaxTurns(value) {
  const turns = Number(value);
  if (!Number.isInteger(turns) || turns < 1) return DEFAULT_MAX_TURNS;
  return turns;
}

// YAML plain scalars are only emitted for conservative token shapes; everything
// else (descriptions, URIs, templates) becomes an escaped double-quoted scalar.
export function yamlScalar(value) {
  const text = String(value ?? '');
  if (text === '') return '""';
  if (/^[A-Za-z0-9][A-Za-z0-9 _./-]*$/.test(text)) return text;
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, ' ');
  return `"${escaped}"`;
}

// Accepts an array of manifests, a plain object keyed by skill identity, or a
// Map; every shape yields the same identity -> manifest lookup table.
export function indexManifests(manifests) {
  const out = new Map();
  const put = (key, manifest) => {
    const identity = String(key ?? '').trim();
    if (identity && manifest && typeof manifest === 'object') out.set(identity, manifest);
  };
  if (manifests instanceof Map) {
    for (const [key, manifest] of manifests) put(key, manifest);
  } else if (Array.isArray(manifests)) {
    for (const manifest of manifests) put(manifest?.skill, manifest);
  } else if (manifests && typeof manifests === 'object') {
    for (const [key, manifest] of Object.entries(manifests)) put(key, manifest);
  }
  return out;
}

function skillIdentity(skill) {
  const record = skill && typeof skill === 'object' ? skill : {};
  const domain = String(record.domain ?? '').trim();
  const name = String(record.name ?? '').trim();
  return domain ? `${domain}/${name}` : name;
}

function sectionText(body, titles) {
  const lines = String(body ?? '').split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^#{1,6}\s+(.*)$/);
    if (heading && titles.some((title) => new RegExp(`^${title}\\b`, 'i').test(heading[1].trim()))) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return '';
  const out = [];
  for (let i = start; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

function cleanStep(text) {
  const cleaned = prose(text).replace(/[.;:]$/, '');
  return cleaned.length > STEP_LIMIT ? `${cleaned.slice(0, STEP_LIMIT - 3).trimEnd()}...` : cleaned;
}

// Numbered workflow steps, read from the Process / Steps / Workflow / Procedure
// section of the skill body. A section that spells its phases out as numbered
// sub-headings ("### 1. Pin the fixed point") is summarized by those phases,
// because a nested list under one phase is a detail of that phase, not the next
// step of the procedure. A plain numbered list ("1. Map compiler stages") is
// used directly.
export function extractSteps(body) {
  const section = sectionText(body, ['Process', 'Steps', 'Workflow', 'Procedure']);
  if (!section) return [];
  const listSteps = [];
  const headingSteps = [];
  for (const line of section.split(/\r?\n/)) {
    const heading = line.match(/^#{2,6}\s+(\d+)[.)]\s+(.+)$/);
    if (heading) {
      headingSteps.push(cleanStep(heading[2]));
      continue;
    }
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) listSteps.push(cleanStep(numbered[2]));
  }
  const steps = headingSteps.length ? headingSteps : listSteps;
  return steps.filter(Boolean).slice(0, MAX_STEPS);
}

// One adapter plan per skill: frontmatter first, runtime manifest second,
// documented defaults last.
export function derivePlan(skill, manifest) {
  const record = skill && typeof skill === 'object' ? skill : {};
  const fm = record.frontmatter && typeof record.frontmatter === 'object' ? record.frontmatter : {};
  const guardrails = manifest?.guardrails && typeof manifest.guardrails === 'object' ? manifest.guardrails : {};
  const execution = manifest?.execution && typeof manifest.execution === 'object' ? manifest.execution : {};
  const toolsManifest = execution.tools && typeof execution.tools === 'object' ? execution.tools : {};

  const domain = String(record.domain ?? fm.category ?? '').trim() || 'uncategorized';
  const name = String(record.name ?? fm.name ?? '').trim();
  const identity = domain ? `${domain}/${name}` : name;
  const description = prose(fm.description ?? record.description ?? '') || `Skill ${name} from the quirk skills bundle.`;

  const capabilities = toList(Array.isArray(fm.capabilities) && fm.capabilities.length ? fm.capabilities : record.capabilities).map(prose);
  const steps = extractSteps(record.body ?? fm.body ?? '');
  const outputs = toList(Array.isArray(fm.outputs) ? fm.outputs : record.outputs).filter((entry) => !/^type\b/i.test(entry)).map(prose);
  const artifactType = collapse(fm.artifactType ?? record.artifactType ?? '');
  const deliverables = outputs.length ? outputs.slice(0, 4) : (artifactType ? [`${artifactType} artifact`] : []);

  const modelTier = normalizeModelTier(execution.modelTier ?? fm.modelTier);
  const risk = normalizeRisk(guardrails.risk ?? fm.risk);
  const trustTier = normalizeTrustTier(
    guardrails.trustTier ?? fm.trustTier ?? record.tier,
    DEFAULT_TRUST_TIER,
  );
  const approvalRequired = normalizeApprovalRequired(
    guardrails.approvalRequired ?? fm.approvalRequired ?? record.approvalRequired,
  );
  const sideEffects = toList(guardrails.sideEffects ?? fm.sideEffects ?? record.sideEffects);
  const mutating = sideEffects.some((effect) => MUTATING_SIDE_EFFECTS.has(effect));

  let tools = toList(toolsManifest.allow).length ? toList(toolsManifest.allow) : [...DEFAULT_TOOLS];
  if (tools.includes('Bash') && trustTier >= 4 && !approvalRequired) {
    // Hard rule: a trustTier >= 4 skill must never carry Bash in a subagent
    // surface unless it also declares approvalRequired.
    tools = tools.filter((tool) => tool !== 'Bash');
  }

  const stopCondition = prose(fm.stopCondition ?? record.stopCondition ?? '')
    || `${description} complete; structured result returned; completion criteria checked.`;

  const skillMdPath = record.path
    ? `${String(record.path).split(path.sep).join('/')}/SKILL.md`
    : `.agents/skills/${domain}/${name}/SKILL.md`;

  return {
    identity,
    name,
    domain,
    skillMdPath,
    description,
    shortDescription: truncate(description, DESCRIPTION_LIMIT),
    capabilities: capabilities.length ? capabilities : [`apply the ${name} workflow`],
    steps: steps.length ? steps : [`Read the canonical skill at ${skillMdPath} and execute its Process.`],
    deliverables,
    stopCondition,
    modelTier,
    claudeModel: CLAUDE_MODELS[modelTier] ?? CLAUDE_MODELS.reasoning,
    openaiModel: OPENAI_MODELS[modelTier] ?? OPENAI_MODELS.reasoning,
    tools,
    role: collapse(manifest?.role) || 'tool',
    maxTurns: normalizeMaxTurns(execution.maxTurns ?? fm.maxIterations),
    isolation: collapse(execution.isolation) || 'none',
    sideEffects,
    mutating,
    approvalRequired,
    risk,
    trustTier,
    hasManifest: Boolean(manifest),
  };
}

// --- per-runtime renderers ---

function renderClaudeAgent(plan) {
  const lines = ['---'];
  lines.push(`name: ${yamlScalar(plan.name)}`);
  lines.push(`description: ${yamlScalar(plan.shortDescription)}`);
  lines.push(`tools: ${plan.tools.join(', ')}`);
  lines.push(`model: ${plan.claudeModel}`);
  if (plan.mutating) lines.push('permissionMode: default');
  if (plan.risk === 'high') lines.push('disallowedTools: Bash');
  lines.push('---');
  lines.push(`You are the ${plan.name} skill (${plan.domain} domain) from the quirk skills bundle. Read ${plan.skillMdPath} before acting and follow its Process.`);
  lines.push('');
  lines.push('Capabilities:');
  for (const capability of plan.capabilities) lines.push(`- ${capability}`);
  lines.push('');
  lines.push(`Stop condition: ${plan.stopCondition}`);
  return `${lines.join('\n')}\n`;
}

function renderKiloCommand(plan) {
  const lines = ['---'];
  lines.push(`description: ${yamlScalar(plan.description)}`);
  lines.push('---');
  lines.push(`# ${plan.name}`);
  lines.push('');
  lines.push(`When to use: ${plan.description}`);
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  plan.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  lines.push('');
  if (plan.deliverables.length) {
    lines.push('## Deliverables');
    lines.push('');
    for (const deliverable of plan.deliverables) lines.push(`- ${deliverable}`);
    lines.push('');
  }
  lines.push('## Guardrails');
  lines.push('');
  lines.push(`- risk: ${plan.risk}; trust tier: ${plan.trustTier}; approval required: ${plan.approvalRequired ? 'yes' : 'no'}`);
  lines.push(`- side effects: ${plan.sideEffects.length ? plan.sideEffects.join(', ') : 'none'}`);
  lines.push(`- isolation: ${plan.isolation}; model tier: ${plan.modelTier}`);
  lines.push('');
  lines.push(`Stop when: ${plan.stopCondition}`);
  return `${lines.join('\n')}\n`;
}

function renderOpenAiAgent(plan) {
  const instructions = [
    plan.description,
    '',
    'Capabilities:',
    ...plan.capabilities.map((capability) => `- ${capability}`),
    '',
    `Canonical skill: ${plan.skillMdPath}`,
  ].join('\n');
  const manifest = {
    name: plan.name,
    instructions,
    model: plan.openaiModel,
    tools: [],
    handoff_description: plan.stopCondition,
    runtime: { role: plan.role, maxTurns: plan.maxTurns, isolation: plan.isolation },
    guardrails: { input: [], output: [] },
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

const LANGGRAPH_NODES = [
  { id: 'intake', type: 'passthrough' },
  { id: 'context_pack', type: 'tool', tool: 'read' },
  { id: 'execute', type: 'llm' },
  { id: 'verify', type: 'tool', tool: 'check' },
  { id: 'report', type: 'passthrough' },
];

const LANGGRAPH_EDGES = [
  ['intake', 'context_pack'],
  ['context_pack', 'execute'],
  ['execute', 'verify'],
  ['verify', 'report'],
];

function renderLangGraphWorkflow(plan) {
  const lines = [`name: ${yamlScalar(plan.name)}`, 'kind: workflow', 'nodes:'];
  for (const node of LANGGRAPH_NODES) {
    lines.push(`  - id: ${node.id}`);
    lines.push(`    type: ${node.type}`);
    if (node.tool) lines.push(`    tool: ${node.tool}`);
    if (node.id === 'execute') lines.push(`    model: ${plan.modelTier}`);
  }
  lines.push('edges:');
  for (const [from, to] of LANGGRAPH_EDGES) lines.push(`  - {from: ${from}, to: ${to}}`);
  lines.push('metadata:');
  lines.push(`  skill: ${yamlScalar(plan.identity)}`);
  lines.push(`  risk: ${plan.risk}`);
  lines.push(`  trustTier: ${plan.trustTier}`);
  return `${lines.join('\n')}\n`;
}

function renderOpenHandsAutomation(plan) {
  const lines = [
    `name: ${yamlScalar(plan.name)}`,
    `description: ${yamlScalar(plan.description)}`,
    'trigger:',
    '  type: webhook',
    '  events: [pull_request.opened, issues.opened]',
    'runtime:',
    '  agent: claude-code',
    '  sandbox: docker',
    'steps:',
    `  - uses: skill/${plan.domain}-${plan.name}`,
    '    with:',
    '      task: "{{ event.title }}"',
    'policy:',
    `  approvalRequired: ${plan.approvalRequired}`,
    `  sideEffects: [${plan.sideEffects.join(', ')}]`,
  ];
  return `${lines.join('\n')}\n`;
}

function renderCursorRule(plan) {
  const lines = ['---'];
  lines.push(`description: ${yamlScalar(plan.description)}`);
  lines.push('globs: []');
  lines.push('alwaysApply: false');
  lines.push('---');
  lines.push(`# ${plan.name}`);
  lines.push('');
  lines.push(`Apply the ${plan.name} skill when the request matches its scope.`);
  lines.push('');
  lines.push('Capabilities:');
  for (const capability of plan.capabilities) lines.push(`- ${capability}`);
  lines.push('');
  lines.push(`Stop when: ${plan.stopCondition}`);
  return `${lines.join('\n')}\n`;
}

function renderMcpManifest(plans, options = {}) {
  const allowHighTrust = Boolean(options.allowHighTrust);
  const skills = plans.map((plan) => {
    const exposed = allowHighTrust ? true : plan.trustTier <= 3;
    const entry = {
      skill: plan.identity,
      trustTier: plan.trustTier,
      tools: ['get_skill'],
      resources: [`skill://skill/${plan.identity}`],
      prompts: ['use_skill'],
      exposed,
    };
    if (!exposed) entry.reason = 'trustTier>3';
    return entry;
  });
  return `${JSON.stringify({
    schemaVersion: '1.0',
    server: { name: 'skill-lab', protocolVersion: '2024-11-05' },
    skills,
  }, null, 2)}\n`;
}

// --- README renderers ---

export function renderClaudeReadme() {
  return `# Claude Code subagent adapters (generated)

Every \`*.md\` file in \`agents/\` is generated by
\`.agents/skills/platform/scripts/generate-adapters.mjs\`. Do not edit these files
by hand; the next regeneration overwrites them.

## Install

Copy the definitions into the Claude Code agents directory of the target
project:

    mkdir -p .claude/agents
    cp .agents/skills/platform/adapters/claude/agents/*.md .claude/agents/

Claude Code registers one subagent per \`name\` declared in the frontmatter.

## Fields

| Field | Meaning |
| --- | --- |
| \`name\` | Bundle skill name; unique across the bundle. |
| \`description\` | Skill frontmatter description, truncated to ${DESCRIPTION_LIMIT} characters. |
| \`tools\` | Tool allow-list from the runtime manifest (\`Read, Grep, Glob\` by default). |
| \`model\` | Manifest \`modelTier\`: \`fast -> haiku\`, \`reasoning -> opus\`, \`router -> sonnet\`. |
| \`permissionMode\` | Present (\`default\`) when the skill declares a mutating side effect. |
| \`disallowedTools\` | Present (\`Bash\`) when the skill is \`risk: high\`. |

\`Bash\` never appears in the allow-list of a skill with \`trustTier >= 4\` unless the
skill also declares \`approvalRequired\`, so the highest-trust skills stay
approval-gated on the subagent surface.

## Regenerate

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime claude --json
`;
}

export function renderKiloReadme() {
  return `# Kilo slash-command adapters (generated)

Every file in \`commands/\` is generated by
\`.agents/skills/platform/scripts/generate-adapters.mjs\`. Do not edit these files
by hand; the next regeneration overwrites them.

## Install

Copy the commands into the Kilo command directory of the target project:

    mkdir -p .kilo/command
    cp .agents/skills/platform/adapters/kilo/commands/*.md .kilo/command/

Each file carries a \`description\` frontmatter field and a body that synthesizes
the canonical skill: when to use it, the numbered workflow steps from the skill
\`Process\` section, its deliverables, its guardrails, and its stop condition.
A command is invoked by its file name without the \`.md\` extension.

## Regenerate

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime kilo --json
`;
}

export function renderOpenAiReadme() {
  return `# OpenAI Agents SDK adapters (generated)

Every \`*.json\` file in this directory is generated by
\`.agents/skills/platform/scripts/generate-adapters.mjs\`. Do not edit these files
by hand; the next regeneration overwrites them.

Each manifest declares \`name\`, \`instructions\`, \`model\`, \`handoff_description\`, a
\`runtime\` block (\`role\`, \`maxTurns\`, \`isolation\`) and empty
\`guardrails.input\` / \`guardrails.output\` arrays for the host application to fill.

## Reference loader

The snippet below is a reference only; it shows how the JSON files map onto the
OpenAI Agents SDK \`Agent\` constructor. It is not executed by this repository,
and no Python runtime is required to generate the manifests.

\`\`\`python
import json
from pathlib import Path

from agents import Agent

ADAPTERS = Path(__file__).resolve().parent

specs = [
    json.loads(path.read_text(encoding="utf-8"))
    for path in sorted(ADAPTERS.glob("*.json"))
]

agents = [
    Agent(
        name=spec["name"],
        instructions=spec["instructions"],
        model=spec["model"],
        handoff_description=spec.get("handoff_description"),
    )
    for spec in specs
]
\`\`\`

Install the SDK in the host environment (\`pip install openai-agents\`), then load
the directory with the snippet above.

## Regenerate

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime openai-agents --json
`;
}

export function renderLangGraphReadme() {
  return `# LangGraph workflow adapters (generated)

Every \`*.yaml\` file in this directory is generated by
\`.agents/skills/platform/scripts/generate-adapters.mjs\`. Do not edit these files
by hand; the next regeneration overwrites them.

Each workflow uses five fixed nodes (\`intake\`, \`context_pack\`, \`execute\`,
\`verify\`, \`report\`) wired as a linear graph. The \`execute\` node carries the
runtime manifest \`modelTier\`, and the \`metadata\` block records the bundle skill
identity, its \`risk\`, and its \`trustTier\`.

## Reference builder

The snippet below is a reference only; it shows how a YAML workflow maps onto a
LangGraph \`StateGraph\`. It is not executed by this repository, and no Python
runtime is required to generate the workflows.

\`\`\`python
from pathlib import Path

import yaml
from langgraph.graph import END, START, StateGraph

ADAPTERS = Path(__file__).resolve().parent


def passthrough(state):
    return state


def build(spec_path):
    spec = yaml.safe_load(spec_path.read_text(encoding="utf-8"))
    graph = StateGraph(dict)
    for node in spec["nodes"]:
        graph.add_node(node["id"], passthrough)
    graph.add_edge(START, spec["edges"][0]["from"])
    for edge in spec["edges"]:
        graph.add_edge(edge["from"], edge["to"])
    graph.add_edge(spec["edges"][-1]["to"], END)
    return graph.compile()
\`\`\`

## Regenerate

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime langgraph --json
`;
}

export function renderOpenHandsReadme() {
  return `# OpenHands / Agent Canvas automation adapters (generated)

Every \`*.yaml\` file in \`automations/\` is generated by
\`.agents/skills/platform/scripts/generate-adapters.mjs\`. Do not edit these files
by hand; the next regeneration overwrites them.

Each recipe declares a \`webhook\` trigger (\`pull_request.opened\`,
\`issues.opened\`), a runtime block (a coding agent inside a \`docker\` sandbox), a
single step that delegates to \`skill/<domain>-<name>\` with the event title as
the task, and a \`policy\` block carrying \`approvalRequired\` plus the side effects
the owning skill declares.

Drop the files into the automations directory of an OpenHands / Agent Canvas
workspace and register the webhook events the recipe declares.

## Regenerate

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime openhands --json
`;
}

export function renderCursorReadme() {
  return `# Cursor rule adapters (generated)

Every \`*.mdc\` file in \`rules/\` is generated by
\`.agents/skills/platform/scripts/generate-adapters.mjs\`. Do not edit these files
by hand; the next regeneration overwrites them.

Each rule carries \`description\`, \`globs\`, and \`alwaysApply: false\` frontmatter
plus a body derived from the skill capabilities and its stop condition, so the
rule activates on demand instead of on every request.

## Install

Copy the rules into the Cursor rules directory of the target project:

    mkdir -p .cursor/rules
    cp .agents/skills/platform/adapters/cursor/rules/*.mdc .cursor/rules/

## Regenerate

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime cursor --json
`;
}

export function renderMcpReadme() {
  return `# MCP surface projection (generated)

\`manifest.json\` is generated by
\`.agents/skills/platform/scripts/generate-adapters.mjs\`. Do not edit it by hand;
the next regeneration overwrites it.

The manifest is a declarative projection of the bundle: one entry per skill
declaring its MCP \`tools\`, \`resources\`, and \`prompts\`, plus the \`trustTier\`
deciding whether the skill is exposed. Skills with \`trustTier >= 4\` stay out of
the allow-list (\`exposed: false\`, \`reason: trustTier>3\`) unless the generator
runs with \`--allow-high-trust\`. The executable MCP server lives in
\`.agents/skills/platform/mcp-server/\` and remains the runtime surface; this file
only declares what a client should see.

## Regenerate

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime mcp --json
`;
}

const RUNTIME_READMES = {
  claude: { path: 'claude/agents/README.md', render: renderClaudeReadme },
  kilo: { path: 'kilo/commands/README.md', render: renderKiloReadme },
  'openai-agents': { path: 'openai-agents/README.md', render: renderOpenAiReadme },
  langgraph: { path: 'langgraph/README.md', render: renderLangGraphReadme },
  openhands: { path: 'openhands/README.md', render: renderOpenHandsReadme },
  cursor: { path: 'cursor/README.md', render: renderCursorReadme },
  mcp: { path: 'mcp/README.md', render: renderMcpReadme },
};

export function renderRootReadme() {
  return `# Runtime adapters (generated)

Every file under this directory is generated by
\`.agents/skills/platform/scripts/generate-adapters.mjs\` from the canonical skills
(\`.agents/skills/**/SKILL.md\`, platform domain excluded) and their runtime
manifests (\`.agents/skills/platform/manifests/\`). Do not edit anything here by
hand: the next regeneration overwrites the tree and prunes files the run did not
produce. Regenerate after every frontmatter change, because a \`SKILL.md\` edit
re-locks the skill hash and changes its runtime manifest, so every adapter below
is a projection of that new manifest.

## Regenerate

Dry run (reports what would be written, writes nothing):

    node .agents/skills/platform/scripts/generate-adapters.mjs --json

Write everything (full run; prunes stale files):

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --json

One runtime, one runtime plus one skill:

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime claude
    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime langgraph --skill delivery/review-pr

Expose \`trustTier >= 4\` skills in the MCP manifest (off by default):

    node .agents/skills/platform/scripts/generate-adapters.mjs --write --runtime mcp --allow-high-trust

## Runtime matrix

| Runtime | Path | Format | Consumed by |
| --- | --- | --- | --- |
| Claude Code subagents | \`claude/agents/<domain>-<skill>.md\` | Markdown with YAML frontmatter (\`name\`, \`description\`, \`tools\`, \`model\`, optional \`permissionMode\` / \`disallowedTools\`) | Claude Code subagent discovery; copy the files to \`.claude/agents/\` |
| Kilo slash commands | \`kilo/commands/<domain>-<skill>.md\` | Markdown with YAML frontmatter (\`description\`) plus a synthesized workflow body | Kilo command registry; copy the files to \`.kilo/command/\` |
| OpenAI Agents SDK | \`openai-agents/<skill>.json\` | JSON agent manifest (\`name\`, \`instructions\`, \`model\`, \`runtime\`, \`guardrails\`) | OpenAI Agents SDK \`Agent(...)\` constructor |
| LangGraph workflows | \`langgraph/<skill>.yaml\` | YAML block-style workflow (\`nodes\`, \`edges\`, \`metadata\`) | LangGraph \`StateGraph\` builder |
| OpenHands / Agent Canvas | \`openhands/automations/<skill>.yaml\` | YAML automation recipe (\`trigger\`, \`runtime\`, \`steps\`, \`policy\`) | OpenHands / Agent Canvas automation runner |
| Cursor rules | \`cursor/rules/<skill>.mdc\` | MDC with frontmatter (\`description\`, \`globs\`, \`alwaysApply\`) | Cursor rules directory \`.cursor/rules/\` |
| MCP surface | \`mcp/manifest.json\` | Single JSON manifest declaring \`tools\`, \`resources\`, and \`prompts\` per skill | MCP clients; the executable server stays in \`.agents/skills/platform/mcp-server/\` |

## Field derivation

| Adapter field | Rule |
| --- | --- |
| \`description\` | Skill frontmatter description; the Claude subagent description is truncated to ${DESCRIPTION_LIMIT} characters. |
| \`tools\` | Runtime manifest \`execution.tools.allow\`, or \`Read, Grep, Glob\` when the manifest declares none. \`Bash\` is stripped from skills with \`trustTier >= 4\` that lack \`approvalRequired\`. |
| \`model\` (Claude) | \`modelTier\` mapping \`fast -> haiku\`, \`reasoning -> opus\`, \`router -> sonnet\`. |
| \`model\` (OpenAI) | \`modelTier\` mapping \`fast -> gpt-5-mini\`, \`reasoning -> gpt-5\`, \`router -> gpt-5.1\`. |
| \`permissionMode: default\` | The skill declares a mutating side effect (\`write-files\`, \`write-code\`, \`post-pr-comment\`, git and tracker mutations, and the other effects in \`MUTATING_SIDE_EFFECTS\`). |
| \`disallowedTools: Bash\` | \`risk: high\`. |
| workflow steps | The numbered items of the \`Process\` / \`Steps\` / \`Workflow\` section of \`SKILL.md\`, capped at ${MAX_STEPS}. |
| \`stopCondition\` / \`handoff_description\` | The skill frontmatter \`stopCondition\`. |
| MCP \`exposed\` | \`true\` for \`trustTier <= 3\`; \`false\` with \`reason: trustTier>3\` for \`trustTier >= 4\`, unless \`--allow-high-trust\` is passed. |

## Coverage

Every bundle skill gets exactly one adapter per runtime. The platform domain is
infrastructure and is not projected, so the corpus covers ${BUNDLE_SKILL_COUNT} skills.
`;
}

// --- pure generation: bundle in, adapter map out ---

function normalizeRuntimeSelection(selection) {
  const requested = toList(selection);
  if (!requested.length) return [...RUNTIMES];
  const unknown = requested.filter((runtime) => !RUNTIMES.includes(runtime));
  if (unknown.length) throw new Error(`unknown runtime: ${unknown.join(', ')} (expected ${RUNTIMES.join(', ')})`);
  return RUNTIMES.filter((runtime) => requested.includes(runtime));
}

export function generateAdapters(skills = [], manifests = [], options = {}) {
  const runtimes = normalizeRuntimeSelection(options.runtimes);
  const manifestIndex = indexManifests(manifests);
  const plans = (Array.isArray(skills) ? skills : [])
    .map((skill) => derivePlan(skill, manifestIndex.get(skillIdentity(skill)) ?? null))
    .sort((a, b) => (a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0));

  const out = {};
  for (const runtime of runtimes) out[runtime] = [];
  const adapterFile = (domain, name) => `${domain}-${name}`;

  for (const plan of plans) {
    const file = adapterFile(plan.domain, plan.name);
    if (out.claude) out.claude.push({ path: `claude/agents/${file}.md`, content: renderClaudeAgent(plan) });
    if (out.kilo) out.kilo.push({ path: `kilo/commands/${file}.md`, content: renderKiloCommand(plan) });
    if (out['openai-agents']) out['openai-agents'].push({ path: `openai-agents/${plan.name}.json`, content: renderOpenAiAgent(plan) });
    if (out.langgraph) out.langgraph.push({ path: `langgraph/${plan.name}.yaml`, content: renderLangGraphWorkflow(plan) });
    if (out.openhands) out.openhands.push({ path: `openhands/automations/${plan.name}.yaml`, content: renderOpenHandsAutomation(plan) });
    if (out.cursor) out.cursor.push({ path: `cursor/rules/${plan.name}.mdc`, content: renderCursorRule(plan) });
  }

  if (out.mcp) out.mcp.push({ path: 'mcp/manifest.json', content: renderMcpManifest(plans, options) });
  for (const runtime of runtimes) {
    const readme = RUNTIME_READMES[runtime];
    out[runtime].push({ path: readme.path, content: readme.render() });
  }
  return out;
}

// --- bundle + manifest readers ---

export function collectAdapterSkills(root = process.cwd()) {
  return collectSkills(root)
    .map((skill) => {
      const skillMd = path.join(root, skill.path, 'SKILL.md');
      const frontmatter = existsSync(skillMd) ? parseFrontmatter(readFileSync(skillMd, 'utf8')) : {};
      return { ...skill, frontmatter };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function collectRuntimeManifests(root = process.cwd()) {
  const dir = path.join(root, '.agents', 'skills', 'platform', 'manifests');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(MANIFEST_SUFFIX))
    .sort()
    .map((name) => {
      try {
        return JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// --- write + prune ---

function pruneAdapters(adaptersRoot, written) {
  let pruned = 0;
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        try {
          if (readdirSync(full).length === 0) rmSync(full, { recursive: true, force: true });
        } catch { /* directory vanished or is not empty: nothing to prune */ }
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!GENERATED_EXTENSIONS.has(ext)) continue;
      if (written.has(path.resolve(full))) continue;
      rmSync(full, { force: true });
      pruned += 1;
    }
  };
  walk(adaptersRoot);
  return pruned;
}

function writeAdapters(root, generated) {
  const adaptersRoot = path.join(root, '.agents', 'skills', 'platform', 'adapters');
  const written = new Set();
  const files = [];
  const readmes = [];
  for (const entries of Object.values(generated)) {
    for (const entry of entries) {
      const file = path.join(adaptersRoot, entry.path);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, entry.content);
      written.add(path.resolve(file));
      files.push(entry.path);
    }
  }
  mkdirSync(adaptersRoot, { recursive: true });
  const rootReadme = path.join(adaptersRoot, README_NAME);
  writeFileSync(rootReadme, renderRootReadme());
  written.add(path.resolve(rootReadme));
  readmes.push(README_NAME);
  return { adaptersRoot, written, files: files.sort(), readmes: readmes.sort() };
}

// --- drift audit ---

// The counterpart of `--write`: regenerate every adapter in memory and compare
// the bytes against the committed tree. Generation is a pure function of the
// bundle and the runtime manifests, so any difference is drift that a `--write`
// run would repair. Report-only by contract: the CLI itself always exits 0 in
// dry-run mode, so drift is surfaced through the report-only gate entry (its
// entry maps a non-empty error list to exit 1) instead of a gate failure.
export function auditAdapterDrift(root = process.cwd()) {
  const skills = collectAdapterSkills(root);
  const manifests = collectRuntimeManifests(root);
  const generated = generateAdapters(skills, manifests, {});
  const adaptersRoot = path.join(root, '.agents', 'skills', 'platform', 'adapters');
  const expected = new Set();
  const missing = [];
  const drifted = [];
  let adapters = 0;
  for (const entries of Object.values(generated)) {
    for (const entry of entries) {
      adapters += 1;
      const abs = path.join(adaptersRoot, entry.path);
      expected.add(path.resolve(abs));
      let current = null;
      try {
        current = readFileSync(abs, 'utf8');
      } catch {
        current = null;
      }
      if (current === null) missing.push(entry.path);
      else if (current !== entry.content) drifted.push(entry.path);
    }
  }
  // The root README is written next to the generated files but is not itself a
  // generated entry, so it is compared separately.
  const rootReadme = path.join(adaptersRoot, README_NAME);
  expected.add(path.resolve(rootReadme));
  let committedReadme = null;
  try {
    committedReadme = readFileSync(rootReadme, 'utf8');
  } catch {
    committedReadme = null;
  }
  if (committedReadme === null) missing.push(README_NAME);
  else if (committedReadme !== renderRootReadme()) drifted.push(README_NAME);

  // Files a `--write` run would prune carry the generated extensions but were
  // not produced by this regeneration, so they are stale.
  const stale = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!GENERATED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      if (!expected.has(path.resolve(full))) stale.push(path.relative(adaptersRoot, full));
    }
  };
  walk(adaptersRoot);

  const errors = [
    ...missing.map((file) => `missing adapter: ${file}`),
    ...drifted.map((file) => `adapter drift: ${file}`),
    ...stale.map((file) => `stale adapter: ${file}`),
  ];
  return {
    tool: 'generate-adapters.mjs (adapter drift audit)',
    root,
    adaptersDir: ADAPTERS_REL_DIR,
    status: errors.length ? 'drift' : 'in-sync',
    mode: 'report-only',
    skills: skills.length,
    adapters,
    missing,
    drifted,
    stale,
    errors,
    warnings: [],
  };
}

// --- CLI ---

function parseArgs(argv) {
  const args = { write: false, json: false, help: false, allowHighTrust: false, runtimes: [], skill: null };
  const pushRuntimes = (value) => {
    for (const runtime of String(value).split(',')) {
      const trimmed = runtime.trim();
      if (trimmed) args.runtimes.push(trimmed);
    }
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') args.write = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--allow-high-trust') args.allowHighTrust = true;
    else if (arg === '--runtime') {
      const value = argv[++i];
      if (value === undefined) throw new Error('--runtime requires a runtime name');
      pushRuntimes(value);
    } else if (arg.startsWith('--runtime=')) pushRuntimes(arg.slice('--runtime='.length));
    else if (arg === '--skill') {
      args.skill = argv[++i];
      if (args.skill === undefined) throw new Error('--skill requires <domain/skill>');
    } else if (arg.startsWith('--skill=')) args.skill = arg.slice('--skill='.length);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function countByRuntime(generated) {
  const out = {};
  for (const [runtime, entries] of Object.entries(generated)) out[runtime] = entries.length;
  return out;
}

function printHuman(report) {
  const where = report.adaptersDir;
  if (report.mode === 'write') {
    console.log(`[generate-adapters] wrote ${report.adapters} adapters for ${report.skills} skills to ${where}`);
  } else {
    console.log(`[generate-adapters] dry-run: ${report.adapters} adapters for ${report.skills} skills would be written to ${where}`);
    console.log('[generate-adapters] pass --write to apply');
  }
  for (const [runtime, count] of Object.entries(report.adaptersPerRuntime)) {
    console.log(`  ${runtime}: ${count}`);
  }
  if (report.pruned) console.log(`  pruned stale files: ${report.pruned}`);
  for (const entry of report.skipped ?? []) console.log(`  skipped ${entry.runtime}: ${entry.reason}`);
  if (report.withoutManifest.length) console.log(`  skills without a runtime manifest (frontmatter defaults used): ${report.withoutManifest.join(', ')}`);
}

async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`generate-adapters: ${error?.message ?? error}`);
    return 2;
  }
  if (args.help) {
    console.log(usage);
    return 0;
  }

  const root = process.cwd();
  let skills;
  let manifests;
  try {
    skills = collectAdapterSkills(root);
    manifests = collectRuntimeManifests(root);
  } catch (error) {
    console.error(`generate-adapters: cannot read the skills bundle: ${error?.message ?? error}`);
    return 2;
  }

  const manifestIndex = indexManifests(manifests);
  const withoutManifest = skills
    .map((skill) => skillIdentity(skill))
    .filter((identity) => !manifestIndex.has(identity));

  if (args.skill) {
    const wanted = String(args.skill).trim();
    skills = skills.filter((skill) => skillIdentity(skill) === wanted || skill.name === wanted);
    if (skills.length === 0) {
      console.error(`generate-adapters: no bundle skill matches "${wanted}"`);
      return 2;
    }
  }

  // The MCP manifest is a bundle-wide projection: a skill-filtered run would
  // silently shrink it to one entry, so that runtime is skipped instead and the
  // full manifest is left untouched.
  const skipped = [];
  let runtimeSelection = args.runtimes;
  if (args.skill && (!runtimeSelection.length || runtimeSelection.includes('mcp'))) {
    const base = runtimeSelection.length ? runtimeSelection : RUNTIMES;
    runtimeSelection = base.filter((runtime) => runtime !== 'mcp');
    skipped.push({ runtime: 'mcp', reason: 'bundle-wide manifest; regenerate without --skill' });
  }

  let generated;
  try {
    generated = generateAdapters(skills, manifests, {
      allowHighTrust: args.allowHighTrust,
      runtimes: runtimeSelection,
    });
  } catch (error) {
    console.error(`generate-adapters: ${error?.message ?? error}`);
    return 2;
  }

  const files = Object.values(generated).flatMap((entries) => entries.map((entry) => entry.path)).sort();
  const report = {
    tool: 'generate-adapters.mjs',
    status: args.write ? 'written' : 'dry-run',
    mode: args.write ? 'write' : 'dry-run',
    root,
    adaptersDir: ADAPTERS_REL_DIR,
    skills: skills.length,
    runtimes: Object.keys(generated),
    allowHighTrust: args.allowHighTrust,
    adaptersPerRuntime: countByRuntime(generated),
    adapters: files.length,
    files,
    withoutManifest,
    skipped,
    pruned: 0,
  };

  if (args.write) {
    try {
      const { adaptersRoot, written, readmes } = writeAdapters(root, generated);
      report.readmes = readmes;
      // Pruning is only safe on a full run: a filtered run must not delete the
      // adapters of the runtimes or skills it did not regenerate.
      if (!args.runtimes.length && !args.skill) report.pruned = pruneAdapters(adaptersRoot, written);
      report.adaptersRoot = adaptersRoot;
    } catch (error) {
      console.error(`generate-adapters: write failed: ${error?.message ?? error}`);
      return 2;
    }
  } else {
    report.readmes = [README_NAME, ...Object.keys(generated).map((runtime) => RUNTIME_READMES[runtime].path)];
  }

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  return 0;
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((error) => {
    console.error(`generate-adapters: ${error?.message ?? error}`);
    process.exit(2);
  });
}

export { PLATFORM_DIR, MANIFESTS_REL_DIR };
