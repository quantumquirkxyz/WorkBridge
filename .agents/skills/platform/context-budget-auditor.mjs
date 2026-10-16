#!/usr/bin/env node
// context-budget-auditor.mjs - Measures the always-loaded L1 context budget of the skills bundle.
//
// Research basis (cited in the consuming skills):
// - Chroma "context rot" + Anthropic practice: the always-loaded L1 layer
//   (skill name + description + tags) is the scarcest resource in a session.
//   Claude Code truncates description + when_to_use at 1536 characters, and every
//   checked-in skill adds to every session's always-loaded context.
// - Token volume explains roughly 80% of multi-agent system performance variance
//   (Anthropic multi-agent research), so context cost is a first-class release
//   metric rather than an afterthought.
//
// Tokens are estimated as ceil(chars / 4) per field (name, description, tags),
// the same estimation rule the bundle uses elsewhere for unmeasured text.
// A skill is warned when name + description exceed 1200 combined characters,
// which approaches the 1536-character truncation seam.
//
// Usage:
//   node context-budget-auditor.mjs [--json] [--compare] [--no-write]
//   node context-budget-auditor.mjs --root <skills-dir> --metrics <file> [--json]
//
// Exit codes: 0 = report written (the auditor reports; the release gate decides),
//             2 = usage or I/O error.

import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(HERE, '..', '..', '..');

const DEFAULT_SKILLS_ROOT = path.join(repoRoot, '.agents', 'skills');
const DEFAULT_METRICS_FILE = path.join(HERE, 'metrics', 'context-budget.json');

const CHARS_PER_TOKEN = 4;
const TRUNCATION_SEAM_CHARS = 1536;
const WARNING_THRESHOLD_CHARS = 1200;
const TOP_SKILLS = 10;
const LAYER_FIELDS = ['name', 'description', 'tags'];

const usage = `context-budget-auditor options:
  --json                 emit machine-readable JSON
  --compare              diff the current bundle against the stored snapshot
  --root <dir>           skills root to audit (default: .agents/skills)
  --metrics <file>       snapshot file (default: platform/metrics/context-budget.json)
  --no-write             report without updating the stored snapshot
  --top <n>              skills listed in the ranking (default: 10)`;

