#!/usr/bin/env node
// trust-registry.mjs - trust scoring for
// third-party Agent Skills before install.
//
// The ecosystem warning is real: community
// skills can carry prompt injection, tool
// poisoning, or hidden payloads (the
// awesome-lists say "curated, not audited").
// This scanner is the pre-install gate the
// bundle applies to any skill it did not
// author:
//
//   T1 provenance   - does the skill declare
//                        an author and license?
//   T2 injection    - prompt-injection patterns
//                        in the body (ignore
//                        previous instructions,
//                        exfiltration, hidden
//                        instructions)
//   T3 tool poison  - body asks for blanket
//                        tools, network, or
//                        destructive commands
//   T4 obfuscation  - encoded payloads, long
//                        opaque strings, hidden
//                        unicode
//   T5 lockfile     - hash matches a published
//                        signature when one is
//                        provided
//   T6 policy       - side effects declared
//                        and inside the local
//                        tool-risk policy
//
// The score is 0-100; the verdict is one of
// trusted, review-required, blocked. A skill
// with no provenance is never "trusted".
//
// Usage:
//   node .agents/skills/platform/trust-registry.mjs <skill-dir> [--json]
//        [--signature <file>] [--policy <path>]
//
// Exit codes: 0 = trusted or review-required,
//             1 = blocked, 2 = usage.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './skill-graph.mjs';
import { readToolRiskPolicy, defaultPolicyPath } from './scripts/parse-tool-risk-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

const INJECTION_PATTERNS = [
  { pattern: /ignore (?:the |all )?(?:previous|above|prior) (?:instructions|directions|rules)/i, weight: 30, label: 'instruction override attempt' },
  { pattern: /do not (?:tell|reveal|mention|disclose) (?:the |user|anyone)/i, weight: 25, label: 'secrecy instruction' },
  { pattern: /(?:send|exfiltrate|upload|post) (?:the |all )?(?:file|content|data|secret|env|credential|key)/i, weight: 35, label: 'exfiltration attempt' },
  { pattern: /(?:system|secret|hidden) (?:prompt|instruction|message)/i, weight: 20, label: 'hidden instruction reference' },
  { pattern: /you (?:are|must|should) (?:now )?(?:always|never|only) (?:do|use|run)/i, weight: 15, label: 'behavior override' },
  { pattern: /<\|(?:im_start|im_end|endoftext)\|>/i, weight: 30, label: 'chat-template injection' },
];

