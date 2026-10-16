#!/usr/bin/env node
// skill-lint-security.mjs - pre-installation security linter for a single skill
// or a directory of skills. Written for third-party skills: it reuses the
// deterministic supply-chain scanner (security-scan-skills.mjs) and adds the
// undeclared-side-effect checks that only a skill's own frontmatter can answer.
//
// Checks added on top of the scanner:
//   undeclared-write-side-effect  body instructs file writes, sideEffects empty
//   undeclared-network            body reaches the network, no network side effect
//   undeclared-shell              body runs shell commands, no execution side effect
//   missing-approval              sideEffects declared without approvalRequired
//   trust-tier-risk-mismatch      trustTier out of line with the declared risk
//   secret-exfil-risk             body mixes credential material with a network call
//
// Scoring: each finding weighs critical 30, high 20, medium 10, low 3; the sum
// is capped at 100. Verdicts: install (< 20), review (20-59), quarantine (>= 60).
//
// Usage: node skill-lint-security.mjs [<skill-path|dir>] [--json] [--deep] [--min-score N]
// Exit codes: 0 every skill is install, 1 a skill needs review, 2 quarantine or usage error.

import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../skill-graph.mjs';
import { scanText, collectSkillFiles, RULES as SCAN_RULES } from '../security-scan-skills.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TARGET = path.resolve(process.cwd(), '.agents', 'skills', 'delivery', 'implement');
const MAX_WALK_DEPTH = 3;

const SEVERITY_WEIGHT = { critical: 30, high: 20, medium: 10, low: 3 };
const QUARANTINE_SCORE = 60;
const REVIEW_SCORE = 20;