export function estimateTokens(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function extractTags(frontmatter) {
  const raw = frontmatter.tags;
  if (Array.isArray(raw)) return raw.map((tag) => String(tag)).filter(Boolean);
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return trimmed ? [trimmed] : [];
}

export function parseL1Fields(text) {
  const fields = {};
  for (const field of LAYER_FIELDS) {
    const blockList = new RegExp(`^${field}:\\s*\\n((?:\\s+-.*\\n)+)`, 'm');
    const block = text.match(blockList);
    if (block) {
      fields[field] = block[1]
        .split('\n')
        .map((line) => line.replace(/^\s+-\s*/, '').replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      continue;
    }
    const inline = text.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
    if (inline) fields[field] = inline[1].trim().replace(/^["']|["']$/g, '');
  }
  return {
    name: typeof fields.name === 'string' ? fields.name : '',
    description: typeof fields.description === 'string' ? fields.description : '',
    tags: extractTags({ tags: fields.tags }),
  };
}

function skillFiles(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      const skill = path.join(full, 'SKILL.md');
      if (fsSync.existsSync(skill)) found.push(skill);
      else walk(full);
    }
  };
  walk(root);
  return found.sort();
}

// One measured sample from a skill's L1 layer. Shared by the walk-driven entry
// point (auditContextBudget) and the manifest-driven entry point (auditSkills),
// so both produce byte-identical reports for the same bundle.
function measureSample({ text, file, domain, fallbackName }) {
  const fields = parseL1Fields(text);
  const nameDescriptionChars = fields.name.length + fields.description.length;
  const tokens = LAYER_FIELDS.reduce(
    (total, field) => total + estimateTokens(Array.isArray(fields[field]) ? fields[field].join(' ') : fields[field]),
    0,
  );
  return {
    skill: fields.name || fallbackName,
    domain,
    file,
    nameChars: fields.name.length,
    descriptionChars: fields.description.length,
    nameDescriptionChars,
    tagCount: fields.tags.length,
    layerChars: fields.name.length + fields.description.length + fields.tags.join(' ').length,
    tokens,
    approachingTruncation: nameDescriptionChars > WARNING_THRESHOLD_CHARS,
  };
}

function reportFromSamples(samples, topN, displayRoot = DEFAULT_SKILLS_ROOT) {
  const skills = [...samples];
  skills.sort((a, b) => b.tokens - a.tokens || a.skill.localeCompare(b.skill));

  const perDomain = {};
  for (const skill of skills) {
    perDomain[skill.domain] = (perDomain[skill.domain] ?? 0) + skill.tokens;
  }

  const totalTokens = skills.reduce((total, skill) => total + skill.tokens, 0);
  const warnings = skills
    .filter((skill) => skill.approachingTruncation)
    .map((skill) => ({
      type: 'l1-truncation-risk',
      skill: skill.skill,
      message: `${skill.skill}: name + description is ${skill.nameDescriptionChars} characters (threshold ${WARNING_THRESHOLD_CHARS}, Claude Code truncates at ${TRUNCATION_SEAM_CHARS})`,
    }));

  return {
    tool: 'context-budget-auditor',
    skillsRoot: path.relative(repoRoot, displayRoot) || '.',
    skillCount: skills.length,
    totalTokens,
    averageTokens: skills.length ? Math.round(totalTokens / skills.length) : 0,
    perDomain: Object.fromEntries(Object.entries(perDomain).sort((a, b) => b[1] - a[1])),
    topSkills: skills.slice(0, topN).map(({ skill, domain, tokens, layerChars }) => ({ skill, domain, tokens, layerChars })),
    warnings,
    status: warnings.length ? 'warn' : 'pass',
  };
}

export function auditContextBudget(skillsRoot = DEFAULT_SKILLS_ROOT, { topN = TOP_SKILLS } = {}) {
  const files = skillFiles(skillsRoot);
  const samples = files.map((file) => measureSample({
    text: fsSync.readFileSync(file, 'utf8'),
    file: path.relative(repoRoot, file),
    domain: path.relative(skillsRoot, file).split(path.sep)[0],
    fallbackName: path.basename(path.dirname(file)),
  }));
  return reportFromSamples(samples, topN, skillsRoot);
}

// Manifest-driven entry point for the check-all gate: consumes the skill
// manifest built once per run (single walk + read of every SKILL.md) instead of
// re-walking the bundle. Each entry carries { path, dirPath, domain, dirName,
// text }; the L1 parse is this module's own parseL1Fields, so the report is
// identical to auditContextBudget over the same bundle.
export function auditSkills(manifest, { topN = TOP_SKILLS } = {}) {
  const samples = manifest.map((entry) => measureSample({
    text: entry.text,
    file: entry.path,
    domain: entry.domain,
    fallbackName: entry.dirName,
  }));
  return reportFromSamples(samples, topN);
}

export function diffSnapshots(previous, current) {
  if (!previous) return null;
  const previousPerDomain = previous.perDomain ?? {};
  const currentPerDomain = current.perDomain ?? {};
  const domains = [...new Set([...Object.keys(previousPerDomain), ...Object.keys(currentPerDomain)])].sort();
  const delta = current.totalTokens - previous.totalTokens;
  const growth = previous.totalTokens ? delta / previous.totalTokens : 0;
  return {
    previousDate: previous.date ?? null,
    previousTotalTokens: previous.totalTokens ?? 0,
    currentTotalTokens: current.totalTokens,
    deltaTokens: delta,
    growth: Number(growth.toFixed(4)),
    perDomain: domains.map((domain) => ({
      domain,
      previous: previousPerDomain[domain] ?? 0,
      current: currentPerDomain[domain] ?? 0,
      delta: (currentPerDomain[domain] ?? 0) - (previousPerDomain[domain] ?? 0),
    })),
  };
}

export function readSnapshot(file) {
  try {
    return JSON.parse(fsSync.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function snapshotOf(report) {
  return {
    date: new Date().toISOString().slice(0, 10),
    totalTokens: report.totalTokens,
    skillCount: report.skillCount,
    perDomain: report.perDomain,
    topSkills: report.topSkills,
  };
}

export function printReport(report, comparison) {
  const lines = [
    `context-budget-auditor: ${report.skillCount} skill(s), ${report.totalTokens} always-loaded L1 tokens`,
    `  average per skill: ${report.averageTokens} tokens`,
    '',
    'per-domain L1 tokens:',
    ...Object.entries(report.perDomain).map(([domain, tokens]) => `  ${domain}: ${tokens}`),
    '',
    `top ${report.topSkills.length} most expensive skills:`,
    ...report.topSkills.map((entry) => `  ${entry.skill} (${entry.domain}): ${entry.tokens} tokens / ${entry.layerChars} chars`),
  ];
  for (const warning of report.warnings) lines.push(`  [warning] ${warning.message}`);
  lines.push('');
  lines.push(`  estimation: ceil(chars / ${CHARS_PER_TOKEN}) per name, description, and tags; Claude Code truncates at ${TRUNCATION_SEAM_CHARS} characters`);
  if (comparison) {
    lines.push('');
    lines.push(`  snapshot ${comparison.previousDate}: ${comparison.previousTotalTokens} tokens -> now ${comparison.currentTotalTokens} tokens (${comparison.deltaTokens >= 0 ? '+' : ''}${comparison.deltaTokens}, ${(comparison.growth * 100).toFixed(1)}%)`);
    for (const domain of comparison.perDomain) {
      if (domain.delta === 0) continue;
      lines.push(`  ${domain.domain}: ${domain.previous} -> ${domain.current} (${domain.delta >= 0 ? '+' : ''}${domain.delta})`);
    }
  }
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const valueOf = (flag, fallback) => {
    const index = argv.indexOf(flag);
    return index === -1 ? fallback : (argv[index + 1] ?? fallback);
  };

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage);
    return 0;
  }

  const skillsRoot = path.resolve(process.cwd(), valueOf('--root', DEFAULT_SKILLS_ROOT));
  const metricsFile = path.resolve(process.cwd(), valueOf('--metrics', DEFAULT_METRICS_FILE));
  const topN = Number(valueOf('--top', TOP_SKILLS)) || TOP_SKILLS;
  const compare = argv.includes('--compare');
  const write = !compare && !argv.includes('--no-write');

  if (!fsSync.existsSync(skillsRoot)) {
    console.error(`context-budget-auditor: skills root not found: ${skillsRoot}`);
    return 2;
  }

  const report = auditContextBudget(skillsRoot, { topN });
  const previous = readSnapshot(metricsFile);
  const comparison = compare ? diffSnapshots(previous, report) : null;

  if (write) {
    fsSync.mkdirSync(path.dirname(metricsFile), { recursive: true });
    fsSync.writeFileSync(metricsFile, `${JSON.stringify(snapshotOf(report), null, 2)}\n`);
  }

  if (argv.includes('--json')) {
    console.log(JSON.stringify({
      ...report,
      metricsFile: path.relative(repoRoot, metricsFile),
      snapshotWritten: write,
      comparison,
    }, null, 2));
  } else {
    console.log(printReport(report, comparison));
  }
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error(`context-budget-auditor error: ${err.message}`);
    process.exit(2);
  });
}
