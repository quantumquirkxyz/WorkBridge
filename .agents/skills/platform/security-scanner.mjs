#!/usr/bin/env node
// security-scanner.mjs - Scans skills for risky patterns, prompt injection, credential leakage
// Usage: node security-scanner.mjs <skill-path> [--json]

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const DEFAULT_SKILL_PATH = '.agents/skills/delivery/implement';

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

const CREDENTIAL_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey|api_secret|client_secret|private[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"][^'"]+['"]/i, label: 'hardcoded credential' },
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/i, label: 'hardcoded password' },
  { pattern: /(?:sk-|AKIA|AIza)[A-Za-z0-9_-]{20,}/, label: 'API key prefix' },
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i, label: 'private key block' },
];

const COMMAND_INJECTION_PATTERNS = [
  { pattern: /`[^`]*\$[^`]*`/, label: 'backtick command interpolation' },
  { pattern: /\$\([^)]*\$\([^)]*\)[^)]*\)/, label: '$() nested command substitution' },
  { pattern: /eval\s*\([^)]*\$[^)]*\)/, label: 'eval with variable' },
  { pattern: /exec\s*\([^)]*\$[^)]*\)/, label: 'exec with variable' },
  { pattern: /system\s*\([^)]*\$[^)]*\)/, label: 'system() with variable' },
  { pattern: /popen\s*\([^)]*\$[^)]*\)/, label: 'popen() with variable' },
  { pattern: /subprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True/, label: 'shell=True subprocess' },
];

const PROMPT_INJECTION_PATTERNS = [
  { pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i, label: 'prompt injection: ignore previous' },
  { pattern: /disregard\s+(?:all\s+)?(?:the\s+)?(?:above|previous)/i, label: 'prompt injection: disregard' },
  { pattern: /you\s+are\s+now\s+(?:a|an)\s+(?:DAN|unrestricted|evil)/i, label: 'prompt injection: role override' },
  { pattern: /pretend\s+(?:to\s+be|you\s+are)\s+(?:a\s+)?(?:jailbreak|unrestricted)/i, label: 'prompt injection: pretend mode' },
  { pattern: /\[INST\]|<<SYS>>/i, label: 'prompt injection markers' },
];

const APPROVAL_GATE_REQUIRED = ['write-files', 'write-code', 'commit-git', 'push-branch', 'create-pull-request', 'merge-pull-request', 'run-script'];

async function scanSkill(skillPath) {
  const skillFile = path.join(root, skillPath, 'SKILL.md');
  if (!await fs.access(skillFile).then(() => true).catch(() => false)) {
    return { error: `Skill not found: ${skillPath}` };
  }

  const text = await fs.readFile(skillFile, 'utf8');
  const fm = parseFrontmatter(text);
  const body = text.replace(/^---[\s\S]*?---\s*/, '');
  const skillDir = path.join(root, skillPath);

  const findings = [];
  const warnings = [];
  const info = [];

  // Check credential patterns
  for (const { pattern, label } of CREDENTIAL_PATTERNS) {
    const matches = body.match(pattern);
    if (matches) {
      findings.push({ severity: 'critical', category: 'credential-leakage', pattern: label, count: matches.length, sample: matches[0].slice(0, 40) + '...' });
    }
  }

  // Check command injection patterns
  for (const { pattern, label } of COMMAND_INJECTION_PATTERNS) {
    const matches = body.match(pattern);
    if (matches) {
      findings.push({ severity: 'high', category: 'command-injection', pattern: label, count: matches.length });
    }
  }

  // Check prompt injection in body
  for (const { pattern, label } of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(body)) {
      findings.push({ severity: 'critical', category: 'prompt-injection', pattern: label });
    }
  }

  // Check scripts directory for risky files
  const scriptsDir = path.join(skillDir, 'scripts');
  if (await fs.access(scriptsDir).then(() => true).catch(() => false)) {
    const scripts = await fs.readdir(scriptsDir);
    for (const script of scripts) {
      const scriptPath = path.join(scriptsDir, script);
      const scriptContent = await fs.readFile(scriptPath, 'utf8').catch(() => '');
      for (const { pattern, label } of COMMAND_INJECTION_PATTERNS) {
        if (pattern.test(scriptContent)) {
          findings.push({ severity: 'high', category: 'command-injection', file: `scripts/${script}`, pattern: label });
        }
      }
      for (const { pattern, label } of CREDENTIAL_PATTERNS) {
        if (pattern.test(scriptContent)) {
          findings.push({ severity: 'critical', category: 'credential-leakage', file: `scripts/${script}`, pattern: label });
        }
      }
    }
    info.push(`scripts directory: ${scripts.length} file(s)`);
  }

  // Check side effects without approval gate
  const sideEffects = Array.isArray(fm.sideEffects) ? fm.sideEffects : [];
  const requiresApproval = sideEffects.some(e => APPROVAL_GATE_REQUIRED.includes(e));
  if (requiresApproval && !body.includes('approval') && !body.includes('human-in-the-loop') && !body.includes('HITL')) {
    warnings.push({ category: 'missing-approval-gate', sideEffects, message: 'Skill has side effects but no approval gate mentioned' });
  }

  // Check for typosquatting-like names
  const name = fm.name || path.basename(skillDir);
  const suspiciousPatterns = [
    /claud/i, /gpt[0-9]/i, /openai/i, /anthropic/i, /copilot/i,
  ];
  for (const pat of suspiciousPatterns) {
    if (pat.test(name) && !name.includes('claude-code') && !name.includes('openai')) {
      warnings.push({ category: 'typosquatting-risk', name, message: `Skill name "${name}" resembles a popular brand` });
    }
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    skill: path.basename(skillPath),
    path: skillPath,
    findings,
    warnings,
    info,
    summary: {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    },
    status: findings.some(f => f.severity === 'critical') ? 'blocked' : findings.some(f => f.severity === 'high') ? 'review-required' : 'pass',
  };
}

async function main() {
  const args = process.argv.slice(2);
  const skillPath = args.find(a => !a.startsWith('--')) ?? DEFAULT_SKILL_PATH;
  const json = args.includes('--json');

  const result = await scanSkill(skillPath);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nSecurity Scan: ${result.skill}`);
    console.log(`Status: ${result.status}`);
    console.log(`Findings: ${result.summary.critical} critical, ${result.summary.high} high, ${result.summary.medium} medium, ${result.summary.low} low`);
    if (result.findings.length) {
      console.log('\nFindings:');
      for (const f of result.findings) {
        console.log(`  [${f.severity.toUpperCase()}] ${f.category}: ${f.pattern}${f.file ? ` (${f.file})` : ''}`);
      }
    }
    if (result.warnings.length) {
      console.log('\nWarnings:');
      for (const w of result.warnings) {
        console.log(`  [WARN] ${w.category}: ${w.message}`);
      }
    }
  }

  if (result.status === 'blocked') process.exit(2);
  if (result.status === 'review-required') process.exit(1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
