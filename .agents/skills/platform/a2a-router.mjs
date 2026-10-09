#!/usr/bin/env node
// a2a-router.mjs - A2A runtime for routing requests to skills via Agent Cards

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..', '..');
const agentCardsDir = path.join(root, '.agents', 'skills', 'platform', 'agent-cards');
const skillsRoot = path.join(root, '.agents', 'skills');

const EXCLUDED = new Set(['platform', 'prompts', 'agent-cards', 'node_modules', '.git', '.generated-notes.md']);

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
      const val = key[2].trim();
      out[active] = val === '' || val === '[]' ? [] : val.replace(/^["']|["']$/g, '');
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && active) {
      if (!Array.isArray(out[active])) out[active] = [];
      out[active].push(item[1].replace(/^["']|["']$/g, '').trim());
    }
  }
  return out;
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function loadAgentCards() {
  const cards = [];
  if (!(await exists(agentCardsDir))) return cards;
  const files = await fs.readdir(agentCardsDir);
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const content = await fs.readFile(path.join(agentCardsDir, f), 'utf8');
      const card = JSON.parse(content);
      cards.push(card);
    } catch {}
  }
  return cards;
}

async function loadSkillMetadata(cardName) {
  const card = agentCards.find(c => c.name === cardName);
  if (!card) return null;
  const skillId = card.skills && card.skills[0] ? card.skills[0].id : null;
  if (!skillId) return null;
  const [category, skill] = skillId.split('/');
  const skillDir = path.join(skillsRoot, category, skill);
  if (!(await exists(skillDir))) return null;
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!(await exists(skillFile))) return null;
  const content = await fs.readFile(skillFile, 'utf8');
  const fm = parseFrontmatter(content);
  return {
    card,
    category,
    skill,
    path: path.relative(root, skillDir),
    frontmatter: fm,
    content,
  };
}

function buildToolDefinition(skillMeta) {
  const fm = skillMeta.frontmatter;
  const inputs = Array.isArray(fm.inputs) ? fm.inputs : [];
  const outputs = Array.isArray(fm.outputs) ? fm.outputs : [];
  const properties = {};
  const required = [];
  for (const input of inputs) {
    const match = input.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const name = match[1].trim();
      properties[name] = { type: 'string', description: match[2].trim() };
      if (!input.includes('(default:')) required.push(name);
    } else {
      properties[input] = { type: 'string', description: input };
    }
  }
  const outProps = {};
  for (const output of outputs) {
    const match = output.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const name = match[1].trim();
      outProps[name] = { type: 'string', description: match[2].trim() };
    } else {
      outProps[output] = { type: 'string', description: output };
    }
  }
  return {
    name: `skill_${skillMeta.skill}`,
    description: fm.description || '',
    inputSchema: { type: 'object', properties, required },
    outputSchema: { type: 'object', properties: outProps },
  };
}

function buildA2AInvokeResponse(skillMeta) {
  const toolDef = buildToolDefinition(skillMeta);
  return {
    agentCard: skillMeta.card,
    toolDefinition: toolDef,
    runtime: 'a2a-router',
    invokedAt: new Date().toISOString(),
  };
}

let agentCards = [];

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  agentCards = await loadAgentCards();

  if (!command || command === '--list' || command === 'list') {
    const output = agentCards.map(card => ({
      name: card.name,
      description: card.description,
      version: card.version,
      capabilities: card.capabilities || {},
      skills: (card.skills || []).map(s => ({ id: s.id, name: s.name })),
    }));
    console.log(JSON.stringify({ agentCards: output, total: output.length }, null, 2));
    return;
  }

  if (command === '--discover' || command === 'discover') {
    const capability = args[1];
    if (!capability) {
      console.error('Usage: a2a-router.mjs --discover <capability>');
      process.exit(1);
    }
    const filtered = agentCards.filter(card => (card.capabilities || {})[capability] === true);
    const output = filtered.map(card => ({
      name: card.name,
      description: card.description,
      version: card.version,
      capabilities: card.capabilities,
      skills: (card.skills || []).map(s => ({ id: s.id, name: s.name })),
    }));
    console.log(JSON.stringify({ agentCards: output, total: output.length, filter: capability }, null, 2));
    return;
  }

  if (command === '--invoke' || command === 'invoke') {
    const agentCardName = args[1];
    if (!agentCardName) {
      console.error('Usage: a2a-router.mjs --invoke <agentCardName>');
      process.exit(1);
    }
    const skillMeta = await loadSkillMetadata(agentCardName);
    if (!skillMeta) {
      console.error(JSON.stringify({ error: `Agent Card or skill not found: ${agentCardName}` }));
      process.exit(1);
    }
    const response = buildA2AInvokeResponse(skillMeta);
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (command === '--help' || command === 'help') {
    console.log(JSON.stringify({
      name: 'a2a-router',
      description: 'A2A runtime for routing requests to skills via Agent Cards',
      usage: 'node a2a-router.mjs <command> [args]',
      commands: [
        { name: 'list', description: 'List all available Agent Cards' },
        { name: 'discover <capability>', description: 'Filter Agent Cards by capability (skillInvocation, artifactProduction, workflowOrchestration)' },
        { name: 'invoke <agentCardName>', description: 'Invoke a skill by agent card name and return its A2A-compatible tool definition' },
      ]
    }, null, 2));
    return;
  }

  console.error(JSON.stringify({ error: `Unknown command: ${command}`, hint: 'Use --help for usage' }));
  process.exit(1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
