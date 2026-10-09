#!/usr/bin/env node
// server.mjs - MCP server exposing quirk Skills via stdio

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const skillsRoot = path.join(root, '.agents', 'skills');
const schemasDir = path.join(root, '.agents', 'skills', 'platform', 'schemas');
const agentCardsDir = path.join(root, '.agents', 'skills', 'platform', 'agent-cards');

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

async function collectSkills(dir, out = []) {
  if (!(await exists(dir))) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED.has(entry.name)) continue;
      await collectSkills(path.join(dir, entry.name), out);
    } else if (entry.name === 'SKILL.md') {
      const text = await fs.readFile(path.join(dir, entry.name), 'utf8');
      const fm = parseFrontmatter(text);
      const category = path.relative(skillsRoot, path.dirname(dir));
      out.push({
        name: fm.name || path.basename(dir),
        category,
        description: fm.description || '',
        capabilities: Array.isArray(fm.capabilities) ? fm.capabilities : [],
        maturity: fm.maturity || 'stable',
        version: fm.version || '1',
        risk: fm.risk || 'low',
        trustTier: fm.trustTier || '1',
        sideEffects: Array.isArray(fm.sideEffects) ? fm.sideEffects : [],
        dependencies: Array.isArray(fm.dependencies) ? fm.dependencies : [],
        stopCondition: fm.stopCondition || '',
        inputs: Array.isArray(fm.inputs) ? fm.inputs : [],
        outputs: Array.isArray(fm.outputs) ? fm.outputs : [],
        artifactType: fm.artifactType || '',
        modelTier: fm.modelTier || '',
        path: path.relative(root, dir),
      });
    }
  }
  return out;
}

let skillsCache = [];
let schemasCache = {};
let agentCardsCache = [];
let skillSchemasCache = {};


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
async function refreshCache() {
  skillsCache = await collectSkills(skillsRoot);
  agentCardsCache = await loadAgentCards();
  try {
    const files = await fs.readdir(schemasDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(schemasDir, f), 'utf8');
          const key = f.replace(/\.json$/, '').replace(/[-.]/g, '_').toLowerCase();
          schemasCache[key] = JSON.parse(content);
        } catch {}
      }
    }
  } catch {}

  for (const skill of skillsCache) {
    const schemaPath = path.join(schemasDir, `${skill.name}-schema.json`);
    try {
      const content = await fs.readFile(schemaPath, 'utf8');
      const schema = JSON.parse(content);
      skillSchemasCache[skill.name] = schema;
    } catch {}
  }
}

function snakeCase(name) {
  return name.replace(/[-\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

function buildDefaultInputSchema() {
  return { type: 'object', properties: {}, required: [] };
}

function buildDefaultOutputSchema() {
  return { type: 'object', properties: { result: { type: 'string', description: 'Skill execution result' } } };
}

function buildInputSchemaFromInputs(inputs) {
  if (!inputs.length) return buildDefaultInputSchema();
  const properties = {};
  const required = [];
  for (const input of inputs) {
    const match = input.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const name = match[1].trim();
      properties[name] = { type: 'string', description: match[2].trim() };
      if (!input.includes('(default:')) {
        required.push(name);
      }
    } else {
      properties[input] = { type: 'string', description: input };
    }
  }
  return { type: 'object', properties, required };
}

function buildOutputSchemaFromOutputs(outputs) {
  if (!outputs.length) return buildDefaultOutputSchema();
  const properties = {};
  for (const output of outputs) {
    const match = output.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const name = match[1].trim();
      properties[name] = { type: 'string', description: match[2].trim() };
    } else {
      properties[output] = { type: 'string', description: output };
    }
  }
  return { type: 'object', properties };
}

function mapArtifactTypeToSchemaKey(artifactType) {
  const mapping = {
    'adr': 'adr_schema',
    'spec': 'spec_schema',
    'ticket': 'ticket_schema',
    'implementation': 'implementation_note_schema',
    'review': 'review_findings_schema',
    'pull-request': 'pr_body_schema',
    'agent-card': 'agent_card_schema',
    'plan': 'artifact_schema',
  };
  return mapping[artifactType] || 'artifact-schema';
}

async function handleInitialize() {
  return {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {}, resources: {}, prompts: {} },
    serverInfo: { name: 'quirk-skills-mcp', version: '1.0.0' },
  };
}

