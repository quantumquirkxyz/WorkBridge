import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { recordExecution } from './record-execution.mjs';

const repoRoot = process.cwd();
const skillsRoot = path.join(repoRoot, '.agents', 'skills');
const docsRoot = path.join(repoRoot, 'docs');
const lockPath = path.join(repoRoot, 'skills-lock.json');
const allowedRetiredTermFiles = new Set(['docs/agents/provenance.md']);

const retiredPatterns = [
  /\bask-matt\b/,
  /\bship-review-fix-loop\b/,
  /\bdoc-draft-pr\b/,
  /\bfrontend-development\b/,
  /\bARIES\b/,
  /\bMatt\b/,
];

const weakTemplatePatterns = [
  /A LONG/,
  /extremely extensive/,
  /point 1/,
  /Criterion 1/,
  /Acceptance criterion 1/,
  /localhost:3000/,
  /BE-2/,
  /OpenAPI spec/,
  /sharedInterests/,
];

const sideEffectExpectations = new Map([
  ['grill-with-docs', { effects: ['write-docs'], risk: 'low' }],
  ['handoff', { effects: ['write-temp-file'], risk: 'low' }],
  ['implement', { effects: ['write-code', 'commit-git', 'push-branch'], risk: 'medium' }],
  ['implement-review-fixes', { effects: ['write-code', 'commit-git', 'push-branch'], risk: 'medium' }],
  ['knowledge-curator', { effects: ['write-docs'], risk: 'low' }],
  ['make-project', { effects: ['create-project', 'create-project-fields', 'link-repositories'], risk: 'medium' }],
  ['plan-review-fixes', { effects: ['post-pr-comment'], risk: 'medium' }],
  ['publish-open-pr', { effects: ['push-branch', 'create-pull-request'], risk: 'medium' }],
  ['research', { effects: ['write-docs'], risk: 'low' }],
  ['resolving-merge-conflicts', { effects: ['write-code', 'commit-git', 'continue-merge-or-rebase'], risk: 'medium' }],
  ['review-pr', { effects: ['post-pr-comment'], risk: 'medium' }],
  ['code-review', { effects: ['post-pr-comment'], risk: 'medium' }],
  ['review-fix-loop', { effects: ['write-code', 'post-pr-comment', 'commit-git', 'push-branch'], risk: 'medium' }],
  ['ship-subissue', { effects: ['merge-pull-request', 'close-issue', 'update-project'], risk: 'high' }],
  ['skill-promoter', { effects: ['write-files', 'create-symlink', 'update-lockfile'], risk: 'medium' }],
  ['skill-template-generator', { effects: ['write-files'], risk: 'low' }],
  ['to-spec', { effects: ['create-issue'], risk: 'medium' }],
  ['to-tickets', { effects: ['create-issues', 'write-files'], risk: 'medium' }],
  ['triage', { effects: ['label-issue', 'post-comment', 'close-issue', 'write-files'], risk: 'medium' }],
]);

