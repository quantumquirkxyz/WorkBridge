import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SCRIPT = '.agents/skills/platform/scripts/generate-agent-cards.mjs';
const CARDS_DIR = '.agents/skills/platform/agent-cards';

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
}

describe('generate-agent-cards.mjs', () => {
  let backupDir;

  before(() => {
    backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cards-backup-'));
    fs.cpSync(CARDS_DIR, backupDir, { recursive: true });
    
    const entries = fs.readdirSync(CARDS_DIR);
    for (const entry of entries) {
      fs.rmSync(path.join(CARDS_DIR, entry), { recursive: true, force: true });
    }
    
    const result = run([]);
    if (result.status !== 0) {
      throw new Error('Generation failed: ' + result.stderr);
    }
  });

  after(() => {
    const entries = fs.readdirSync(CARDS_DIR);
    for (const entry of entries) {
      fs.rmSync(path.join(CARDS_DIR, entry), { recursive: true, force: true });
    }
    fs.cpSync(backupDir, CARDS_DIR, { recursive: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
  });

  test('generates cards for all skills', () => {
    const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
    assert.ok(files.length > 0, 'Should generate cards');
  });

  test('each card has required fields (name, description, capabilities)', () => {
    const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
    for (const file of files) {
      const card = JSON.parse(fs.readFileSync(path.join(CARDS_DIR, file), 'utf8'));
      assert.ok(card.name, `Card ${file} missing name`);
      assert.ok(card.description !== undefined, `Card ${file} missing description`);
      assert.ok(card.capabilities, `Card ${file} missing capabilities`);
    }
  });

  test('index.json is created with totalCards', () => {
    const indexPath = path.join(CARDS_DIR, 'index.json');
    assert.ok(fs.existsSync(indexPath), 'index.json should exist');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    assert.ok(typeof index.totalCards === 'number', 'totalCards should be a number');
    assert.ok(index.totalCards > 0, 'totalCards should be > 0');
    
    const cardFiles = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
    assert.equal(index.totalCards, cardFiles.length, 'totalCards should match actual card count');
  });

  test('excludes platform infrastructure directories', () => {
    const excluded = [
      'platform', 'node_modules', '.git', 'dist', 'scripts',
      'agent-cards', 'artifacts', 'fixtures', 'schemas', 'traces',
      'state', 'runs', 'evals', 'prompts', 'assets', 'references',
      'behavioral-fixtures', 'tests', 'mcp-server', 'audit'
    ];
    const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
    for (const file of files) {
      for (const dir of excluded) {
        assert.ok(!file.startsWith(dir + '-'), `Card ${file} should not be from excluded directory ${dir}`);
      }
    }
  });
});