const TOOL_POISON_PATTERNS = [
  { pattern: /(?:run|execute|eval|eval\() (?:anything|every|all commands)/i, weight: 25, label: 'blanket execution request' },
  { pattern: /rm -rf|mkfs|dd if=|chmod 777|:\(\)\{/i, weight: 40, label: 'destructive command' },
  { pattern: /curl [^|]*\|\s*(?:bash|sh)|wget [^|]*\|\s*(?:bash|sh)/i, weight: 35, label: 'remote code pipe' },
  { pattern: /tools:\s*\[?\s*["']?\*|all tools|every tool/i, weight: 20, label: 'blanket tool request' },
  { pattern: /(?:api[_-]?key|token|password|secret)[^.\n]{0,40}(?:env|process|getenv)/i, weight: 25, label: 'credential harvesting' },
];

const OBFUSCATION_PATTERNS = [
  { pattern: /[A-Za-z0-9+/]{120,}={0,2}/, weight: 15, label: 'long opaque base64-like string' },
  { pattern: /\\u[0-9a-fA-F]{4}(\\u[0-9a-fA-F]{4}){5,}/, weight: 20, label: 'unicode escape sequence' },
  { pattern: /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200F\uFEFF]/, weight: 25, label: 'hidden control characters' },
  { pattern: /atob\(|Buffer\.from\([^)]*,\s*['"]base64['"]\)/, weight: 25, label: 'runtime decoding' },
];

class UsageError extends Error {}

function parseArgs(argv) {
  const flags = { json: false, signature: null, policy: null, skillDir: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') flags.json = true;
    else if (token === '--help' || token === '-h') flags.help = true;
    else if (token === '--signature') { flags.signature = argv[i + 1]; i += 1; }
    else if (token === '--policy') { flags.policy = argv[i + 1]; i += 1; }
    else if (!token.startsWith('--') && !flags.skillDir) flags.skillDir = token;
    else throw new UsageError(`unknown argument: ${token}`);
  }
  return flags;
}

function readSkillFiles(skillDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && /\.(md|mjs|js|py|sh|json|yaml|yml|txt)$/.test(entry.name)) {
        files.push({ path: path.relative(skillDir, full), text: fs.readFileSync(full, 'utf8') });
      }
    }
  };
  walk(skillDir);
  return files;
}

function scanPatterns(text, rules) {
  const hits = [];
  for (const rule of rules) {
    if (rule.pattern.test(text)) hits.push({ label: rule.label, weight: rule.weight });
  }
  return hits;
}

function verifySignature(skillDir, signaturePath) {
  if (!signaturePath) return { checked: false, match: null };
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) return { checked: true, match: false, reason: 'SKILL.md missing' };
  const actual = crypto.createHash('sha256').update(fs.readFileSync(skillMd)).digest('hex');
  let expected = null;
  try {
    const sig = JSON.parse(fs.readFileSync(signaturePath, 'utf8'));
    expected = sig.hash ?? sig.sha256 ?? sig.skills?.[path.basename(skillDir)]?.hash ?? null;
  } catch {
    return { checked: true, match: false, reason: 'signature file is not readable JSON' };
  }
  return { checked: true, match: actual === expected, actual, expected };
}

function trustSkill(skillDir, policy) {
  const findings = [];
  const score = { starts: 100 };

  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    return {
      skill: path.basename(skillDir),
      score: 0,
      verdict: 'blocked',
      findings: [{ rule: 'T0', label: 'SKILL.md missing', weight: 100 }],
    };
  }

  const text = fs.readFileSync(skillMd, 'utf8');
  const meta = parseFrontmatter(text);

  // T1 - provenance. A skill inside the canonical
  // bundle carries the repository's provenance
  // (AUTHORSHIP.md); the author penalty applies
  // to third-party skills only.
  const inCanonicalBundle = skillDir.startsWith(path.join(repoRoot, '.agents', 'skills'));
  const hasAuthor = Boolean(meta.author || (meta.metadata && meta.metadata.author));
  const hasLicense = Boolean(meta.license);
  if (!hasAuthor && !inCanonicalBundle) { score.starts -= 15; findings.push({ rule: 'T1', label: 'no author declared', weight: 15 }); }
  if (!hasLicense) { score.starts -= 10; findings.push({ rule: 'T1', label: 'no license declared', weight: 10 }); }

  // T2/T3/T4 - content scans over every text file in the skill
  const files = readSkillFiles(skillDir);
  for (const file of files) {
    for (const hit of scanPatterns(file.text, INJECTION_PATTERNS)) {
      findings.push({ rule: 'T2', label: `${hit.label} in ${file.path}`, weight: hit.weight });
    }
    for (const hit of scanPatterns(file.text, TOOL_POISON_PATTERNS)) {
      findings.push({ rule: 'T3', label: `${hit.label} in ${file.path}`, weight: hit.weight });
    }
    for (const hit of scanPatterns(file.text, OBFUSCATION_PATTERNS)) {
      findings.push({ rule: 'T4', label: `${hit.label} in ${file.path}`, weight: hit.weight });
    }
  }

  // T5 - signature
  // (applied by the caller via --signature; folded in below)

  // T6 - policy alignment: declared side effects must be
  // coverable by the local tool-risk policy tiers
  const sideEffects = Array.isArray(meta.sideEffects) ? meta.sideEffects : [];
  const NETWORK_EFFECTS = new Set(['network', 'fetch-url', 'web-fetch', 'web-search']);
  if (sideEffects.some((effect) => NETWORK_EFFECTS.has(effect))) {
    const networkDeclared = policy.tools.some((tool) => tool.tier === 'network');
    if (!networkDeclared) {
      findings.push({ rule: 'T6', label: 'network side effect with no network tier in policy', weight: 20 });
    }
  }

  // Frontmatter name/description sanity (spec basics)
  if (!meta.name || !meta.description) {
    findings.push({ rule: 'T1', label: 'missing required spec fields (name/description)', weight: 15 });
  }

  const totalPenalty = findings.reduce((sum, finding) => sum + finding.weight, 0);
  const scoreValue = Math.max(0, 100 - totalPenalty);

  let verdict = 'trusted';
  if (scoreValue < 60) verdict = 'blocked';
  else if (scoreValue < 90 || findings.length > 0) verdict = 'review-required';

  return {
    skill: path.basename(skillDir),
    score: scoreValue,
    verdict,
    findings,
  };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help || !flags.skillDir) {
    console.log(`trust-registry options:
  <skill-dir>        the third-party skill directory to scan
  --signature file   published signature (skills-lock.json or bundle) to verify the hash
  --policy path      tool-risk policy (default policy/tool-risk.yaml)
  --json             machine-readable report
  --help             this help`);
    if (!flags.skillDir) return 2;
    return 0;
  }

  const skillDir = path.resolve(flags.skillDir);
  if (!fs.existsSync(skillDir)) throw new UsageError(`skill directory not found: ${skillDir}`);

  const policyPath = flags.policy ? path.resolve(flags.policy) : defaultPolicyPath(process.cwd());
  let policy = { tools: [] };
  try {
    policy = (await readToolRiskPolicy(policyPath)).policy;
  } catch {
    policy = { tools: [] };
  }

  const report = trustSkill(skillDir, policy);
  report.signature = verifySignature(skillDir, flags.signature ? path.resolve(flags.signature) : null);
  if (report.signature.checked && report.signature.match === false) {
    report.findings.push({ rule: 'T5', label: 'SKILL.md hash does not match the published signature', weight: 40 });
    report.score = Math.max(0, report.score - 40);
    if (report.score < 60) report.verdict = 'blocked';
    else report.verdict = 'review-required';
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[trust-registry] ${report.skill}: score ${report.score}, verdict ${report.verdict}`);
    for (const finding of report.findings) console.log(`[trust-registry]   ${finding.rule}: ${finding.label} (-${finding.weight})`);
    if (report.signature.checked) console.log(`[trust-registry]   T5: signature ${report.signature.match ? 'matches' : 'MISMATCH'}`);
  }

  return report.verdict === 'blocked' ? 1 : 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof UsageError) {
        console.error(`[trust-registry] ${error.message}`);
        process.exit(2);
      }
      console.error(`[trust-registry] error: ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
