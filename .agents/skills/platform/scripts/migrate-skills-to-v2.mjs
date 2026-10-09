#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKILLS_DIR = path.join(ROOT, '.agents', 'skills');
const REPORT_PATH = path.join(ROOT, '.agents', 'skills', 'platform', 'scripts', 'migration-report.json');

const EXCLUDED_TOP_CATEGORIES = new Set(['platform', 'prompts', 'system-design', 'performance']);
const EXCLUDED_SUBDIRS = new Set([
  'agent-cards', 'node_modules', '.git', 'dist', 'scripts', 'artifacts',
  'fixtures', 'schemas', 'traces', 'state', 'runs', 'evals', 'prompts',
  'assets', 'references', 'behavioral-fixtures', 'tests', 'mcp-server', 'audit'
]);

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const FORCE = ARGS.includes('--force');
let CATEGORY_FILTER = null;
for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i] === '--category' && ARGS[i + 1]) {
    CATEGORY_FILTER = ARGS[i + 1];
    i++;
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { content, frontmatter: {}, body: content };
  const fm = {};
  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const value = keyMatch[2].trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        fm[key] = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
      } else if (value.startsWith('"') && value.endsWith('"')) {
        fm[key] = value.slice(1, -1);
      } else {
        fm[key] = value;
      }
    }
  }
  const body = content.slice(match[0].length).replace(/^\n+/, '');
  return { content, frontmatter: fm, body };
}

