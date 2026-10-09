#!/usr/bin/env node
// mcp-skills-server.mjs - MCP server for Quirk Skills Registry
// Usage: node mcp-skills-server.mjs [--port 3000] [--stdio]

import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const root = process.cwd();
const skillsRoot = path.join(root, '.agents', 'skills');
const registryPath = path.join(root, 'registry.yaml');
const lockPath = path.join(root, 'skills-lock.json');
const stdio = process.argv.includes('--stdio');
const port = parseInt(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : '3000');

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

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function collectSkills(dir, out = []) {
  if (!(await exists(dir))) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'platform') continue;
    const child = path.join(dir, entry.name);
    const skillMd = path.join(child, 'SKILL.md');
    if (await exists(skillMd)) {
      const text = await fs.readFile(skillMd, 'utf8');
      const fm = parseFrontmatter(text);
      out.push({
        name: entry.name,
        category: fm.category || 'uncategorized',
        description: fm.description || '',
        capabilities: Array.isArray(fm.capabilities) ? fm.capabilities : [],
        maturity: fm.maturity || 'stable',
        version: fm.version || '1.0.0',
        risk: fm.risk || 'low',
        trustTier: fm.trustTier || '1',
        sideEffects: Array.isArray(fm.sideEffects) ? fm.sideEffects : [],
        dependencies: Array.isArray(fm.dependencies) ? fm.dependencies : [],
        path: path.relative(root, child),
      });
    } else {
      await collectSkills(child, out);
    }
  }
  return out;
}

let skillsCache = [];
let lockCache = {};

async function refreshCache() {
  skillsCache = await collectSkills(skillsRoot);
  if (await exists(lockPath)) {
    lockCache = JSON.parse(await fs.readFile(lockPath, 'utf8')).skills || {};
  }
}

function searchSkills(query, skills = skillsCache) {
  const q = query.toLowerCase();
  return skills.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.capabilities.some(c => c.toLowerCase().includes(q)) ||
    s.category.toLowerCase().includes(q)
  ).slice(0, 20);
}

