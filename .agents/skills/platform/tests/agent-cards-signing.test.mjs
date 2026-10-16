import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonicalize, signCard, verifyCard, withoutSignature } from '../scripts/generate-agent-cards.mjs';

const SCRIPT = '.agents/skills/platform/scripts/generate-agent-cards.mjs';
const REPO_ROOT = process.cwd();
// Absolute: several runs execute the script from a temp fake repo root.
const SCRIPT_ABS = path.join(REPO_ROOT, SCRIPT);
const REPO_SKILLS_DIR = path.join(REPO_ROOT, '.agents', 'skills');
const REPO_CARDS_DIR = path.join(REPO_SKILLS_DIR, 'platform', 'agent-cards');

function run(args, cwd = REPO_ROOT) {
  return spawnSync('node', [SCRIPT_ABS, ...args], { encoding: 'utf8', cwd });
}

// A two-skill synthetic bundle in a temp fake repo root.
function makeFakeRepo(root) {
  const skills = {
    'demo/alpha': { name: 'alpha-skill', description: 'Alpha demo skill for card signing.', tags: ['demo', 'alpha'], trustTier: '1', modelTier: 'router' },
    'demo/beta': { name: 'beta-skill', description: 'Beta demo skill for card signing.', tags: ['demo', 'beta'], trustTier: '2', modelTier: 'worker' },
  };
  for (const [id, fm] of Object.entries(skills)) {
    const dir = path.join(root, '.agents', 'skills', ...id.split('/'));
    fs.mkdirSync(dir, { recursive: true });
    const lines = [`---`, `name: ${fm.name}`, `description: ${fm.description}`, `tags: [${fm.tags.join(', ')}]`, `trustTier: ${fm.trustTier}`, `modelTier: ${fm.modelTier}`, `---`, ``, `# ${fm.name}`, ``, 'Contract body.'];
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `${lines.join('\n')}\n`);
  }
  return root;
}

function cardFiles(dir) {
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json') && name !== 'index.json').sort();
}

function readCard(dir, file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
}

function sha256OfFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const tempRoots = [];

function track(root) {
  tempRoots.push(root);
  return root;
}

// Fake repo root with a copy of the checked-in corpus, for the byte-identity check.
function corpusCopyRoot() {
  const root = track(fs.mkdtempSync(path.join('/tmp', 'quirk-cards-copy-')));
  const dest = path.join(root, '.agents', 'skills');
  fs.cpSync(REPO_SKILLS_DIR, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(REPO_SKILLS_DIR, src);
      if (!rel) return true;
      // Walk into platform so the corpus copy can be made, but copy only the
      // agent-cards subtree out of it (runs/, traces/, and fixtures are noise).
      if (rel === 'platform') return true;
      if (rel.startsWith(`platform${path.sep}`)) {
        const rest = rel.slice('platform'.length + 1);
        return rest === 'agent-cards' || rest.startsWith(`agent-cards${path.sep}`);
      }
      return true;
    },
  });
  return root;
}