function serializeFrontmatter(fm) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
    } else if (value !== undefined && value !== null) {
      lines.push(`${key}: "${value}"`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function isV2(fm, body) {
  return (
    body.includes('## Contract') &&
    !body.includes('## Operating Contract') &&
    fm.promptVersion === '2.0'
  );
}

function inferArtifactType(category, name) {
  const lower = name.toLowerCase();
  if (lower.includes('review')) return 'review';
  if (lower.includes('implement') || lower.includes('tdd')) return 'implementation';
  if (lower.includes('design') || lower.includes('api') || lower.includes('router') || lower.includes('ask') || lower.includes('plan')) return 'plan';
  if (lower.includes('spec')) return 'spec';
  if (lower.includes('ticket')) return 'ticket';
  if (lower.includes('pr') || lower.includes('publish')) return 'pull-request';
  if (lower.includes('adr') || lower.includes('docs')) return 'adr';
  if (lower.includes('test')) return 'test-strategy';
  if (lower.includes('bug') || lower.includes('diagnos')) return 'diagnosis';
  if (lower.includes('research')) return 'research';
  if (lower.includes('flag')) return 'feature-flag';
  if (lower.includes('cache')) return 'cache-strategy';
  if (lower.includes('queue')) return 'queue-design';
  if (lower.includes('deploy')) return 'deployment';
  if (lower.includes('security')) return 'security';
  if (lower.includes('auth')) return 'authentication';
  if (lower.includes('payment')) return 'payment';
  if (lower.includes('data')) return 'data';
  if (lower.includes('model')) return 'model';
  if (lower.includes('agent')) return 'agent';
  if (lower.includes('workflow')) return 'workflow';
  return category;
}

function inferModelTier(trustTier, category, name) {
  const lower = name.toLowerCase();
  if (category === 'routing') return 'router';
  if (category === 'platform') {
    if (lower.includes('quality-gate') || lower.includes('gate-')) return 'fast';
    return 'router';
  }
  if (lower.includes('agent-card') || lower.includes('mcp-server')) return 'router';
  if (lower.includes('implement') || lower.includes('tdd')) return 'code';
  if (trustTier === 1) return 'reasoning';
  if (trustTier === 2) return 'fast';
  if (trustTier === 3) {
    if (category === 'project') return 'reasoning';
    if (['implementation', 'spec', 'ticket'].includes(inferArtifactType(category, name))) return 'code';
    return 'reasoning';
  }
  if (trustTier === 4) return 'code';
  return 'standard';
}

function toPascalCase(str) {
  return str.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
}

function extractOldContract(body) {
  const operatingMatch = body.match(/## Operating Contract\s*\n([\s\S]*?)(?=\n## |\n# |$)/);
  const contractMatch = body.match(/## Contract\s*\n([\s\S]*?)(?=\n## |\n# |$)/);
  const source = operatingMatch ? operatingMatch[1] : contractMatch ? contractMatch[1] : null;
  if (!source) return null;

  const input = source.match(/\*\*Input:\*\* (.+)/)?.[1] || source.match(/- Input: (.+)/)?.[1] || '';
  const output = source.match(/\*\*Output:\*\* (.+)/)?.[1] || source.match(/- Output: (.+)/)?.[1] || '';
  const boundary = source.match(/\*\*Boundary:\*\* (.+)/)?.[1] || source.match(/- Boundary: (.+)/)?.[1] || '';

  return { input, output, boundary };
}

function buildContractSection(oldContract) {
  if (!oldContract) {
    return `## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.
`;
  }
  const rules = [];
  if (oldContract.boundary) {
    rules.push(`- Rule: ${oldContract.boundary}`);
  }
  rules.push('- Rule: documented standards override defaults; explicit project rules take precedence.');
  rules.push('- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.');

  return `## Contract

- Input: ${oldContract.input || 'skill invocation with the user\'s request and available context.'}
- Output: ${oldContract.output || 'a structured artifact or guidance aligned to the skill\'s declared outputs.'}
- Scope: ${oldContract.boundary || 'stay within the skill\'s declared boundaries; do not broaden without explicit direction.'}
${rules.join('\n')}
`;
}

function buildProvenanceSection(name, description) {
  return `## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures

`;
}

function buildArtifactSection(name, fm) {
  const artifactName = toPascalCase(name) + 'Artifact';
  const artifactDir = `.agents/skills/platform/artifacts/${name}`;
  return `## Artifact

Emit \`${artifactName}\` as both:
- JSON: \`${artifactDir}/{identifier}.json\`
- Markdown view: same filename with \`.md\` extension

`;
}

function buildCompletionSection() {
  return `## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off

`;
}

function migrateSkill(skillPath, skillName, category, DRY_RUN, FORCE) {
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  let content;
  try {
    content = fs.readFileSync(skillMdPath, 'utf8');
  } catch (err) {
    return { status: 'error', skill: `${category}/${skillName}`, message: err.message };
  }

  const { frontmatter: fm, body } = parseFrontmatter(content);

  if (!FORCE && isV2(fm, body)) {
    return { status: 'skipped', skill: `${category}/${skillName}`, reason: 'already v2' };
  }

  let newBody = body;

  // 1. Remove ## Operating Contract
  const operatingMatch = newBody.match(/## Operating Contract\s*\n([\s\S]*?)(?=\n## |\n# |$)/);
  if (operatingMatch) {
    newBody = newBody.replace(/## Operating Contract\s*\n[\s\S]*?(?=\n## |\n# |$)/, '');
    newBody = newBody.replace(/^\n+/, '');
  }

  // 2. Build new ## Contract
  const oldContract = extractOldContract(newBody);
  const contractSection = buildContractSection(oldContract);

  // Remove existing ## Contract if present
  const contractRegex = /## Contract\s*\n([\s\S]*?)(?=\n## |\n# |$)/;
  if (contractRegex.test(newBody)) {
    newBody = newBody.replace(contractRegex, '');
    newBody = newBody.replace(/^\n+/, '');
  }

  // Insert ## Contract at top
  newBody = contractSection + '\n' + newBody;
  newBody = newBody.replace(/^\n+/, '');

  // 3. Add ## Provenance after ## Contract
  const provenanceSection = buildProvenanceSection(skillName, fm.description || '');
  const provenanceMatch = newBody.match(/^(## Contract\s*\n[\s\S]*?)(\n## |\n# |$)/);
  if (provenanceMatch) {
    const insertPoint = provenanceMatch.index + provenanceMatch[1].length;
    newBody = newBody.slice(0, insertPoint) + '\n' + provenanceSection + (provenanceMatch[2] ? provenanceMatch[2] : '') + newBody.slice(insertPoint);
  } else {
    newBody = provenanceSection + '\n' + newBody;
  }

  // 4. Add ## Artifact after ## Provenance
  const artifactSection = buildArtifactSection(skillName, fm);
  const artifactMatch = newBody.match(/^(## Contract\s*\n[\s\S]*?\n## Provenance\s*\n[\s\S]*?)(\n## |\n# |$)/);
  if (artifactMatch) {
    const insertPoint = artifactMatch.index + artifactMatch[1].length;
    newBody = newBody.slice(0, insertPoint) + '\n' + artifactSection + (artifactMatch[2] ? artifactMatch[2] : '') + newBody.slice(insertPoint);
  } else {
    // Fallback: insert after Contract
    const introEndMatch = newBody.match(/^(## Contract\s*\n[\s\S]*?\n)(\n|## |# )/);
    if (introEndMatch) {
      const insertPoint = introEndMatch.index + introEndMatch[1].length;
      newBody = newBody.slice(0, insertPoint) + '\n' + artifactSection + newBody.slice(insertPoint);
    } else {
      newBody = artifactSection + '\n' + newBody;
    }
  }

  // 5. Add/update ## Completion at the end, before @include
  const completionSection = buildCompletionSection();
  const includeMatch = newBody.match(/\n---\n@include \.agents\/skills\/platform\/contract-base\.xml\s*$/);
  if (includeMatch) {
    const insertPoint = includeMatch.index;
    newBody = newBody.slice(0, insertPoint) + '\n' + completionSection + newBody.slice(insertPoint);
  } else {
    // Remove old Completion criteria if exists
    const oldCompletionMatch = newBody.match(/\n## Completion[^\n]*\n[\s\S]*$/);
    if (oldCompletionMatch) {
      newBody = newBody.slice(0, oldCompletionMatch.index);
    }
    newBody = newBody.trimEnd() + '\n\n' + completionSection;
  }

  // Ensure @include at end
  newBody = newBody.trimEnd();
  if (!newBody.endsWith('---\n@include .agents/skills/platform/contract-base.xml')) {
    newBody += '\n---\n@include .agents/skills/platform/contract-base.xml';
  }

  // 6. Update frontmatter
  const newFm = { ...fm };
  newFm.promptVersion = '2.0';
  newFm.artifactType = inferArtifactType(category, skillName);
  newFm.modelTier = inferModelTier(parseInt(fm.trustTier) || 1, category, skillName);
  newFm.evaluators = ['behavioral', 'regression'];
  newFm.fixturesPath = `.agents/skills/platform/fixtures/behavioral/${skillName}.json`;
  newFm.diataxis = 'how-to';
  newFm.tags = [category];
  newFm.compatibility = [];
  newFm.approvalRequired = false;
  newFm.approvalFor = [];

  const newFrontmatter = serializeFrontmatter(newFm);
  const newContent = newFrontmatter + '\n\n' + newBody;

  if (DRY_RUN) {
    return { status: 'would-migrate', skill: `${category}/${skillName}` };
  }

  try {
    fs.writeFileSync(skillMdPath, newContent, 'utf8');
    return { status: 'migrated', skill: `${category}/${skillName}` };
  } catch (err) {
    return { status: 'error', skill: `${category}/${skillName}`, message: err.message };
  }
}

async function findSkillDirs() {
  const categories = await fs.promises.readdir(SKILLS_DIR, { withFileTypes: true });
  const skills = [];
  for (const cat of categories) {
    if (!cat.isDirectory()) continue;
    if (EXCLUDED_TOP_CATEGORIES.has(cat.name)) continue;
    if (CATEGORY_FILTER && cat.name !== CATEGORY_FILTER) continue;
    const catPath = path.join(SKILLS_DIR, cat.name);
    const entries = await fs.promises.readdir(catPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !EXCLUDED_SUBDIRS.has(entry.name)) {
        const skillMdPath = path.join(catPath, entry.name, 'SKILL.md');
        try {
          await fs.promises.access(skillMdPath);
          skills.push({ category: cat.name, name: entry.name, path: path.join(catPath, entry.name) });
        } catch {
          // skip
        }
      }
    }
  }
  return skills;
}

async function main() {
  const skills = await findSkillDirs();
  const report = {
    generatedAt: new Date().toISOString(),
    DRY_RUN,
    categoryFilter: CATEGORY_FILTER || 'all',
    FORCE,
    summary: { total: 0, v2: 0, migrated: 0, skipped: 0, errors: 0 },
    skills: []
  };

  for (const skill of skills) {
    const skillMdPath = path.join(skill.path, 'SKILL.md');
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const { frontmatter: fm, body } = parseFrontmatter(content);
    const v2 = isV2(fm, body);

    report.summary.total++;

    if (v2) {
      report.summary.v2++;
      report.skills.push({ category: skill.category, name: skill.name, status: 'v2' });
      continue;
    }

    const result = migrateSkill(skill.path, skill.name, skill.category, DRY_RUN, FORCE);

    if (result.status === 'v2') {
      report.summary.v2++;
    } else if (result.status === 'skipped') {
      report.summary.skipped++;
    } else if (result.status === 'migrated' || result.status === 'would-migrate') {
      report.summary.migrated++;
    } else {
      report.summary.errors++;
    }

    report.skills.push({ category: skill.category, name: skill.name, ...result });
  }

  await fs.promises.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`\nMigration Report:`);
  console.log(`  Total skills: ${report.summary.total}`);
  console.log(`  Already v2:   ${report.summary.v2}`);
  console.log(`  ${DRY_RUN ? 'Would migrate' : 'Migrated'}: ${report.summary.migrated}`);
  console.log(`  Skipped:      ${report.summary.skipped}`);
  console.log(`  Errors:       ${report.summary.errors}`);
  console.log(`\nReport written to: ${REPORT_PATH}`);

  if (DRY_RUN && CATEGORY_FILTER) {
    console.log(`\n${CATEGORY_FILTER}/ skills that need migration:`);
    report.skills
      .filter(s => s.status !== 'v2' && s.status !== 'skipped')
      .forEach(s => console.log(`  - ${s.name}: ${s.status}`));
    console.log(`\n${CATEGORY_FILTER}/ skills already v2:`);
    report.skills
      .filter(s => s.status === 'v2')
      .forEach(s => console.log(`  - ${s.name}`));
  }

  process.exit(report.summary.errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