function handleToolsList() {
  const tools = [];
  for (const skill of skillsCache) {
    const toolName = `skill_${snakeCase(skill.name)}`;
    const schema = skillSchemasCache[skill.name];
    const inputSchema = schema && schema.properties
      ? { type: 'object', properties: schema.properties, required: schema.required || [] }
      : buildInputSchemaFromInputs(skill.inputs);
    const outputSchema = buildOutputSchemaFromOutputs(skill.outputs);
    const description = `${skill.description} Model tier: ${skill.modelTier || 'reasoning'}, Artifact type: ${skill.artifactType || 'general'}`;
    tools.push({
      name: toolName,
      description,
      inputSchema,
      outputSchema,
    });
  }
  tools.push({
    name: 'list_skills',
    description: 'List all available skills, optionally filtered by category',
    inputSchema: { type: 'object', properties: { category: { type: 'string' } }, required: [] },
    outputSchema: { type: 'object', properties: { skills: { type: 'array', items: { type: 'object' } }, total: { type: 'number' } } },
  });
  tools.push({
    name: 'get_skill',
    description: 'Get full SKILL.md content for a skill',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    outputSchema: { type: 'object', properties: { name: { type: 'string' }, path: { type: 'string' }, version: { type: 'string' }, content: { type: 'string' } } },
  });
  tools.push({
    name: 'get_artifact_schema',
    description: 'Get JSON schema for a skill artifact type',
    inputSchema: { type: 'object', properties: { skillName: { type: 'string' } }, required: ['skillName'] },
    outputSchema: { type: 'object', properties: { skill: { type: 'string' }, artifactType: { type: 'string' }, schema: { type: 'object' } } },
  });
  tools.push({
    name: 'a2a_discover',
    description: 'A2A endpoint: discover Agent Cards filtered by capability',
    inputSchema: {
      type: 'object',
      properties: {
        capability: { type: 'string', description: 'Capability to filter by (skillInvocation, artifactProduction, workflowOrchestration)' }
      },
      required: []
    },
    outputSchema: {
      type: 'object',
      properties: {
        agentCards: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' }
      }
    },
  });
  tools.push({
    name: 'a2a_invoke',
    description: 'A2A endpoint: invoke a skill by agent card name and return its tool definition',
    inputSchema: {
      type: 'object',
      properties: {
        agentCardName: { type: 'string', description: 'Name of the agent card (skill name) to invoke' }
      },
      required: ['agentCardName']
    },
    outputSchema: {
      type: 'object',
      properties: {
        agentCard: { type: 'object' },
        toolDefinition: { type: 'object' }
      }
    },
  });
  return tools;
}

async function handleToolCall(name, args) {
  if (name === 'list_skills') {
    const category = args.category;
    let results = skillsCache;
    if (category) results = results.filter(s => s.category === category);
    return { skills: results.map(s => ({ name: s.name, category: s.category, description: s.description, trustTier: s.trustTier, version: s.version })), total: results.length };
  }
  if (name === 'get_skill') {
    const skill = skillsCache.find(s => s.name === args.name);
    if (!skill) throw new Error(`Skill not found: ${args.name}`);
    const skillFile = path.join(root, skill.path, 'SKILL.md');
    const content = await fs.readFile(skillFile, 'utf8');
    return { name: skill.name, path: skill.path, version: skill.version, content };
  }
  if (name === 'get_artifact_schema') {
    const skill = skillsCache.find(s => s.name === args.skillName);
    if (!skill) throw new Error(`Skill not found: ${args.skillName}`);
    const key = mapArtifactTypeToSchemaKey(skill.artifactType);
    const schema = schemasCache[key] || schemasCache['artifact_schema'] || buildDefaultOutputSchema();
    return { skill: skill.name, artifactType: skill.artifactType, schema };
  }
  if (name === 'a2a_discover') {
    let cards = agentCardsCache;
    if (args.capability) {
      cards = cards.filter(card => {
        const caps = card.capabilities || {};
        return caps[args.capability] === true;
      });
    }
    return { agentCards: cards, total: cards.length };
  }
  if (name === 'a2a_invoke') {
    const card = agentCardsCache.find(c => c.name === args.agentCardName);
    if (!card) throw new Error(`Agent Card not found: ${args.agentCardName}`);
    const skill = skillsCache.find(s => s.name === args.agentCardName);
    if (!skill) throw new Error(`Skill not found for agent card: ${args.agentCardName}`);
    const toolName = `skill_${snakeCase(skill.name)}`;
    const inputSchema = buildInputSchemaFromInputs(skill.inputs);
    const outputSchema = buildOutputSchemaFromOutputs(skill.outputs);
    const toolDefinition = {
      name: toolName,
      description: skill.description,
      inputSchema,
      outputSchema,
    };
    return { agentCard: card, toolDefinition };
  }
  const skill = skillsCache.find(s => `skill_${snakeCase(s.name)}` === name);
  if (!skill) throw new Error(`Tool not found: ${name}`);
  const skillFile = path.join(root, skill.path, 'SKILL.md');
  const content = await fs.readFile(skillFile, 'utf8');
  return { skill: skill.name, status: 'executed', description: skill.description, contentPreview: content.slice(0, 500) };
}

