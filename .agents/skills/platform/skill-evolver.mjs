#!/usr/bin/env node
// skill-evolver.mjs - Evidence-gated skill evolution
// Usage: node skill-evolver.mjs <skill-path> [--target-version N] [--dry-run] [--evidence <type>] [--verified-evidence <type>:<path-or-note> ...]

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const skillsRoot = path.join(root, '.agents', 'skills');
const auditDir = path.join(root, '.agents', 'skills', 'platform', 'audit');

const EVIDENCE_TYPES = {
  'security-scan': { required: ['critical', 'high'], description: 'Security scanner must pass with no critical/high findings' },
  'quality-score': { threshold: 60, description: 'Quality score must be >= 60/100' },
  'behavioral-fixture': { required: 1, description: 'At least 1 behavioral fixture must pass' },
  'regression-test': { required: 1, description: 'At least 1 regression fixture must pass' },
  'dependency-check': { description: 'Dependency graph must have no new cycles' },
  'peer-review': { description: 'At least 1 peer review approval recorded' },
};

const CHANGE_CATEGORIES = {
  'metadata': { evidence: ['quality-score'] },
  'operational-spec': { evidence: ['behavioral-fixture', 'quality-score'] },
  'behavioral-constraint': { evidence: ['behavioral-fixture', 'security-scan'] },
  'knowledge': { evidence: ['quality-score'] },
  'compatibility': { evidence: ['dependency-check', 'regression-test'] },
};

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

function listValue(value) { return Array.isArray(value) ? value : !value || value === '[]' ? [] : [value]; }

async function exists(filePath) { try { await fs.access(filePath); return true; } catch { return false; } }

function classifyChange(oldText, newText) {
  const oldFm = parseFrontmatter(oldText);
  const newFm = parseFrontmatter(newText);

  const metadataKeys = ['name', 'description', 'category', 'version', 'maturity'];
  const operationalKeys = ['capabilities', 'inputs', 'outputs', 'stopCondition', 'maxIterations', 'process'];
  const behavioralKeys = ['sideEffects', 'risk', 'trustTier', 'guardrails'];
  const knowledgeKeys = ['references', 'assets', 'scripts'];

  for (const key of metadataKeys) {
    if (JSON.stringify(oldFm[key]) !== JSON.stringify(newFm[key])) return 'metadata';
  }
  for (const key of operationalKeys) {
    if (JSON.stringify(oldFm[key]) !== JSON.stringify(newFm[key])) return 'operational-spec';
    const oldBody = oldText.replace(/^---[\s\S]*?---\s*/, '');
    const newBody = newText.replace(/^---[\s\S]*?---\s*/, '');
    if (oldBody.includes('## Process') !== newBody.includes('## Process')) return 'operational-spec';
  }
  for (const key of behavioralKeys) {
    if (JSON.stringify(oldFm[key]) !== JSON.stringify(newFm[key])) return 'behavioral-constraint';
  }
  for (const key of knowledgeKeys) {
    if (JSON.stringify(oldFm[key]) !== JSON.stringify(newFm[key])) return 'knowledge';
  }
  return 'knowledge';
}

async function verifyEvidence(evidenceType, skillPath, verifiedEvidence = new Map()) {
  const skillName = path.basename(skillPath);
  const verificationNote = verifiedEvidence.get(evidenceType);
  const awaitVerification = (reason) => verificationNote !== undefined
    ? { passed: true, status: 'passed', detail: 'verified-by-human: ' + verificationNote }
    : { passed: false, status: 'pending-verification', detail: 'pending-verification: ' + reason };
  switch (evidenceType) {
    case 'quality-score': {
      const { spawn } = await import('node:child_process');
      return new Promise((resolve) => {
        const proc = spawn('node', [path.join(root, '.agents/skills/platform/quality-scorer.mjs'), skillPath, '--json']);
        let stdout = '';
        proc.stdout.on('data', d => { stdout += d; });
        proc.on('close', () => {
          try {
            const result = JSON.parse(stdout);
            const threshold = EVIDENCE_TYPES['quality-score'].threshold || 60;
            const passed = result.total >= threshold;
            resolve({ passed, status: passed ? 'passed' : 'failed', detail: `score=${result.total}`, threshold });
          } catch { resolve({ passed: false, detail: 'parse-error' }); }
        });
      });
    }
    case 'security-scan': {
      const { spawn } = await import('node:child_process');
      return new Promise((resolve) => {
        const proc = spawn('node', [path.join(root, '.agents/skills/platform/security-scanner.mjs'), skillPath, '--json']);
        let stdout = '';
        proc.stdout.on('data', d => { stdout += d; });
        proc.on('close', () => {
          try {
            const result = JSON.parse(stdout);
            const allowed = EVIDENCE_TYPES['security-scan'].required || [];
            const blocked = result.findings.filter(f => allowed.includes(f.severity));
            const passed = blocked.length === 0;
            resolve({ passed, status: passed ? 'passed' : 'failed', detail: `findings=${result.findings.length}`, blocked });
          } catch { resolve({ passed: false, detail: 'parse-error' }); }
        });
      });
    }
    case 'behavioral-fixture':
    case 'regression-test': {
      const fixtureFile = path.join(root, `.agents/skills/platform/fixtures/${evidenceType === 'behavioral-fixture' ? 'behavioral' : 'regression'}/${skillName}.json`);
      const detail = await exists(fixtureFile)
        ? evidenceType + ' fixtures exist but were not executed by this script'
        : 'no ' + evidenceType + ' fixtures file';
      return awaitVerification(detail);
    }
    case 'dependency-check':
      return awaitVerification('dependency graph cycle check was not executed by this script');
    case 'peer-review':
      return awaitVerification('no peer review approval recorded');
    default:
      return awaitVerification('unknown evidence type');
  }
}