const localWriteEffects = new Set(['write-files', 'write-docs', 'write-code', 'write-temp-file']);
const localArtifactWritePatterns = [
  /\.agents\/skills\/platform\/artifacts/,
  /Emit `[^`]+` as both:\s*\n- JSON:/,
  /Markdown view: same filename/,
];
const workflowSkillPathPattern = /(?:^|\/)\.agents\/skills\/(?:delivery|routing|project)\//;
const qualityGatePathPattern = /(?:^|\/)\.agents\/skills\/platform\/quality-gates\//;

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, predicate = () => true) {
  const out = [];
  if (!(await exists(dir))) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (filePath.includes(`${path.sep}platform${path.sep}runs${path.sep}`)) continue;
    if (entry.name === 'node_modules') continue;
    if (entry.isDirectory()) out.push(...await walk(filePath, predicate));
    else if (entry.isFile() && predicate(filePath)) out.push(filePath);
  }
  return out;
}

async function collectSkillFiles(dir, out = []) {
  if (!(await exists(dir))) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (filePath.includes(`${path.sep}platform${path.sep}runs${path.sep}`)) continue;
    if (entry.isDirectory()) {
      const skillMd = path.join(filePath, 'SKILL.md');
      if (await exists(skillMd)) out.push(skillMd);
      else await collectSkillFiles(filePath, out);
    }
  }
  return out;
}

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

function skillName(file, text) {
  const fmName = text.match(/^name:\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
  if (fmName) return fmName;
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return path.basename(path.dirname(file));
}

function wordCount(text) {
  return (text.match(/[A-Za-z0-9_'-]+/g) ?? []).length;
}

function ruleCount(text) {
  return (text.match(/^\s*-\s*Rule:/gmi) ?? []).length;
}

function hasGenericSkillMetadata(text, fm) {
  const capabilities = Array.isArray(fm.capabilities) ? fm.capabilities : [];
  const outputs = Array.isArray(fm.outputs) ? fm.outputs : [];
  return capabilities.includes('execute the core process defined in the skill body')
    || capabilities.includes('produce a Markdown artifact or structured result')
    || outputs.includes('Markdown artifact with process steps and completion criteria')
    || fm.stopCondition === 'All process steps executed; artifact saved; criteria met.'
    || /problem or task defined by the skill body/i.test(text);
}

function listValue(value) {
  return Array.isArray(value) ? value : !value || value === '[]' ? [] : [value];
}

async function checkLinks(markdownFiles, errors) {
  const linkPattern = /\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/g;
  for (const file of markdownFiles) {
    const text = await fs.readFile(file, 'utf8');
    let match;
    while ((match = linkPattern.exec(text))) {
      let target = match[1].split('#')[0];
      if (!target || target.startsWith('/')) continue;
      target = target.replace(/^<|>$/g, '');
      const fullPath = path.normalize(path.join(path.dirname(file), target));
      if (!(await exists(fullPath))) {
        errors.push(`${path.relative(repoRoot, file)} links to missing ${match[1]}`);
      }
    }
  }
}

async function main() {
  const warnings = [];
  const errors = [];
  const markdownFiles = await walk(repoRoot, (file) => file.endsWith('.md'));
  const skillFiles = await collectSkillFiles(skillsRoot);
  const lock = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  const skillNames = new Set(skillFiles.map((file) => path.basename(path.dirname(file))));

  for (const file of [...markdownFiles, ...await walk(skillsRoot, (name) => name.endsWith('.sh'))]) {
    const text = await fs.readFile(file, 'utf8');
    const relative = path.relative(repoRoot, file);
    for (const pattern of retiredPatterns) {
      if (!allowedRetiredTermFiles.has(relative) && pattern.test(text)) {
        errors.push(`${relative} contains retired term ${pattern}`);
      }
    }
    for (const pattern of weakTemplatePatterns) {
      if (pattern.test(text)) warnings.push(`${relative} contains weak template/example marker ${pattern}`);
    }
  }

  for (const file of skillFiles) {
    const text = await fs.readFile(file, 'utf8');
    const fm = parseFrontmatter(text);
    const name = skillName(file, text);
    const body = text.replace(/^---[\s\S]*?---\s*/, '');
    if (fm.name && fm.name !== name) errors.push(`${name}: frontmatter name mismatch (${fm.name})`);
    if (/\*\*Propósito\*\*[\s\S]*\*\*Contenido sugerido\*\*[\s\S]*\*\*Estado\*\*/.test(body)) {
      warnings.push(`${name}: placeholder body should be expanded before release`);
    }
    if (wordCount(body) < 180) warnings.push(`${name}: short body (${wordCount(body)} words)`);
    if (wordCount(body) < 300 && ruleCount(body) === 0) warnings.push(`${name}: short/medium body has no explicit Rule lines`);
    if (hasGenericSkillMetadata(text, fm)) warnings.push(`${name}: generic metadata or boilerplate contract remains`);
    const expected = sideEffectExpectations.get(name);
    if (expected) {
      const actualEffects = new Set(listValue(fm.sideEffects));
      for (const effect of expected.effects) {
        if (!actualEffects.has(effect)) warnings.push(`${name}: expected side effect ${effect}`);
      }
      if (fm.risk !== expected.risk) warnings.push(`${name}: expected risk ${expected.risk} for declared side effects`);
    }
    const sideEffects = listValue(fm.sideEffects);
    const hasLocalWrite = sideEffects.some((effect) => localWriteEffects.has(effect));
    const relativeSkillPath = path.relative(repoRoot, file).replaceAll(path.sep, '/');
    const isWorkflowSkill = workflowSkillPathPattern.test(relativeSkillPath) || qualityGatePathPattern.test(relativeSkillPath);
    if (isWorkflowSkill && !hasLocalWrite) {
      for (const pattern of localArtifactWritePatterns) {
        if (pattern.test(body)) {
          errors.push(`${name}: local artifact write instruction without local write sideEffect`);
          break;
        }
      }
    }
    for (const dependency of fm.dependencies ?? []) {
      if (!skillNames.has(dependency)) errors.push(`${name}: dependency missing ${dependency}`);
    }
    for (const effect of fm.sideEffects ?? []) {
      if (effect === 'write-code' && fm.risk === 'low') warnings.push(`${name}: write-code skill marked low risk`);
    }
    const hash = crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
    if (lock.skills?.[name]?.hash !== hash) errors.push(`${name}: lock hash is stale`);
  }

  for (const name of Object.keys(lock.skills ?? {})) {
    if (!skillNames.has(name)) errors.push(`lockfile references missing skill ${name}`);
  }

  await checkLinks(markdownFiles, errors);

  const runPath = await recordExecution({
    repoRoot,
    skill: 'skill-audit',
    tool: 'skills:audit-semantics',
    contextPack: 'platform-semantic',
    status: errors.length ? 'fail' : 'pass',
    warnings,
    errors,
    extra: { markdownFiles: markdownFiles.length, skills: skillFiles.length },
  });

  console.log(JSON.stringify({
    skills: skillFiles.length,
    markdownFiles: markdownFiles.length,
    warnings,
    errors,
    status: errors.length ? 'fail' : 'pass',
    executionRecord: path.relative(repoRoot, runPath),
  }, null, 2));

  if (errors.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