describe('generate-agent-cards.mjs signing', () => {
  let fakeRepo;
  let keysDir;
  let privateKey;
  let publicKey;

  before(() => {
    const base = track(fs.mkdtempSync(path.join('/tmp', 'quirk-cards-sign-')));
    fakeRepo = makeFakeRepo(path.join(base, 'repo'));
    keysDir = path.join(base, 'keys');
    fs.mkdirSync(keysDir, { recursive: true });
    privateKey = path.join(keysDir, 'private.pem');
    publicKey = path.join(keysDir, 'public.pem');
    const gen = run(['--gen-key', '--out', privateKey, '--pub-out', publicKey, '--json']);
    assert.equal(gen.status, 0, gen.stderr);
    assert.match(fs.readFileSync(privateKey, 'utf8'), /BEGIN PRIVATE KEY/);
    assert.match(fs.readFileSync(publicKey, 'utf8'), /BEGIN PUBLIC KEY/);
  });

  after(() => {
    for (const dir of tempRoots) fs.rmSync(dir, { recursive: true, force: true });
  });

  test('--gen-key writes keys only to the explicit paths given', () => {
    const noOut = run(['--gen-key']);
    assert.equal(noOut.status, 2);
    assert.match(noOut.stderr, /--gen-key requires --out/);
    // No key material appears inside the repository.
    const stray = fs.readdirSync(REPO_ROOT).filter((name) => name.endsWith('.pem'));
    assert.deepEqual(stray, []);
  });

  test('--sign signs every generated card and --verify accepts it', () => {
    const outDir = path.join(path.dirname(fakeRepo), 'signed');
    const signed = run(['--sign', '--key', privateKey, '--out', outDir, '--signed-at', '2026-10-10T00:00:00.000Z', '--json'], fakeRepo);
    assert.equal(signed.status, 0, signed.stderr);
    const signReport = JSON.parse(signed.stdout);
    assert.equal(signReport.command, 'sign');
    assert.equal(signReport.signedCards, 2);
    assert.equal(signReport.alg, 'Ed25519');
    assert.equal(signReport.canonicalization, 'RFC8785-subset');
    assert.match(signReport.keyId, /^sha256:[0-9a-f]{16}$/);

    const files = cardFiles(outDir);
    assert.deepEqual(files, ['demo-alpha.json', 'demo-beta.json']);
    const card = readCard(outDir, 'demo-alpha.json');
    const signature = card.metadata.signature;
    assert.equal(signature.alg, 'Ed25519');
    assert.equal(signature.keyId, signReport.keyId);
    assert.equal(signature.canonicalization, 'RFC8785-subset');
    assert.equal(signature.signedAt, '2026-10-10T00:00:00.000Z');
    assert.match(signature.value, /^[A-Za-z0-9_-]+$/);
    assert.equal(Buffer.from(signature.value, 'base64url').length, 64);
    // The card body is the unsigned card; only metadata.signature was added.
    assert.equal(card.name, 'alpha-skill');
    assert.equal(card.skills[0].id, 'demo/alpha');

    const verified = run(['--verify', '--key', publicKey, '--card', outDir, '--json']);
    assert.equal(verified.status, 0, verified.stdout);
    const verifyReport = JSON.parse(verified.stdout);
    assert.equal(verifyReport.status, 'pass');
    assert.equal(verifyReport.verified, 2);
    assert.equal(verifyReport.passed, 2);
    assert.equal(verifyReport.failed, 0);
  });

  test('a tampered field fails verification and names the card', () => {
    const outDir = path.join(path.dirname(fakeRepo), 'tampered');
    assert.equal(run(['--sign', '--key', privateKey, '--out', outDir], fakeRepo).status, 0);

    const cardPath = path.join(outDir, 'demo-alpha.json');
    const card = readCard(outDir, 'demo-alpha.json');
    card.description = 'Tampered description.';
    fs.writeFileSync(cardPath, `${JSON.stringify(card, null, 2)}\n`);

    const verified = run(['--verify', '--key', publicKey, '--card', outDir, '--json']);
    assert.equal(verified.status, 1);
    const report = JSON.parse(verified.stdout);
    assert.equal(report.status, 'fail');
    assert.equal(report.failed, 1);
    assert.equal(report.passed, 1);
    const failure = report.results.find((entry) => !entry.ok);
    assert.equal(failure.card, 'demo-alpha.json');
    assert.match(failure.reason, /signature does not match/);
    assert.match(verified.stdout, /demo-alpha\.json/);
    // The human-readable form also names the failed card.
    const human = run(['--verify', '--key', publicKey, '--card', outDir]);
    assert.equal(human.status, 1);
    assert.match(human.stdout, /FAIL demo-alpha\.json/);
  });

  test('a wrong key fails verification', () => {
    const outDir = path.join(path.dirname(fakeRepo), 'wrongkey');
    assert.equal(run(['--sign', '--key', privateKey, '--out', outDir], fakeRepo).status, 0);

    const otherPrivate = path.join(path.dirname(keysDir), 'other-private.pem');
    const otherPublic = path.join(path.dirname(keysDir), 'other-public.pem');
    const gen = run(['--gen-key', '--out', otherPrivate, '--pub-out', otherPublic]);
    assert.equal(gen.status, 0, gen.stderr);

    const verified = run(['--verify', '--key', otherPublic, '--card', outDir, '--json']);
    assert.equal(verified.status, 1);
    const report = JSON.parse(verified.stdout);
    assert.equal(report.failed, 2);
    assert.ok(report.results.every((entry) => !entry.ok && /signature does not match/.test(entry.reason)));

    // A private key PEM also carries its public half, so verification still runs.
    const viaPrivate = run(['--verify', '--key', otherPrivate, '--card', outDir, '--json']);
    assert.equal(viaPrivate.status, 1);
    assert.equal(JSON.parse(viaPrivate.stdout).failed, 2);
  });

  test('an unsigned card fails verification', () => {
    const unsignedDir = path.join(fakeRepo, '.agents', 'skills', 'platform', 'agent-cards');
    const generated = run([], fakeRepo);
    assert.equal(generated.status, 0, generated.stderr);
    assert.equal(cardFiles(unsignedDir).length, 2);
    for (const file of cardFiles(unsignedDir)) {
      assert.equal(readCard(unsignedDir, file).metadata, undefined, `${file} must not carry metadata`);
    }

    const verified = run(['--verify', '--key', publicKey, '--card', unsignedDir, '--json']);
    assert.equal(verified.status, 1);
    const report = JSON.parse(verified.stdout);
    assert.equal(report.failed, 2);
    assert.ok(report.results.every((entry) => /no metadata\.signature/.test(entry.reason)));
  });

  test('canonicalization is key-order independent, so reordered cards still verify', () => {
    const outDir = path.join(path.dirname(fakeRepo), 'reordered');
    assert.equal(run(['--sign', '--key', privateKey, '--out', outDir], fakeRepo).status, 0);

    // Reorder every object, nested included, without touching a value.
    const cardPath = path.join(outDir, 'demo-alpha.json');
    const reordered = JSON.parse(fs.readFileSync(cardPath, 'utf8'), (key, value) => value);
    const deepReverse = (value) => {
      if (Array.isArray(value)) return value.map(deepReverse);
      if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value).reverse()) out[key] = deepReverse(value[key]);
        return out;
      }
      return value;
    };
    fs.writeFileSync(cardPath, `${JSON.stringify(deepReverse(reordered), null, 2)}\n`);

    const verified = run(['--verify', '--key', publicKey, '--card', outDir, '--json']);
    assert.equal(verified.status, 0, verified.stdout);
    assert.equal(JSON.parse(verified.stdout).passed, 2);

    // Unit-level: canonical form ignores key order at any depth and drops undefined slots.
    assert.equal(
      canonicalize({ b: 1, a: { d: 2, c: [3, { f: 1, e: 2 }] } }),
      canonicalize({ a: { c: [3, { e: 2, f: 1 }], d: 2 }, b: 1 }),
    );
    assert.equal(canonicalize({ a: 1, gone: undefined }), '{"a":1}');
    assert.equal(canonicalize({ n: null, t: true, s: 'x', arr: [] }), '{"arr":[],"n":null,"s":"x","t":true}');
    assert.deepEqual(withoutSignature({ name: 'a', metadata: { signature: { value: 'x' } } }), { name: 'a' });
    assert.deepEqual(withoutSignature({ name: 'a', metadata: { signature: { value: 'x' }, note: 1 } }), { name: 'a', metadata: { note: 1 } });
  });

  test('--verify accepts a single card file and rejects a missing target', () => {
    const outDir = path.join(path.dirname(fakeRepo), 'single');
    assert.equal(run(['--sign', '--key', privateKey, '--out', outDir], fakeRepo).status, 0);
    const one = run(['--verify', '--key', publicKey, '--card', path.join(outDir, 'demo-beta.json'), '--json']);
    assert.equal(one.status, 0, one.stdout);
    const report = JSON.parse(one.stdout);
    assert.equal(report.verified, 1);
    assert.equal(report.passed, 1);

    const missing = run(['--verify', '--key', publicKey, '--card', path.join(outDir, 'nope.json')]);
    assert.notEqual(missing.status, 0);
  });

  test('--sign and --verify refuse to run without a key', () => {
    assert.equal(run(['--sign']).status, 2);
    assert.equal(run(['--verify']).status, 2);
    assert.equal(run(['--verify', '--card', REPO_CARDS_DIR]).status, 2);
  });

  test('signing and verifying a card round-trips through the module API', () => {
    const card = { name: 'unit', description: 'unit card', skills: [{ id: 'demo/unit', name: 'unit' }] };
    const signed = signCard(card, fs.readFileSync(privateKey, 'utf8'), { keyId: 'sha256:test', signedAt: '2026-10-10T00:00:00.000Z' });
    assert.deepEqual(verifyCard(signed, fs.readFileSync(publicKey, 'utf8')), { ok: true, keyId: 'sha256:test' });
    signed.description = 'changed after signing';
    const tampered = verifyCard(signed, fs.readFileSync(publicKey, 'utf8'));
    assert.equal(tampered.ok, false);
    assert.match(tampered.reason, /signature does not match/);
    assert.equal(verifyCard({ name: 'unsigned' }, fs.readFileSync(publicKey, 'utf8')).reason, 'card carries no metadata.signature');
  });

  test('default generation on a corpus copy is byte-identical and unsigned', () => {
    const copyRoot = corpusCopyRoot();
    const cardsDir = path.join(copyRoot, '.agents', 'skills', 'platform', 'agent-cards');
    const before = cardFiles(cardsDir);
    assert.ok(before.length >= 100, `expected a sizable corpus copy, saw ${before.length}`);
    const beforeHashes = new Map(before.map((file) => [file, sha256OfFile(path.join(cardsDir, file))]));

    const generated = run([], copyRoot);
    assert.equal(generated.status, 0, generated.stderr);

    // Every card that existed before still exists with identical bytes: no
    // signature field, no reordering, no re-serialization drift.
    for (const [file, hash] of beforeHashes) {
      const afterPath = path.join(cardsDir, file);
      assert.ok(fs.existsSync(afterPath), `card disappeared from the regenerated corpus: ${file}`);
      assert.equal(sha256OfFile(afterPath), hash, `card content changed under flagless regeneration: ${file}`);
    }
    for (const file of cardFiles(cardsDir)) {
      const card = JSON.parse(fs.readFileSync(path.join(cardsDir, file), 'utf8'));
      assert.equal(card.metadata, undefined, `flagless generation must not sign cards: ${file}`);
    }

    // Deterministic: a second flagless run rewrites nothing.
    const second = run([], copyRoot);
    assert.equal(second.status, 0, second.stderr);
    for (const [file, hash] of beforeHashes) {
      assert.equal(sha256OfFile(path.join(cardsDir, file)), hash, `second regeneration drifted: ${file}`);
    }
  });
});
