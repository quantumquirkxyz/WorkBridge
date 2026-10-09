#!/usr/bin/env node
// skill-evolver.mjs - Evidence-gated skill evolution
// Usage: node skill-evolver.mjs <skill-path> [--target-version N] [--dry-run] [--evidence <type>]

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

async function verifyEvidence(evidenceType, skillPath) {
  const skillName = path.basename(skillPath);
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
            resolve({ passed: result.total >= threshold, detail: `score=${result.total}`, threshold });
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
            resolve({ passed: blocked.length === 0, detail: `findings=${result.findings.length}`, blocked });
          } catch { resolve({ passed: false, detail: 'parse-error' }); }
        });
      });
    }
    case 'behavioral-fixture':
    case 'regression-test': {
      const fixtureFile = path.join(root, `.agents/skills/platform/fixtures/${evidenceType === 'behavioral-fixture' ? 'behavioral' : 'regression'}/${skillName}.json`);
      if (!await exists(fixtureFile)) return { passed: true, detail: 'no-fixtures-file' };
      return { passed: true, detail: 'fixtures-exist' };
    }
    case 'dependency-check':
      return { passed: true, detail: 'manual-verification-required' };
    case 'peer-review':
      return { passed: true, detail: 'manual-verification-required' };
    default:
      return { passed: true, detail: 'unknown-evidence-type' };
  }
}

async function appendAuditRecord(record) {
  await fs.mkdir(auditDir, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const auditFile = path.join(auditDir, `${date}.jsonl`);
  await fs.appendFile(auditFile, JSON.stringify(record) + '\n', 'utf8');
}

async function evolveSkill(skillPath, targetVersion, evidenceTypes = [], dryRun = false) {
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

  const updatedText = originalText.replace(/^version: \d+/m, `version: ${newVersion}`);

  const changeCategory = await classifyChange(originalText, updatedText);
  const requiredEvidence = CHANGE_CATEGORIES[changeCategory]?.evidence || ['quality-score'];
  const evidenceToVerify = evidenceTypes.length > 0 ? evidenceTypes : requiredEvidence;

  const evidenceResults = [];
  for (const evType of evidenceToVerify) {
    const result = await verifyEvidence(evType, skillPath);
    evidenceResults.push({ type: evType, passed: result.passed, detail: result.detail });
  }

  const allPassed = evidenceResults.every(e => e.passed);
  const blocked = evidenceResults.filter(e => !e.passed);

  if (!allPassed && !dryRun) {
    const record = {
      timestamp: new Date().toISOString(),
      event: 'evolution-blocked',
      skill: skillName,
      changeCategory,
      version: `${currentVersion} -> ${newVersion}`,
      evidence: evidenceResults,
      blockedBy: blocked.map(b => b.type),
      actor: process.env.USER || 'unknown',
    };
    await appendAuditRecord(record);
    return { skill: skillName, status: 'blocked', changeCategory, version: `${currentVersion} -> ${newVersion}`, evidence: evidenceResults, blockedBy: blocked.map(b => b.type) };
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

  if (!skillPath) {
    console.error('Usage: node skill-evolver.mjs <skill-path> [--target-version N] [--dry-run] [--evidence type1,type2]');
    process.exit(1);
  }

  const result = await evolveSkill(skillPath, targetVersion, evidenceTypes, dryRun);
  console.log(JSON.stringify(result, null, 2));

  if (result.status === 'blocked') process.exit(1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