function resolveSkillForTask(taskDescription, skills = skillsCache) {
  const q = taskDescription.toLowerCase();
  const keywords = q.split(/\s+/).filter(w => w.length > 3);

  const scored = skills.map(s => {
    let score = 0;
    const nameLower = s.name.toLowerCase();
    const descLower = s.description.toLowerCase();
    const capLower = s.capabilities.map(c => c.toLowerCase());

    for (const kw of keywords) {
      if (nameLower.includes(kw)) score += 10;
      if (descLower.includes(kw)) score += 5;
      if (capLower.some(c => c.includes(kw))) score += 8;
    }

    if (s.trustTier === '1') score += 2;
    if (s.maturity === 'stable') score += 3;

    return { ...s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

async function validateSkill(skillName, skills = skillsCache) {
  const skill = skills.find(s => s.name === skillName);
  if (!skill) return { valid: false, reason: `Skill not found: ${skillName}` };

  const issues = [];
  if (!skill.description) issues.push('missing description');
  if (!skill.capabilities.length) issues.push('no capabilities declared');
  if (!skill.version) issues.push('no version declared');

  const skillFile = path.join(root, skill.path, 'SKILL.md');
  const text = await fs.readFile(skillFile, 'utf8').catch(() => '');
  const body = text.replace(/^---[\s\S]*?---\s*/, '');
  if (body.length < 180) issues.push('body too short');
  if (!body.includes('## Contract')) issues.push('missing ## Contract');
  if (!body.includes('## Process') && !body.includes('## Guardrails')) issues.push('missing ## Process or ## Guardrails');

  return {
    valid: issues.length === 0,
    skill: skillName,
    issues,
    trustTier: skill.trustTier,
    risk: skill.risk,
  };
}

async function scoreSkill(skillName) {
  const skill = skillsCache.find(s => s.name === skillName);
  if (!skill) return { error: `Skill not found: ${skillName}` };

  const skillFile = path.join(root, skill.path, 'SKILL.md');
  const text = await fs.readFile(skillFile, 'utf8');
  const body = text.replace(/^---[\s\S]*?---\s*/, '');

  let score = 0;
  const details = {};

  // Frontmatter (20)
  const fm = parseFrontmatter(text);
  let fmScore = 0;
  const required = ['name', 'description', 'category'];
  for (const f of required) { if (fm[f]) fmScore += 8; }
  const recommended = ['version', 'maturity', 'capabilities', 'sideEffects', 'risk', 'trustTier', 'stopCondition'];
  for (const f of recommended) { if (fm[f]) fmScore += 2; }
  details.frontmatter = Math.min(20, fmScore);
  score += details.frontmatter;

  // Body depth (20)
  const tokens = body.split(/\s+/).length;
  const headers = (body.match(/^#{1,6}\s+.+$/gm) ?? []).length;
  let bodyScore = 0;
  if (tokens >= 500) bodyScore += 8; else if (tokens >= 300) bodyScore += 5; else if (tokens >= 180) bodyScore += 2;
  if (headers >= 10) bodyScore += 8; else if (headers >= 5) bodyScore += 5;
  details.body = Math.min(20, bodyScore);
  score += details.body;

  // Sections (20)
  let secScore = 0;
  for (const sec of ['Contract', 'Process', 'Guardrails', 'Completion']) {
    if (body.includes(`## ${sec}`)) secScore += 5;
  }
  details.sections = Math.min(20, secScore);
  score += details.sections;

  // Assets (15)
  const skillDir = path.join(root, skill.path);
  let assetScore = 0;
  for (const dir of ['scripts', 'references', 'assets']) {
    if (await exists(path.join(skillDir, dir))) assetScore += 3;
  }
  details.assets = Math.min(15, assetScore);
  score += details.assets;

  // Safety (10)
  let safetyScore = 10;
  if (/rm\s+-rf\s+\//.test(body)) safetyScore -= 3;
  if (/curl\s*\|?\s*bash/.test(body)) safetyScore -= 3;
  details.safety = Math.max(0, safetyScore);
  score += details.safety;

  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  return { skill: skill.name, score, grade, details, lockHash: lockCache[skill.name]?.hash };
}

// MCP Protocol handlers
const TOOLS = {
  list_skills: {
    description: 'List all available skills, optionally filtered by category or agent type',
    inputSchema: { type: 'object', properties: { category: { type: 'string' }, agent: { type: 'string' } } },
    handler: async (args) => {
      let results = skillsCache;
      if (args.category) results = results.filter(s => s.category === args.category);
      if (args.agent) results = results.filter(s => s.capabilities.some(c => c.toLowerCase().includes(args.agent.toLowerCase())));
      return { skills: results.map(s => ({ name: s.name, category: s.category, description: s.description, trustTier: s.trustTier, version: s.version })), total: results.length };
    }
  },
  get_skill: {
    description: 'Get full SKILL.md content for a skill',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, version: { type: 'string' } }, required: ['name'] },
    handler: async (args) => {
      const skill = skillsCache.find(s => s.name === args.name);
      if (!skill) return { error: `Skill not found: ${args.name}` };
      const skillFile = path.join(root, skill.path, 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf8');
      return { name: skill.name, path: skill.path, version: args.version || skill.version, content, hash: lockCache[skill.name]?.hash };
    }
  },
  search_skills: {
    description: 'Search skills by query across name, description, and capabilities',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
    handler: async (args) => {
      const results = searchSkills(args.query);
      const limit = args.limit || 10;
      return { query: args.query, results: results.slice(0, limit).map(s => ({ name: s.name, category: s.category, description: s.description, score: s.score })), total: results.length };
    }
  },
  resolve_skill_for_task: {
    description: 'Recommend the best skill for a given task description',
    inputSchema: { type: 'object', properties: { task: { type: 'string' } }, required: ['task'] },
    handler: async (args) => {
      const results = resolveSkillForTask(args.task);
      return { task: args.task, recommendations: results.map(s => ({ name: s.name, category: s.category, description: s.description, score: s.score, trustTier: s.trustTier })) };
    }
  },
  validate_skill: {
    description: 'Validate a skill against quirk standards',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    handler: async (args) => validateSkill(args.name)
  },
  score_skill: {
    description: 'Calculate quality score (0-100) with grade and tier for a skill',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    handler: async (args) => scoreSkill(args.name)
  },
  get_registry_info: {
    description: 'Get registry metadata and statistics',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const categories = new Set(skillsCache.map(s => s.category));
      const byCategory = {};
      for (const s of skillsCache) { byCategory[s.category] = (byCategory[s.category] || 0) + 1; }
      return {
        name: 'quirk-skills',
        version: '1.0.0',
        totalSkills: skillsCache.length,
        categories: [...categories].sort(),
        skillsByCategory: byCategory,
        mcpSupport: true,
        channels: ['stable', 'beta', 'canary'],
      };
    }
  },
};

async function handleJsonRpc(request) {
  const { id, method, params } = request;
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'quirk-skills-mcp', version: '1.0.0' } } };
  }
  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: Object.entries(TOOLS).map(([name, tool]) => ({ name, description: tool.description, inputSchema: tool.inputSchema })) } };
  }
  if (method === 'tools/call') {
    const tool = TOOLS[params.name];
    if (!tool) return { jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${params.name}` } };
    try {
      const result = await tool.handler(params.arguments || {});
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } };
    } catch (err) {
      return { jsonrpc: '2.0', id, error: { code: -32603, message: err.message } };
    }
  }
  if (method === 'notifications/initialized') {
    return {};
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

async function main() {
  await refreshCache();
  console.error(`[mcp-skills-server] Loaded ${skillsCache.length} skills`);

  if (stdio) {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let buffer = '';
    stdin.setEncoding('utf8');
    stdin.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\n')) {
        const line = buffer.split('\n')[0];
        buffer = buffer.slice(line.length + 1);
        if (!line.trim()) return;
        try {
          const request = JSON.parse(line);
          handleJsonRpc(request).then(response => {
            if (response && Object.keys(response).length > 0) {
              stdout.write(JSON.stringify(response) + '\n');
            }
          }).catch(err => {
            console.error('[mcp-skills-server] Handler error:', err.message);
          });
        } catch (err) {
          console.error('[mcp-skills-server] Parse error:', err.message);
        }
      }
    });
    return;
  }

  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/mcp') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const request = JSON.parse(body);
          const response = await handleJsonRpc(request);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', skills: skillsCache.length }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.error(`[mcp-skills-server] HTTP server listening on http://localhost:${port}/mcp`);
    console.error(`[mcp-skills-server] Health check at http://localhost:${port}/health`);
  });

  if (!stdio) {
    process.on('SIGINT', () => { server.close(); process.exit(0); });
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