async function appendAuditRecord(record) {
  await fs.mkdir(auditDir, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const auditFile = path.join(auditDir, `${date}.jsonl`);
  await fs.appendFile(auditFile, JSON.stringify(record) + '\n', 'utf8');
}

async function evolveSkill(skillPath, targetVersion, evidenceTypes = [], dryRun = false, verifiedEvidence = new Map()) {
  const skillFile = path.join(root, skillPath, 'SKILL.md');
  if (!await exists(skillFile)) throw new Error(`Skill not found: ${skillPath}`);

  const originalText = await fs.readFile(skillFile, 'utf8');
  const fm = parseFrontmatter(originalText);
  const currentVersion = parseInt(fm.version) || 1;
  const newVersion = targetVersion || currentVersion + 1;
  const skillName = path.basename(skillPath);

  if (currentVersion >= newVersion && !targetVersion) {
    return { skill: skillName, status: 'no-change', currentVersion, targetVersion: newVersion };
  }

  const versionPattern = /^version:\s*(["']?)(\d+)\1/m;
  const updatedText = originalText.replace(versionPattern, (match, quote) => `version: ${quote}${newVersion}${quote}`);

  const changeCategory = await classifyChange(originalText, updatedText);
  const requiredEvidence = CHANGE_CATEGORIES[changeCategory]?.evidence || ['quality-score'];
  const evidenceToVerify = evidenceTypes.length > 0 ? evidenceTypes : requiredEvidence;

  const evidenceResults = [];
  for (const evType of evidenceToVerify) {
    const result = await verifyEvidence(evType, skillPath, verifiedEvidence);
    evidenceResults.push({ type: evType, passed: result.passed, status: result.status, detail: result.detail });
  }

  const verificationNotes = evidenceResults
    .filter(e => e.status === 'passed' && typeof e.detail === 'string' && e.detail.startsWith('verified-by-human'))
    .map(e => e.type + '=' + e.detail);
  const allPassed = evidenceResults.every(e => e.status === 'passed');
  const blocked = evidenceResults.filter(e => e.status !== 'passed');

  if (!allPassed && !dryRun) {
    const record = {
      timestamp: new Date().toISOString(),
      event: 'evolution-blocked',
      skill: skillName,
      changeCategory,
      version: `${currentVersion} -> ${newVersion}`,
      evidence: evidenceResults,
      blockedBy: blocked.map(b => b.type),
      pendingVerification: blocked.filter(b => b.status === 'pending-verification').map(b => b.type),
      verifiedEvidence: verificationNotes,
      actor: process.env.USER || 'unknown',
    };
    await appendAuditRecord(record);
    return { skill: skillName, status: 'blocked', changeCategory, version: `${currentVersion} -> ${newVersion}`, evidence: evidenceResults, blockedBy: blocked.map(b => b.type), pendingVerification: blocked.filter(b => b.status === 'pending-verification').map(b => b.type) };
  }

  if (!dryRun) {
    await fs.writeFile(skillFile, updatedText, 'utf8');
    const record = {
      timestamp: new Date().toISOString(),
      event: 'evolution-approved',
      skill: skillName,
      changeCategory,
      version: `${currentVersion} -> ${newVersion}`,
      evidence: evidenceResults,
      previousHash: crypto.createHash('sha256').update(originalText).digest('hex'),
      newHash: crypto.createHash('sha256').update(updatedText).digest('hex'),
      verifiedEvidence: verificationNotes,
      actor: process.env.USER || 'unknown',
    };
    await appendAuditRecord(record);
  }

  return {
    skill: skillName,
    status: allPassed ? (dryRun ? 'would-evolve' : 'evolved') : 'would-block',
    changeCategory,
    version: `${currentVersion} -> ${newVersion}`,
    evidence: evidenceResults,
    dryRun,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const skillPath = args.find(a => !a.startsWith('--'));
  const targetVersion = parseInt(args.find(a => a.startsWith('--target-version='))?.split('=')[1]);
  const dryRun = args.includes('--dry-run');
  const evidenceArg = args.find(a => a.startsWith('--evidence='));
  const evidenceTypes = evidenceArg ? evidenceArg.split('=')[1].split(',') : [];

  const verifiedEvidence = new Map();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    let value;
    if (arg === '--verified-evidence') value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : '';
    else if (arg.startsWith('--verified-evidence=')) value = arg.slice('--verified-evidence='.length);
    if (value) {
      for (const entry of value.split(',')) {
        const sep = entry.indexOf(':');
        if (sep > 0) verifiedEvidence.set(entry.slice(0, sep).trim(), entry.slice(sep + 1).trim() || 'verified');
      }
    }
  }

  if (!skillPath) {
    console.error('Usage: node skill-evolver.mjs <skill-path> [--target-version N] [--dry-run] [--evidence type1,type2] [--verified-evidence type:path-or-note ...]');
    process.exit(1);
  }

  const result = await evolveSkill(skillPath, targetVersion, evidenceTypes, dryRun, verifiedEvidence);
  console.log(JSON.stringify(result, null, 2));

  if (result.status === 'blocked') process.exit(1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
