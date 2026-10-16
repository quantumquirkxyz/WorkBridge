import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { estimateTokens, derivePurpose } from '../memory-index.mjs';

const SCRIPT = '.agents/skills/platform/memory-index.mjs';

// Synthetic memory tree in /tmp: two T0 root notes, one subdirectory with its own
// T1 index (runs/), one unindexed subdirectory (raw/).
function makeTree(root) {
  fs.mkdirSync(path.join(root, 'runs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'raw'), { recursive: true });
  fs.writeFileSync(path.join(root, 'lessons.md'), [
    '# Lessons',
    '',
    'Keep each note to one line and link back to the session that learned it.',
    '',
    '- Prefer appending over rewriting shared blocks. [source: session-42; added: 2026-10-10]',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'preferences.md'), 'The reviewer prefers findings before praise. [source: session-17; added: 2026-10-02]\n');
  fs.writeFileSync(path.join(root, 'runs', 'MEMORY.md'), '# Run notes index\n\n- [session-42.md](session-42.md) - the revision-check discussion\n');
  fs.writeFileSync(path.join(root, 'runs', 'session-42.md'), 'Revision checks reject stale writes. [source: session-42; added: 2026-10-10]\n');
  fs.writeFileSync(path.join(root, 'raw', 'dump.md'), 'Raw transcript excerpts, never indexed at the root.\n');
  return root;
}

function freshTree() {
  return makeTree(fs.mkdtempSync(path.join('/tmp', 'quirk-memory-')));
}

function run(dir, args = []) {
  return spawnSync('node', [SCRIPT, ...args, dir], { encoding: 'utf8' });
}

function readIndex(dir) {
  return fs.readFileSync(path.join(dir, 'MEMORY.md'), 'utf8');
}

const tempDirs = [];

function track(dir) {
  tempDirs.push(dir);
  return dir;
}

describe('memory-index.mjs', () => {
  after(() => {
    for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
  });

  test('token estimation is ceil(chars / 4)', () => {
    assert.equal(estimateTokens('x'.repeat(400)), 100);
    assert.equal(estimateTokens(''), 0);
  });

  test('purpose derivation strips markdown noise and truncates deterministically', () => {
    assert.equal(derivePurpose('# Heading\n\nFirst real line.\n'), 'First real line.');
    assert.equal(derivePurpose('- a bulleted lesson\n'), 'a bulleted lesson');
    assert.equal(derivePurpose('See [the docs](https://example.com) for details\n'), 'See the docs for details');
    assert.equal(derivePurpose('<!-- comment -->\n> quoted line\n'), 'quoted line');
    assert.equal(derivePurpose('\n\n'), '(no purpose line)');
    const long = derivePurpose('y'.repeat(400));
    assert.equal(long.length, 120);
    assert.ok(long.endsWith('\u2026'));
  });

  test('build writes an index listing every root file with purpose and tokens', () => {
    const dir = track(freshTree());
    const result = run(dir, ['build', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);

    assert.equal(report.command, 'build');
    assert.equal(report.changed, true);
    assert.equal(report.created, true);
    assert.deepEqual(report.entries.map((entry) => entry.file), ['lessons.md', 'preferences.md']);
    assert.equal(report.entries[0].purpose, 'Keep each note to one line and link back to the session that learned it.');
    assert.equal(report.entries[0].tokens, estimateTokens(fs.readFileSync(path.join(dir, 'lessons.md'), 'utf8')));
    assert.deepEqual(report.subdirectories, [
      { dir: 'raw', indexed: false },
      { dir: 'runs', indexed: true },
    ]);

    const index = readIndex(dir);
    assert.match(index, /\| \[lessons\.md\]\(lessons\.md\) \| Keep each note to one line[^|]*\| \d+ \|/);
    assert.match(index, /\| \[runs\/\]\(runs\/\) \| indexed \| has MEMORY\.md \(T1\) \|/);
    assert.match(index, /\| \[raw\/\]\(raw\/\) \| unindexed \|/);
    assert.match(index, /<!-- memory-index:begin -->\n<!-- memory-index:end -->/);
  });

  test('check passes on a valid tree', () => {
    const dir = track(freshTree());
    assert.equal(run(dir, ['build']).status, 0);
    const result = run(dir, ['check', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, true);
    assert.deepEqual(report.findings, []);
    assert.equal(report.stats.rootFiles, 2);
    assert.equal(report.stats.indexedFiles, 2);
    assert.equal(report.stats.subdirectories, 2);
    assert.equal(report.stats.maxTokens, 2000);
  });

  test('check fails when a root file is not indexed', () => {
    const dir = track(freshTree());
    run(dir, ['build']);
    fs.writeFileSync(path.join(dir, 'gamma.md'), 'A note added after the index was built.\n');
    const result = run(dir, ['check', '--json']);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, false);
    assert.ok(report.findings.some((finding) => finding.type === 'unindexed-root-file' && finding.file === 'gamma.md'));
  });

  test('check fails on an orphan index entry', () => {
    const dir = track(freshTree());
    run(dir, ['build']);
    const indexPath = path.join(dir, 'MEMORY.md');
    const tampered = readIndex(dir).replace('| [preferences.md](preferences.md) |', '| [ghost.md](ghost.md) |');
    assert.notEqual(tampered, readIndex(dir), 'fixture must actually rename the row');
    fs.writeFileSync(indexPath, tampered);
    const result = run(dir, ['check', '--json']);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.ok(report.findings.some((finding) => finding.type === 'orphan-index-entry' && finding.file === 'ghost.md'));
  });

  test('check fails on a file over the token budget and honors --max-tokens', () => {
    const dir = track(freshTree());
    run(dir, ['build']);
    fs.writeFileSync(path.join(dir, 'huge.md'), 'x'.repeat(9000));
    const result = run(dir, ['check', '--json']);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    const finding = report.findings.find((entry) => entry.type === 'oversized-file');
    assert.ok(finding, 'expected an oversized-file finding');
    assert.equal(finding.file, 'huge.md');
    assert.equal(finding.tokens, 2250);
    assert.equal(finding.maxTokens, 2000);

    const raised = JSON.parse(run(dir, ['check', '--json', '--max-tokens', '5000']).stdout);
    assert.ok(!raised.findings.some((entry) => entry.type === 'oversized-file'));
  });

  test('check fails when the index itself is over the line budget', () => {
    const dir = track(fs.mkdtempSync(path.join('/tmp', 'quirk-memory-')));
    for (let i = 0; i < 210; i += 1) {
      fs.writeFileSync(path.join(dir, `note-${String(i).padStart(3, '0')}.md`), `Note ${i} with a short purpose line.\n`);
    }
    const built = run(dir, ['build']);
    assert.equal(built.status, 0, built.stderr);
    const result = run(dir, ['check', '--json']);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    const finding = report.findings.find((entry) => entry.type === 'oversized-index');
    assert.ok(finding, 'expected an oversized-index finding');
    assert.ok(finding.lines > 200);
    assert.equal(finding.maxIndexLines, 200);
  });

  test('check fails on a subdirectory with no index that is not listed as unindexed', () => {
    const dir = track(freshTree());
    run(dir, ['build']);
    fs.mkdirSync(path.join(dir, 'extra'));
    const result = run(dir, ['check', '--json']);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.ok(report.findings.some((finding) => finding.type === 'subdir-unaccounted' && finding.dir === 'extra'));
  });

  test('rebuild is idempotent: the second run changes nothing', () => {
    const dir = track(freshTree());
    assert.equal(run(dir, ['build']).status, 0);
    const first = readIndex(dir);
    const second = run(dir, ['build', '--json']);
    assert.equal(second.status, 0, second.stderr);
    const report = JSON.parse(second.stdout);
    assert.equal(report.changed, false);
    assert.equal(report.status, 'unchanged');
    assert.equal(readIndex(dir), first);
  });

  test('a hand-written section between the markers survives a rebuild', () => {
    const dir = track(freshTree());
    run(dir, ['build']);
    const note = 'Curator note: consolidate session-42 into an ADR once reviewed.';
    fs.writeFileSync(path.join(dir, 'MEMORY.md'), readIndex(dir).replace(
      '<!-- memory-index:begin -->\n<!-- memory-index:end -->',
      `<!-- memory-index:begin -->\n${note}\n<!-- memory-index:end -->`,
    ));
    assert.equal(run(dir, ['build']).status, 0);
    const rebuilt = readIndex(dir);
    assert.ok(rebuilt.includes(note), 'hand-written note must survive the rebuild');
    assert.ok(rebuilt.includes('<!-- memory-index:begin -->\n' + note + '\n<!-- memory-index:end -->'));

    // A stale generated region is refreshed while the hand-written block stays put.
    fs.writeFileSync(path.join(dir, 'delta.md'), 'A third note added by hand.\n');
    assert.equal(run(dir, ['build']).status, 0);
    assert.ok(readIndex(dir).includes(note), 'hand-written note must survive a content-changing rebuild');
    assert.ok(readIndex(dir).includes('[delta.md](delta.md)'), 'new root file must be indexed');
  });

  test('usage errors exit 2 without touching the tree', () => {
    const missing = path.join('/tmp', 'quirk-memory-missing-dir');
    fs.rmSync(missing, { recursive: true, force: true });
    const result = run(missing, ['build']);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /memory directory not found/);
    assert.equal(spawnSync('node', [SCRIPT, 'frobnicate', missing], { encoding: 'utf8' }).status, 2);
  });
});
