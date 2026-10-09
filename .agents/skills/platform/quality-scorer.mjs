#!/usr/bin/env node
// quality-scorer-v2.mjs — Scores a skill 0-100 with SE 2025-2026 dimensions
// Usage: node quality-scorer.mjs <skill-path> [--json] [--minimum-score=N]

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const DEFAULT_SKILL_PATH = '.agents/skills/skill-dev/skill-creator';

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

function wordCount(text) {
  return (text.match(/[A-Za-z0-9_'-]+/g) ?? []).length;
}

function countHeaders(text) {
  return (text.match(/^#{1,6}\s+.+$/gm) ?? []).length;
}

const VALID_MODEL_TIERS = ['reasoning', 'code', 'fast', 'router'];

function tierFor(score, lines, scripts, scriptLoc) {
  if (score >= 80 && lines >= 300 && scripts >= 2 && scriptLoc >= 500) return 'POWERFUL';
  if (score >= 60 && lines >= 200 && scripts >= 1) return 'STANDARD';
  return 'BASIC';
}

async function countScriptLoc(skillDir) {
  let total = 0;
  try {
    const entries = await fs.readdir(skillDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        const sub = await countScriptLoc(path.join(skillDir, e.name));
        total += sub;
      } else if (e.name.endsWith('.mjs') || e.name.endsWith('.js') || e.name.endsWith('.ts')) {
        try {
          const content = await fs.readFile(path.join(skillDir, e.name), 'utf8');
          total += content.split(/\r?\n/).length;
        } catch {}
      }
    }
  } catch {}
  return total;
}

async function scoreSkill(skillPath) {
  const skillFile = path.join(root, skillPath, 'SKILL.md');
  if (!await fs.access(skillFile).then(() => true).catch(() => false)) {
    return { error: `Skill not found: ${skillPath}` };
  }

  const text = await fs.readFile(skillFile, 'utf8');
  const fm = parseFrontmatter(text);
  const body = text.replace(/^---[\s\S]*?---\s*/, '');
  const lines = body.split(/\r?\n/).length;
  const tokens = wordCount(body);
  const headers = countHeaders(body);

  const scores = {
    frontmatterCompleteness: 0,
    bodyDepth: 0,
    sections: 0,
    assets: 0,
    behavioralSpec: 0,
    safety: 0,
    promptVersioning: 0,
    modelTierAlignment: 0,
    artifactSchema: 0,
    progressiveDisclosure: 0,
    observability: 0,
    regressionCoverage: 0,
    diataxisCompleteness: 0,
  };
  const issues = [];
  const warnings = [];

  // 1. Frontmatter completeness (max 10)
  const requiredFields = ['name', 'description', 'category'];
  const recommendedFields = ['version', 'maturity', 'capabilities', 'inputs', 'outputs', 'sideEffects', 'dependencies', 'stopCondition', 'risk', 'trustTier', 'maxIterations', 'modelTier', 'promptVersion', 'artifactType', 'evaluators', 'fixturesPath', 'diataxis', 'tags', 'compatibility', 'approvalRequired', 'approvalFor'];
  let fmScore = 0;
  for (const f of requiredFields) {
    if (fm[f] !== undefined && fm[f] !== '' && fm[f] !== []) fmScore += 3;
    else issues.push(`missing required frontmatter field: ${f}`);
  }
  for (const f of recommendedFields) {
    if (fm[f] !== undefined && fm[f] !== '' && fm[f] !== []) fmScore += 0.5;
  }
  scores.frontmatterCompleteness = Math.min(10, Math.round(fmScore));

  // 2. Body depth (max 10)
  let bodyScore = 0;
  if (tokens >= 500) bodyScore += 4;
  else if (tokens >= 300) bodyScore += 3;
  else if (tokens >= 180) bodyScore += 1;
  else warnings.push(`short body (${tokens} tokens)`);

  if (headers >= 10) bodyScore += 4;
  else if (headers >= 5) bodyScore += 3;
  else if (headers >= 3) bodyScore += 1;

  if (lines >= 100) bodyScore += 2;
  scores.bodyDepth = Math.min(10, bodyScore);

  // 3. Required sections (max 10)
  const requiredSections = ['Contract', 'Provenance', 'Artifact', 'Completion'];
  let secScore = 0;
  for (const sec of requiredSections) {
    if (body.includes(`## ${sec}`) || body.includes(`## ${sec} Criteria`)) secScore += 2.5;
    else issues.push(`missing ## ${sec} section`);
  }
  scores.sections = Math.min(10, Math.round(secScore));

  // 4. Assets presence (max 5)
  const skillDir = path.join(root, skillPath);
  let assetScore = 0;
  const dirs = ['scripts', 'references', 'assets', 'behavioral-fixtures', 'evals', 'schemas', 'prompts'];
  let foundDirs = 0;
  for (const dir of dirs) {
    if (await fs.access(path.join(skillDir, dir)).then(() => true).catch(() => false)) {
      assetScore += 0.5;
      foundDirs++;
    }
  }
  const skillMdExists = await fs.access(skillFile).then(() => true).catch(() => false);
  if (skillMdExists) assetScore += 2;
  scores.assets = Math.min(5, Math.round(assetScore));

  // 5. Behavioral spec (max 5)
  let behScore = 0;
  if (fm.stopCondition && fm.stopCondition !== '') behScore += 2;
  else issues.push('missing stopCondition');
  if (fm.maxIterations && Number(fm.maxIterations) > 0) behScore += 1;
  if (fm.inputs && fm.inputs.length > 0) behScore += 1;
  if (fm.outputs && fm.outputs.length > 0) behScore += 1;
  scores.behavioralSpec = Math.min(5, behScore);

  // 6. Safety (max 5)
  let safetyScore = 5;
  const riskyPatterns = [
    { pattern: /rm\s+-rf\s+\//, label: 'dangerous rm -rf /' },
    { pattern: /curl\s*\|?\s*bash/, label: 'curl | bash pattern' },
    { pattern: /eval\s*\(/, label: 'eval() usage' },
    { pattern: /chmod\s+777/, label: 'chmod 777' },
  ];
  for (const { pattern, label } of riskyPatterns) {
    if (pattern.test(body)) {
      safetyScore -= 2;
      issues.push(`risky pattern: ${label}`);
    }
  }
  if ((fm.risk === 'high' || fm.risk === 'critical') && !fm.sideEffects?.length) {
    safetyScore -= 1;
    warnings.push('high/critical risk skill without declared sideEffects');
  }
  scores.safety = Math.max(0, safetyScore);

  // 7. Prompt versioning (max 10)
  let pvScore = 0;
  if (fm.promptVersion && fm.promptVersion !== '') pvScore += 5;
  const promptsDir = path.join(root, '.agents', 'skills', 'prompts');
  try {
    const promptFiles = await fs.readdir(promptsDir);
    const skillName = path.basename(skillPath);
    if (promptFiles.some(f => f.includes(skillName) || f.includes('v2'))) pvScore += 3;
  } catch {}
  if (body.toLowerCase().includes('prompt') && (body.includes('version') || body.includes('v2'))) pvScore += 2;
  scores.promptVersioning = Math.min(10, pvScore);

  // 8. Model tier alignment (max 10)
  let mtScore = 0;
  if (fm.modelTier && VALID_MODEL_TIERS.includes(fm.modelTier)) mtScore += 5;
  else if (fm.modelTier) warnings.push(`invalid modelTier: ${fm.modelTier}`);
  const trustTierStr = String(fm.trustTier || '');
  const modelTierStr = String(fm.modelTier || '');
  if (trustTierStr === '1' && (modelTierStr === 'router' || modelTierStr === 'fast')) mtScore += 3;
  else if (trustTierStr === '2' && (modelTierStr === 'fast' || modelTierStr === 'reasoning')) mtScore += 3;
  else if (trustTierStr === '3' && (modelTierStr === 'code' || modelTierStr === 'reasoning')) mtScore += 3;
  else if (trustTierStr === '4' && (modelTierStr === 'code' || modelTierStr === 'reasoning')) mtScore += 3;
  else if (trustTierStr === '' && modelTierStr === '') {
    // no penalty if both missing
  } else if (trustTierStr === '' || modelTierStr === '') {
    // no penalty if only one missing
  } else {
    warnings.push(`modelTier mismatch: trustTier=${trustTierStr}, modelTier=${modelTierStr}`);
  }
  scores.modelTierAlignment = Math.min(10, mtScore);

  // 9. Artifact schema (max 10)
  let artScore = 0;
  const outputs = fm.outputs;
  if (Array.isArray(outputs) && outputs.length > 0 && typeof outputs[0] === 'object' && outputs[0].type) artScore += 5;
  else if (fm.outputs && String(fm.outputs).includes('type:') && String(fm.outputs).includes('object')) artScore += 3;
  if (fm.artifactType && fm.artifactType !== '') artScore += 2;
  const schemasDir = path.join(root, '.agents', 'skills', 'platform', 'schemas');
  try {
    const schemaFiles = await fs.readdir(schemasDir);
    const skillName = path.basename(skillPath);
    if (schemaFiles.some(f => f.includes(skillName.replace('quirk-', '').replace('opencode-', '')))) artScore += 3;
  } catch {}
  scores.artifactSchema = Math.min(10, artScore);

  // 10. Progressive disclosure (max 10)
  let pdScore = 0;
  const hasOperatingContract = body.includes('## Operating Contract');
  if (!hasOperatingContract) pdScore += 5;
  else warnings.push('Operating Contract block still present — should be externalized');
  if (body.includes('@include') || body.includes('include-file') || body.includes('contract-base')) pdScore += 3;
  const firstNonEmpty = body.split(/\r?\n/).find(l => l.trim() !== '');
  if (firstNonEmpty && firstNonEmpty.startsWith('#') && !firstNonEmpty.includes('Contract')) pdScore += 2;
  scores.progressiveDisclosure = Math.min(10, pdScore);

  // 11. Observability (max 5)
  let obsScore = 0;
  if (body.includes('record-execution') || body.includes('trace') || body.includes('otel')) obsScore += 2;
  if (body.includes('traceId') || body.includes('execution') || body.includes('metrics')) obsScore += 1;
  if (fm.promptVersion && fm.promptVersion !== '') obsScore += 2;
  scores.observability = Math.min(5, obsScore);

  // 12. Regression coverage (max 10)
  let regScore = 0;
  if (fm.fixturesPath && fm.fixturesPath !== '') {
    regScore += 5;
    try {
      const fixtureContent = await fs.readFile(path.join(root, fm.fixturesPath), 'utf8');
      if (fixtureContent.length > 0) regScore += 2;
      if (fixtureContent.includes('regression') || fixtureContent.includes('type: regression')) regScore += 2;
      else if (fixtureContent.includes('behavioral')) regScore += 1;
    } catch {
      warnings.push(`fixturesPath declared but file missing: ${fm.fixturesPath}`);
    }
  }
  scores.regressionCoverage = Math.min(10, regScore);

  // 13. Diátaxis completeness (max 5)
  let diaScore = 0;
  if (body.includes('## Process') || body.includes('## Steps') || body.includes('How to')) diaScore += 2;
  if (body.includes('## Contract') || body.includes('## Glossary') || body.includes('Reference')) diaScore += 2;
  if (body.includes('## Why') || body.includes('Principle') || body.includes('Rationale') || body.includes('Explanation')) diaScore += 1;
  scores.diataxisCompleteness = Math.min(5, diaScore);

  const total = Math.round(Object.values(scores).reduce((a, b) => a + b, 0));
  const scripts = foundDirs;
  const scriptLoc = await countScriptLoc(skillDir);
  const tier = tierFor(total, lines, scripts, scriptLoc);

  const grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'F';

  return {
    skill: path.basename(skillPath),
    path: skillPath,
    scores,
    total,
    grade,
    tier,
    issues,
    warnings,
    metrics: { tokens, lines, headers, scripts, scriptLoc },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const skillPath = args.find(a => !a.startsWith('--')) ?? DEFAULT_SKILL_PATH;
  const json = args.includes('--json');
  const minScore = parseInt(args.find(a => a.startsWith('--minimum-score='))?.split('=')[1]);

  const result = await scoreSkill(skillPath);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nSkill: ${result.skill}`);
    console.log(`Score: ${result.total}/100 (Grade ${result.grade}, Tier: ${result.tier})`);
    console.log(`Metrics: ${result.metrics.tokens} tokens, ${result.metrics.lines} lines, ${result.metrics.headers} headers, ${result.metrics.scripts} scripts, ${result.metrics.scriptLoc} script LOC`);
    if (result.issues.length) {
      console.log('\nIssues:');
      for (const i of result.issues) console.log(`  - ${i}`);
    }
    if (result.warnings.length) {
      console.log('\nWarnings:');
      for (const w of result.warnings) console.log(`  - ${w}`);
    }
    console.log('\nBreakdown:');
    for (const [key, value] of Object.entries(result.scores)) {
      console.log(`  ${key}: ${value}`);
    }
  }

  if (minScore !== undefined && result.total < minScore) {
    console.error(`\nScore ${result.total} is below minimum ${minScore}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
