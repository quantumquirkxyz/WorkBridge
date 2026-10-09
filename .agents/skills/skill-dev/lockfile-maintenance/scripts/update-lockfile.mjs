#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = process.cwd();
const skillsRoot = path.join(repoRoot, '.agents', 'skills');
const lockPath = path.join(repoRoot, 'skills-lock.json');
const write = process.argv.includes('--write');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

async function skillFiles(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await skillFiles(filePath, out);
    } else if (entry.name === 'SKILL.md') {
      out.push(filePath);
    }
  }
  return out;
}

async function main() {
  const lock = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  if (!lock.skills || typeof lock.skills !== 'object' || Array.isArray(lock.skills)) {
    throw new Error('skills-lock.json must contain an object at .skills');
  }

  const canonical = {};
  for (const filePath of await skillFiles(skillsRoot)) {
    const text = await fs.readFile(filePath, 'utf8');
    const name = frontmatterValue(text, 'name');
    if (!name) throw new Error(`${path.relative(repoRoot, filePath)} is missing frontmatter name`);
    canonical[name] = {
      hash: crypto.createHash('sha256').update(text).digest('hex'),
      revision: 'working-tree',
      sourceType: 'local',
    };
  }

  const before = lock.skills;
  const added = [];
  const updated = [];
  const removed = [];

  for (const name of Object.keys(canonical)) {
    if (!before[name]) added.push(name);
    else if (before[name].hash !== canonical[name].hash) updated.push(name);
  }
  for (const name of Object.keys(before)) {
    if (!canonical[name]) removed.push(name);
  }

  const next = { skills: Object.fromEntries(Object.entries(canonical).sort(([a], [b]) => a.localeCompare(b))) };
  if (write) {
    await fs.writeFile(lockPath, JSON.stringify(next, null, 2) + '\n');
  }

  console.log(JSON.stringify({
    mode: write ? 'write' : 'dry-run',
    status: added.length || updated.length || removed.length ? 'drift' : 'clean',
    skills: Object.keys(canonical).length,
    added,
    updated,
    removed,
    changed: added.length + updated.length + removed.length,
    lockfileWritten: write,
  }, null, 2));

  if (!write && (added.length || updated.length || removed.length)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