const WRITE_INSTRUCTION = /\b(?:Write|Edit|NotebookEdit|writeFile|writeFileSync|createFile|create file|create the file|write the file|save the file|overwrite)\b/i;
const NETWORK_REFERENCE = /\b(?:WebFetch|WebSearch|fetch|curl|wget|http\b|https\b|urllib|axios|requests\.get)\b/i;
const SHELL_REFERENCE = /\b(?:shell|bash|sh\b|npm|npx|pnpm|yarn|node\b|subprocess|spawn|execute the command|run the tests?)\b/i;
const CREDENTIAL_REFERENCE = /\b(?:api[\s_-]*key|access[\s_-]*key|secret|secrets|token|tokens|password|passwd|credentials?|private[\s_-]*key|bearer)\b/i;
const NETWORK_CALL = /\b(?:curl|wget|fetch|urllib|requests\.(?:get|post)|axios|WebFetch|WebSearch)\b|https?:\/\//i;
// A line that forbids handling of credential material is guidance, not a use of it.
const PROHIBITION_LINE = /(?:do not|don't|never|avoid|no)\b[^\n]{0,40}(?:expose|commit|share|paste|print|log|hard-?code|store|leak|hardcode)/i;
const EXECUTION_EFFECT = /(?:exec|shell|command|run|npm|node|script|build|install|test|spawn|write-code)/i;
const NETWORK_EFFECT = /(?:network|web|http|fetch|remote|api|download|deploy|publish|sync)/i;

const OWN_CHECKS = [
  {
    id: 'undeclared-write-side-effect',
    severity: 'medium',
    detect: ({ frontmatter, body }) => {
      const effects = toList(frontmatter?.sideEffects);
      if (effects.length) return null;
      if (!WRITE_INSTRUCTION.test(body)) return null;
      return 'body instructs file writes but sideEffects is empty';
    },
  },
  {
    id: 'undeclared-network',
    severity: 'medium',
    detect: ({ frontmatter, body }) => {
      const effects = toList(frontmatter?.sideEffects);
      if (effects.some((effect) => NETWORK_EFFECT.test(effect))) return null;
      if (!NETWORK_REFERENCE.test(body)) return null;
      return 'body reaches the network without a network side effect';
    },
  },
  {
    id: 'undeclared-shell',
    severity: 'medium',
    detect: ({ frontmatter, body }) => {
      const effects = toList(frontmatter?.sideEffects);
      if (effects.some((effect) => EXECUTION_EFFECT.test(effect))) return null;
      if (!SHELL_REFERENCE.test(body)) return null;
      return 'body runs shell commands without an execution side effect';
    },
  },
  {
    id: 'missing-approval',
    severity: 'high',
    detect: ({ frontmatter }) => {
      const effects = toList(frontmatter?.sideEffects);
      if (!effects.length) return null;
      if (isTrue(frontmatter?.approvalRequired)) return null;
      return `sideEffects [${effects.join(', ')}] are declared without approvalRequired true`;
    },
  },
  {
    id: 'trust-tier-risk-mismatch',
    severity: 'high',
    detect: ({ frontmatter }) => {
      const risk = String(frontmatter?.risk ?? '').trim().toLowerCase();
      const tier = Number(frontmatter?.trustTier);
      if (!Number.isFinite(tier) || tier < 1) return null;
      if (risk === 'low' && tier >= 3) return `risk low sits above what trustTier ${tier} justifies`;
      if (risk === 'high' && tier <= 1) return `risk high sits below what trustTier ${tier} justifies`;
      return null;
    },
  },
  {
    id: 'secret-exfil-risk',
    severity: 'critical',
    detect: ({ body }) => {
      const lines = String(body ?? '').split(/\r?\n/);
      const credentialLines = lines.filter((line) => CREDENTIAL_REFERENCE.test(line) && !PROHIBITION_LINE.test(line));
      const callLines = lines.filter((line) => NETWORK_CALL.test(line));
      if (!credentialLines.length || !callLines.length) return null;
      return `body mixes credential references (${credentialLines.length} line(s)) with a network call (${callLines.length} line(s))`;
    },
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

function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text;
  return text.slice(text.indexOf('\n', end + 1) + 1);
}

function weightOf(severity) {
  return SEVERITY_WEIGHT[String(severity ?? '').trim().toLowerCase()] ?? 0;
}

// Pure core: score a skill from its frontmatter, its body and the findings the
// shared scanner produced over the same skill directory.
export function lintSkill(frontmatter = {}, body = '', scanFindings = [], options = {}) {
  const safeFrontmatter = frontmatter ?? {};
  const safeBody = String(body ?? '');
  const findings = [];
  for (const check of OWN_CHECKS) {
    let detail = null;
    try {
      detail = check.detect({ frontmatter: safeFrontmatter, body: safeBody, scanFindings });
    } catch {
      detail = null;
    }
    if (detail) findings.push({ rule: check.id, severity: check.severity, detail: String(detail) });
  }
  const scannerFindings = (scanFindings ?? []).map((finding) => ({
    rule: String(finding?.rule ?? 'scanner'),
    severity: String(finding?.severity ?? 'low'),
    message: String(finding?.message ?? ''),
    file: finding?.file ?? null,
    line: finding?.line ?? null,
    evidence: finding?.evidence ?? null,
  }));
  const rawScore = [...findings, ...scannerFindings].reduce((total, finding) => total + weightOf(finding.severity), 0);
  const riskScore = Math.min(100, rawScore);
  const verdict = riskScore >= QUARANTINE_SCORE ? 'quarantine' : riskScore >= REVIEW_SCORE ? 'review' : 'install';
  return {
    skill: options.skill ?? null,
    verdict,
    riskScore,
    findings,
    scan: {
      rules: SCAN_RULES.map((rule) => String(rule.id)),
      findings: scannerFindings,
    },
    scoreBreakdown: {
      ownChecks: findings.length,
      scannerFindings: scannerFindings.length,
      rawScore,
      cap: 100,
    },
  };
}

function scanSkillDir(skillDir, { deep = false } = {}) {
  const files = collectSkillFiles(skillDir, { deep });
  const findings = [];
  for (const file of files) {
    let text = '';
    try {
      text = fsSync.readFileSync(file.abs, 'utf8');
    } catch {
      continue;
    }
    findings.push(...scanText(text, file.abs));
  }
  return { files: files.length, findings };
}

function collectSkillDirs(target, depth = 0, out = []) {
  let stat;
  try {
    stat = fsSync.statSync(target);
  } catch {
    return out;
  }
  if (!stat.isDirectory()) return out;
  if (fsSync.existsSync(path.join(target, 'SKILL.md'))) {
    out.push(target);
    return out;
  }
  if (depth >= MAX_WALK_DEPTH) return out;
  for (const entry of fsSync.readdirSync(target, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    collectSkillDirs(path.join(target, entry.name), depth + 1, out);
  }
  return out;
}

function lintSkillDir(skillDir, options = {}) {
  let text = '';
  try {
    text = fsSync.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  } catch {
    return null;
  }
  const frontmatter = parseFrontmatter(text);
  const body = stripFrontmatter(text);
  const scan = scanSkillDir(skillDir, options);
  const result = lintSkill(frontmatter, body, scan.findings, {
    skill: path.relative(process.cwd(), skillDir) || skillDir,
    ...options,
  });
  return { ...result, scannedFiles: scan.files };
}

function parseArgs(argv) {
  const args = { target: null, json: false, deep: false, minScore: 0, help: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--json') args.json = true;
    else if (token === '--deep') args.deep = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--min-score') {
      args.minScore = Number(argv[i + 1]);
      if (!Number.isFinite(args.minScore)) throw new Error('--min-score requires a number');
      i += 1;
    } else if (token.startsWith('--min-score=')) {
      args.minScore = Number(token.slice('--min-score='.length));
      if (!Number.isFinite(args.minScore)) throw new Error('--min-score requires a number');
    } else if (token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    else if (args.target === null) args.target = token;
    else throw new Error(`unexpected argument: ${token}`);
  }
  return args;
}

function printHuman(results, minScore) {
  console.log('skill-lint-security - pre-installation security lint');
  console.log(`skills linted: ${results.length} (min score ${minScore})`);
  for (const result of results) {
    console.log(`\n${result.skill}`);
    console.log(`  verdict: ${result.verdict} - riskScore ${result.riskScore}`);
    for (const finding of result.findings) {
      console.log(`  [${finding.severity}] ${finding.rule} - ${finding.detail}`);
    }
    if (result.scan.findings.length) {
      console.log(`  scanner findings: ${result.scan.findings.length}`);
      for (const finding of result.scan.findings.slice(0, 10)) {
        const where = finding.file ? `${finding.file}:${finding.line ?? '?'}` : 'unknown';
        console.log(`    ${where} [${finding.severity}] ${finding.rule} - ${finding.message}`);
      }
    }
  }
  const tallies = results.reduce((acc, result) => {
    acc[result.verdict] = (acc[result.verdict] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nverdicts: ${Object.entries(tallies).map(([key, value]) => `${key} ${value}`).join(', ') || 'none'}`);
}

async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`skill-lint-security: ${error.message}`);
    return 2;
  }
  if (args.help) {
    console.log('usage: node skill-lint-security.mjs [<skill-path|dir>] [--json] [--deep] [--min-score N]');
    console.log('  <skill-path|dir>  a skill directory, a SKILL.md path, or a directory of skills');
    console.log('                    (default .agents/skills/delivery/implement)');
    console.log('  --json            emit the report as JSON');
    console.log('  --deep            also scan skill-bundled working directories');
    console.log('  --min-score N     only report skills whose riskScore is >= N');
    console.log('');
    console.log('Exit codes: 0 install, 1 review, 2 quarantine or usage error.');
    return 0;
  }
  const requested = args.target ? path.resolve(process.cwd(), args.target) : DEFAULT_TARGET;
  let stat;
  try {
    stat = fsSync.statSync(requested);
  } catch {
    console.error(`skill-lint-security: path not found: ${requested}`);
    return 2;
  }
  let skillDirs = [];
  if (stat.isDirectory()) {
    skillDirs = collectSkillDirs(requested);
  } else if (path.basename(requested) === 'SKILL.md') {
    skillDirs = collectSkillDirs(path.dirname(requested));
  } else {
    console.error(`skill-lint-security: not a skill directory or SKILL.md file: ${requested}`);
    return 2;
  }
  if (!skillDirs.length) {
    console.error(`skill-lint-security: no SKILL.md found under ${requested}`);
    return 2;
  }
  const options = { deep: args.deep };
  const linted = skillDirs.map((dir) => lintSkillDir(dir, options)).filter(Boolean);
  const results = linted.filter((result) => result.riskScore >= args.minScore);
  const verdicts = new Set(results.map((result) => result.verdict));

  if (args.json) {
    const payload = results.length === 1
      ? results[0]
      : {
        skills: results,
        totals: {
          skillsChecked: results.length,
          quarantined: results.filter((result) => result.verdict === 'quarantine').length,
          review: results.filter((result) => result.verdict === 'review').length,
          install: results.filter((result) => result.verdict === 'install').length,
          maxRiskScore: results.reduce((max, result) => Math.max(max, result.riskScore), 0),
        },
      };
    console.log(JSON.stringify(payload, null, 2));
  } else {
    printHuman(results, args.minScore);
  }

  if (verdicts.has('quarantine')) return 2;
  if (verdicts.has('review')) return 1;
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((error) => {
    console.error(`skill-lint-security: ${error?.message ?? error}`);
    process.exit(2);
  });
}

export { OWN_CHECKS, SEVERITY_WEIGHT, DEFAULT_TARGET, HERE };
