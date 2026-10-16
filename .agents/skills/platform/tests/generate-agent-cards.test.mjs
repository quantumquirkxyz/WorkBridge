import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const SCRIPT = path.resolve('.agents/skills/platform/scripts/generate-agent-cards.mjs');
const TRACKED_CARDS_DIR = path.resolve('.agents/skills/platform/agent-cards');

// The generator resolves its repo root from process.cwd(), so every run below
// executes inside a throwaway copy of the bundle instead of regenerating the
// tracked .agents/skills/platform/agent-cards/ corpus in place. Mutating the
// tracked directory raced with concurrent suites that read the same cards.
let CARDS_DIR = path.join('.agents', 'skills', 'platform', 'agent-cards');
let tmpRoot = null;
const extraRoots = [];

function run(args, cwd) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', cwd });
}

function copyBundleSkills(root) {
  const dest = path.join(root, '.agents', 'skills');
  fs.cpSync(path.join('.agents', 'skills'), dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(path.join('.agents', 'skills'), src);
      if (!rel) return true;
      if (rel === 'platform') return true;
      if (rel.startsWith(`platform${path.sep}`)) {
        const rest = rel.slice('platform'.length + 1);
        return rest === 'agent-cards' || rest.startsWith(`agent-cards${path.sep}`)
          || rest === 'schemas' || rest.startsWith(`schemas${path.sep}`);
      }
      return true;
    },
  });
  return dest;
}

// A fresh hermetic repo root whose platform/agent-cards/ still holds the copy
// of the tracked corpus (kept unless the caller removes it).
function hermeticRoot(label, { keepCorpus = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `agent-cards-${label}-`));
  const cardsDir = path.join(copyBundleSkills(root), 'platform', 'agent-cards');
  if (!keepCorpus) fs.rmSync(cardsDir, { recursive: true, force: true });
  return { root, cardsDir };
}

function track(root) {
  extraRoots.push(root);
  return root;
}

function cardFiles(dir) {
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json') && name !== 'index.json').sort();
}

function sha256OfFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// Whole-tree snapshot: relative path -> content hash. index.json carries a
// wall-clock generatedAt, so it is compared structurally instead of by bytes.
function snapshotTree(dir) {
  const snapshot = {};
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(current, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(target, rel);
      else if (entry.name === 'index.json') {
        const index = JSON.parse(fs.readFileSync(target, 'utf8'));
        delete index.generatedAt;
        snapshot[rel] = JSON.stringify(index);
      } else snapshot[rel] = sha256OfFile(target);
    }
  };
  walk(dir, '');
  return snapshot;
}

function assertOk(result) {
  assert.equal(result.status, 0, `generation failed: ${result.stderr || result.stdout}`);
}

describe('generate-agent-cards.mjs', () => {
  before(() => {
    tmpRoot = track(hermeticRoot('hermetic').root);
    CARDS_DIR = path.join(tmpRoot, '.agents', 'skills', 'platform', 'agent-cards');
    // Generate from an empty directory, so the assertions describe the cards the
    // tool actually produces and never any stale card left over from the copy.
    fs.rmSync(CARDS_DIR, { recursive: true, force: true });
    const result = run([], tmpRoot);
    if (result.status !== 0) {
      throw new Error('Generation failed: ' + result.stderr);
    }
  });

  after(() => {
    for (const root of extraRoots) fs.rmSync(root, { recursive: true, force: true });
    extraRoots.length = 0;
    tmpRoot = null;
    CARDS_DIR = path.join('.agents', 'skills', 'platform', 'agent-cards');
  });

  test('generates cards for all skills', () => {
    const files = cardFiles(CARDS_DIR);
    assert.ok(files.length > 0, 'Should generate cards');
  });

  test('each card has required fields (name, description, capabilities)', () => {
    const files = cardFiles(CARDS_DIR);
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

    const files = cardFiles(CARDS_DIR);
    assert.equal(index.totalCards, files.length, 'totalCards should match actual card count');
  });

  test('excludes platform infrastructure directories', () => {
    // Mirrors the generator's skip set: `platform` is bundle infrastructure
    // (every canonical collector excludes it from the 253-skill projection),
    // and the companion resource directories never hold a SKILL.md.
    // foundation/mcp-server is a real bundle skill and IS carded.
    const excluded = [
      'platform', 'node_modules', '.git', 'dist', 'scripts',
      'agent-cards', 'artifacts', 'fixtures', 'schemas', 'traces',
      'state', 'runs', 'evals', 'prompts', 'assets', 'references',
      'behavioral-fixtures', 'tests', 'audit'
    ];
    const files = cardFiles(CARDS_DIR);
    for (const file of files) {
      for (const dir of excluded) {
        assert.ok(!file.startsWith(dir + '-'), `Card ${file} should not be from excluded directory ${dir}`);
      }
    }
  });
});

