#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PROMPTS_DIR = path.join(ROOT, '.agents', 'skills', 'prompts');
const GOLDEN_DIR = path.join(ROOT, '.agents', 'skills', 'platform', 'golden');

async function loadPrompt(skill, version) {
  const promptPath = path.join(PROMPTS_DIR, skill, `${version}.md`);
  return fs.readFile(promptPath, 'utf8');
}

async function loadGolden(skill, version) {
  const goldenPath = path.join(GOLDEN_DIR, `${skill}-${version}.md`);
  try {
    return await fs.readFile(goldenPath, 'utf8');
  } catch {
    return null;
  }
}

async function comparePrompts(skill, version) {
  let current;
  try {
    current = await loadPrompt(skill, version);
  } catch {
    return { skill, version, status: 'no-prompt', message: 'No prompt file found' };
  }

  const golden = await loadGolden(skill, version);
  
  if (!golden) {
    return { skill, version, status: 'no-golden', message: 'No golden file found' };
  }
  
  const currentLines = current.split('\n');
  const goldenLines = golden.split('\n');
  
  const added = currentLines.filter(line => !goldenLines.includes(line)).length;
  const removed = goldenLines.filter(line => !currentLines.includes(line)).length;
  
  const similarity = Math.round((1 - (added + removed) / (currentLines.length + goldenLines.length)) * 100);
  
  return {
    skill,
    version,
    status: similarity >= 95 ? 'pass' : 'fail',
    similarity,
    added,
    removed,
    threshold: 95
  };
}

async function main() {
  const args = process.argv.slice(2);
  const skill = args[0];
  const version = args[1] || 'v2';
  
  if (!skill) {
    console.error('Usage: node test-prompt-regression.mjs <skill-name> [version]');
    process.exit(1);
  }
  
  const result = await comparePrompts(skill, version);
  
  console.log(`\nPrompt Regression Test: ${skill}/${version}`);
  console.log(`Status: ${result.status.toUpperCase()}`);
  console.log(`Similarity: ${result.similarity}% (threshold: ${result.threshold}%)`);
  if (result.added) console.log(`Lines added: ${result.added}`);
  if (result.removed) console.log(`Lines removed: ${result.removed}`);
  
  process.exit(result.status === 'pass' ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