function handleResourcesList() {
  const resources = [];
  for (const skill of skillsCache) {
    const uri = `skill://${skill.name}/SKILL.md`;
    resources.push({
      uri,
      name: `${skill.name} SKILL.md`,
      description: `SKILL.md for ${skill.name}`,
      mimeType: 'text/markdown',
    });
  }
  return resources;
}

async function handleResourceRead(uri) {
  if (!uri.startsWith('skill://')) throw new Error(`Invalid resource URI: ${uri}`);
  const parts = uri.slice(8).split('/');
  const skillName = parts[0];
  const skill = skillsCache.find(s => s.name === skillName);
  if (!skill) throw new Error(`Skill not found: ${skillName}`);
  const filePath = path.join(root, skill.path, ...parts.slice(1));
  const content = await fs.readFile(filePath, 'utf8');
  return { uri, mimeType: 'text/markdown', content };
}

function handlePromptsList() {
  const prompts = [];
  for (const skill of skillsCache) {
    if (skill.capabilities && skill.capabilities.length > 0) {
      prompts.push({
        name: `${skill.name}-prompt`,
        description: `Prompt template for ${skill.name}: ${skill.description}`,
        arguments: [
          { name: 'task', description: 'Task description', required: true },
          { name: 'context', description: 'Additional context', required: false },
        ],
      });
    }
  }
  return prompts;
}

async function handleJsonRpc(request) {
  const { id, method, params } = request;
  try {
    switch (method) {
      case 'initialize':
        return { jsonrpc: '2.0', id, result: await handleInitialize() };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: handleToolsList() } };
      case 'tools/call': {
        const result = await handleToolCall(params.name, params.arguments || {});
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } };
      }
      case 'resources/list':
        return { jsonrpc: '2.0', id, result: { resources: handleResourcesList() } };
      case 'resources/read':
        return { jsonrpc: '2.0', id, result: { contents: [await handleResourceRead(params.uri)] } };
      case 'prompts/list':
        return { jsonrpc: '2.0', id, result: { prompts: handlePromptsList() } };
      case 'notifications/initialized':
        return {};
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
  } catch (err) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: err.message } };
  }
}

async function main() {
  await refreshCache();
  console.error(`[mcp-server] Loaded ${skillsCache.length} skills, ${Object.keys(schemasCache).length} schemas, ${agentCardsCache.length} agent cards`);

  const stdin = process.stdin;
  const stdout = process.stdout;
  let buffer = '';
  stdin.setEncoding('utf8');
  stdin.on('data', chunk => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const line = buffer.split('\n')[0];
      buffer = buffer.slice(line.length + 1);
      if (!line.trim()) continue;
      try {
        const request = JSON.parse(line);
        handleJsonRpc(request).then(response => {
          if (response && Object.keys(response).length > 0) {
            stdout.write(JSON.stringify(response) + '\n');
          }
        }).catch(err => {
          console.error('[mcp-server] Handler error:', err.message);
        });
      } catch (err) {
        console.error('[mcp-server] Parse error:', err.message);
      }
    }
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