describe('generate-agent-cards.mjs reproducibility and pruning', () => {
  test('flagless generation into an empty directory is identical across runs', () => {
    const generateIntoEmpty = () => {
      const { root, cardsDir } = track(hermeticRoot('repro'));
      fs.rmSync(cardsDir, { recursive: true, force: true });
      assertOk(run([], root));
      return snapshotTree(cardsDir);
    };
    assert.deepStrictEqual(generateIntoEmpty(), generateIntoEmpty());
  });

  test('a second flagless run over a populated corpus changes nothing', () => {
    const { root, cardsDir } = track(hermeticRoot('idempotent'));
    assertOk(run([], root));
    const first = snapshotTree(cardsDir);
    assertOk(run([], root));
    assert.deepStrictEqual(snapshotTree(cardsDir), first);
  });

  test('one generation run prunes stale cards the run did not generate', () => {
    const { root, cardsDir } = track(hermeticRoot('prune'));
    fs.mkdirSync(cardsDir, { recursive: true });
    // Stale drift: cards no current run can regenerate, plus a non-card file
    // that must survive pruning untouched.
    fs.writeFileSync(path.join(cardsDir, 'platform-deployment.json'), JSON.stringify({ stale: true }, null, 2) + '\n');
    fs.writeFileSync(path.join(cardsDir, 'leftover-card.json'), '{}\n');
    fs.writeFileSync(path.join(cardsDir, 'README.md'), '# keep me\n');

    assertOk(run([], root));

    assert.ok(!fs.existsSync(path.join(cardsDir, 'platform-deployment.json')), 'stale platform card must be pruned');
    assert.ok(!fs.existsSync(path.join(cardsDir, 'leftover-card.json')), 'stale leftover card must be pruned');
    assert.ok(fs.existsSync(path.join(cardsDir, 'README.md')), 'non-card files must survive pruning');
    assert.ok(fs.existsSync(path.join(cardsDir, 'index.json')), 'index.json must survive pruning');

    // Pruning is idempotent: a second run leaves the corpus untouched.
    const after = snapshotTree(cardsDir);
    assertOk(run([], root));
    assert.deepStrictEqual(snapshotTree(cardsDir), after);
  });

  test('--no-prune keeps cards the current run did not generate', () => {
    const { root, cardsDir } = track(hermeticRoot('no-prune'));
    fs.mkdirSync(cardsDir, { recursive: true });
    fs.writeFileSync(path.join(cardsDir, 'platform-deployment.json'), JSON.stringify({ stale: true }, null, 2) + '\n');

    assertOk(run(['--no-prune'], root));

    assert.ok(fs.existsSync(path.join(cardsDir, 'platform-deployment.json')), '--no-prune must keep the stale card');
  });

  test('the tracked corpus holds exactly the cards a flagless run generates', () => {
    const { root, cardsDir } = track(hermeticRoot('tracked'));
    fs.rmSync(cardsDir, { recursive: true, force: true });
    assertOk(run([], root));

    const generated = cardFiles(cardsDir);
    const tracked = cardFiles(TRACKED_CARDS_DIR);
    assert.deepStrictEqual(generated, tracked,
      'generated card filenames must equal the tracked corpus filenames (membership drift is a failure)');

    // The corpus projects the consumer-facing bundle: no platform category
    // cards (every collector excludes the 12 platform skills), while
    // foundation/mcp-server is a real bundle skill and must be carded.
    assert.ok(!generated.some((file) => file.startsWith('platform-')),
      'no card may come from the platform infrastructure category');
    assert.ok(generated.includes('foundation-mcp-server.json'),
      'foundation/mcp-server is a bundle skill and must be carded');
  });

  test('flagless regeneration reproduces the tracked cards byte-for-byte', () => {
    const { root, cardsDir } = track(hermeticRoot('byte-identity', { keepCorpus: true }));
    const before = cardFiles(cardsDir).map((file) => [file, sha256OfFile(path.join(cardsDir, file))]);
    assert.ok(before.length > 0, 'expected a non-empty tracked corpus');

    assertOk(run([], root));

    for (const [file, hash] of before) {
      const afterPath = path.join(cardsDir, file);
      assert.ok(fs.existsSync(afterPath), `tracked card disappeared under regeneration: ${file}`);
      assert.equal(sha256OfFile(afterPath), hash, `tracked card drifted under regeneration: ${file}`);
    }
    for (const file of cardFiles(cardsDir)) {
      const card = JSON.parse(fs.readFileSync(path.join(cardsDir, file), 'utf8'));
      assert.equal(card.metadata, undefined, `flagless generation must not sign cards: ${file}`);
    }
  });
});
