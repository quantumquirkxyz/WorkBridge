#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SKILLS_DIR = path.join(ROOT, '.agents', 'skills');
const OUTPUT_DIR = path.join(ROOT, '.agents', 'skills', 'platform', 'agent-cards');
const SCHEMA_PATH = path.join(ROOT, '.agents', 'skills', 'platform', 'schemas', 'agent-card-schema.json');

async function findSkillDirs() {
  const EXCLUDED_DIRS = new Set([
    'platform', 'node_modules', '.git', 'dist', 'scripts',
    'agent-cards', 'artifacts', 'fixtures', 'schemas', 'traces',
    'state', 'runs', 'evals', 'prompts', 'assets', 'references',
    'behavioral-fixtures', 'tests', 'mcp-server', 'audit'
  ]);
  const categories = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
  const skills = [];
  for (const cat of categories) {
    if (!cat.isDirectory()) continue;
    if (EXCLUDED_DIRS.has(cat.name)) continue;
    const catPath = path.join(SKILLS_DIR, cat.name);
    const entries = await fs.readdir(catPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
        skills.push({ category: cat.name, name: entry.name, path: path.join(catPath, entry.name) });
      }
    }
  }
  return skills;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const value = keyMatch[2].trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        fm[key] = value.slice(1, -1).split(',').map(s => s.trim());
      } else if (value.startsWith('"') && value.endsWith('"')) {
        fm[key] = value.slice(1, -1);
      } else {
        fm[key] = value;
      }
    }
  }
  return fm;
}

async function generateCard(skill) {
  const skillMdPath = path.join(skill.path, 'SKILL.md');
  const content = await fs.readFile(skillMdPath, 'utf8');
  const fm = parseFrontmatter(content);
  
  const card = {
    name: fm.name || skill.name,
    description: fm.description || '',
    url: `https://github.com/quirk/example/blob/main/.agents/skills/${skill.category}/${skill.name}/SKILL.md`,
    version: fm.version || "1",
    capabilities: {
      skillInvocation: true,
      artifactProduction: !!fm.artifactType,
      workflowOrchestration: !!fm.compatibility
    },
    authentication: {
      schemes: ["none"]
    },
    skills: [{
      id: `${skill.category}/${skill.name}`,
      name: fm.name || skill.name,
      description: fm.description || '',
      tags: fm.tags || [skill.category],
      parameters: {
        trustTier: fm.trustTier,
        modelTier: fm.modelTier,
        artifactType: fm.artifactType
      }
    }]
  };
  
  return card;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const skills = await findSkillDirs();
  const cards = [];
  
  for (const skill of skills) {
    try {
      const card = await generateCard(skill);
      cards.push(card);
      const outputPath = path.join(OUTPUT_DIR, `${skill.category}-${skill.name}.json`);
      await fs.writeFile(outputPath, JSON.stringify(card, null, 2) + '\n');
    } catch (err) {
      console.error(`Failed to generate card for ${skill.category}/${skill.name}:`, err.message);
    }
  }
  
  // Write index
  const index = {
    totalCards: cards.length,
    generatedAt: new Date().toISOString(),
    cards
  };
  await fs.writeFile(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  
  console.log(`Generated ${cards.length} agent cards in ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
