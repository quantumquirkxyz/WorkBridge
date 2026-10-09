#!/usr/bin/env node
// dependency-graph.mjs - Builds skill dependency graph, detects cycles, identifies central skills
// Usage: node dependency-graph.mjs [--format json|mermaid|dot] [--json]

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const skillsRoot = path.join(root, '.agents', 'skills');

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
        path: path.relative(root, child),
        category: fm.category || 'uncategorized',
        dependencies: Array.isArray(fm.dependencies) ? fm.dependencies : [],
        sideEffects: Array.isArray(fm.sideEffects) ? fm.sideEffects : [],
        risk: fm.risk || 'low',
        trustTier: fm.trustTier || '1',
      });
    } else {
      await collectSkills(child, out);
    }
  }
  return out;
}

function detectCycles(skills) {
  const nameToSkills = new Map(skills.map(s => [s.name, s]));
  const cycles = [];

  function dfs(node, visited, recStack, path) {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const skill = nameToSkills.get(node);
    if (skill) {
      for (const dep of skill.dependencies) {
        if (!visited.has(dep)) {
          dfs(dep, visited, recStack, path);
        } else if (recStack.has(dep)) {
          const cycleStart = path.indexOf(dep);
          cycles.push(path.slice(cycleStart).concat(dep));
        }
      }
    }

    path.pop();
    recStack.delete(node);
  }

  const visited = new Set();
  for (const skill of skills) {
    if (!visited.has(skill.name)) {
      dfs(skill.name, visited, new Set(), []);
    }
  }

  return cycles;
}

function findCentralSkills(skills, topN = 10) {
  const inDegree = new Map();
  const outDegree = new Map();
  const nameToSkills = new Map(skills.map(s => [s.name, s]));

  for (const s of skills) {
    inDegree.set(s.name, 0);
    outDegree.set(s.name, 0);
  }

  for (const s of skills) {
    for (const dep of s.dependencies) {
      if (nameToSkills.has(dep)) {
        outDegree.set(s.name, (outDegree.get(s.name) || 0) + 1);
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }
  }

  const scored = skills.map(s => ({
    name: s.name,
    category: s.category,
    inDegree: inDegree.get(s.name) || 0,
    outDegree: outDegree.get(s.name) || 0,
    centrality: (inDegree.get(s.name) || 0) + (outDegree.get(s.name) || 0),
  }));

  scored.sort((a, b) => b.centrality - a.centrality);
  return scored.slice(0, topN);
}

function generateMermaid(skills) {
  const lines = ['graph TD'];
  for (const s of skills) {
    if (s.dependencies.length === 0) {
      lines.push(`  ${s.name}[${s.name}]`);
    } else {
      for (const dep of s.dependencies) {
        lines.push(`  ${dep} --> ${s.name}`);
      }
    }
  }
  return lines.join('\n');
}

function generateDot(skills) {
  const lines = ['digraph skills {', '  rankdir=LR;'];
  for (const s of skills) {
    lines.push(`  "${s.name}" [label="${s.name}\\n${s.category}"];`);
    for (const dep of s.dependencies) {
      lines.push(`  "${dep}" -> "${s.name}";`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

async function main() {
  const format = process.argv.includes('--format') ? process.argv[process.argv.indexOf('--format') + 1] : 'json';
  const asJson = process.argv.includes('--json');

  const skills = await collectSkills(skillsRoot);
  console.log(`[dependency-graph] Analyzing ${skills.length} skills...`);

  const cycles = detectCycles(skills);
  const central = findCentralSkills(skills);
  const orphans = skills.filter(s => s.dependencies.length === 0 && !skills.some(other => other.dependencies.includes(s.name)));

  const result = {
    totalSkills: skills.length,
    totalDependencies: skills.reduce((sum, s) => sum + s.dependencies.length, 0),
    cycles: cycles.map(c => ({ path: c, length: c.length })),
    centralSkills: central,
    orphans: orphans.map(s => s.name),
    format: format === 'mermaid' ? generateMermaid(skills) : format === 'dot' ? generateDot(skills) : undefined,
  };

  if (asJson || format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else if (format === 'mermaid') {
    console.log(result.format);
  } else if (format === 'dot') {
    console.log(result.format);
  }

  if (cycles.length > 0) {
    console.error(`\n[WARN] ${cycles.length} cycle(s) detected:`);
    for (const c of cycles) {
      console.error(`  ${c.path.join(' -> ')}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
