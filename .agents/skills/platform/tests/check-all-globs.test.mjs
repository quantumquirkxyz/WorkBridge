import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(PLATFORM_DIR, '..', '..', '..');
const CHECK_ALL = path.join(PLATFORM_DIR, 'check-all.mjs');

const CHECK_ALL_SOURCE = fs.readFileSync(CHECK_ALL, 'utf8');
const PLATFORM_TESTS_DIR = path.join('.agents', 'skills', 'platform', 'tests');
const ROOT_TESTS_DIR = 'tests';

// check-all.mjs runs its whole gate (and can process.exit) at import time, so
// it cannot be imported here. Extract the real expansion helpers verbatim from
// the source and evaluate them against injected fs/path, so these tests guard
// the production behavior instead of a copy that could drift.
function extractFunction(name) {
  const pattern = new RegExp('^function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?^\\}', 'm');
  const match = CHECK_ALL_SOURCE.match(pattern);
  assert.ok(match, `check-all.mjs must define a top-level function ${name}()`);
  return match[0];
}

const helpers = new Function(
  'fsSync',
  'path',
  `${extractFunction('listTestFiles')}\n${extractFunction('testArgs')}\nreturn { listTestFiles, testArgs };`,
)(fs, path);
const { listTestFiles, testArgs } = helpers;

describe('check-all glob expansion helper', () => {
  test('testArgs(dir) returns ["--test", ...sortedFiles] and never a glob', () => {
    const args = testArgs(ROOT_TESTS_DIR);
    assert.equal(args[0], '--test');
    assert.deepStrictEqual(args.slice(1), listTestFiles(ROOT_TESTS_DIR));
    assert.ok(args.every((arg) => typeof arg === 'string' && !arg.includes('*')),
      'no --test argument may contain an unexpanded glob');
  });

  for (const dir of [PLATFORM_TESTS_DIR, ROOT_TESTS_DIR]) {
    test(`listTestFiles returns explicit sorted .test.mjs paths that exist: ${dir}`, () => {
      const files = listTestFiles(dir);
      assert.ok(files.length > 0, `${dir} should yield at least one test file`);
      assert.deepStrictEqual(files, [...files].sort(), 'the file list must be sorted');
      for (const rel of files) {
        assert.ok(rel === path.join(dir, path.basename(rel)), 'paths stay inside the directory');
        assert.ok(rel.endsWith('.test.mjs'), `${rel} must be a .test.mjs file`);
        assert.ok(!rel.includes('*'), `${rel} must not contain a glob`);
        assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), `${rel} must exist on disk`);
      }
    });
  }
});

describe('spawned node --test on expanded subsets exits 0', () => {
  test('a two-file platform subset runs and passes', () => {
    const platformFiles = listTestFiles(PLATFORM_TESTS_DIR);
    const subset = [
      path.join(PLATFORM_TESTS_DIR, 'telemetry.test.mjs'),
      path.join(PLATFORM_TESTS_DIR, 'record-execution.test.mjs'),
    ];
    for (const file of subset) {
      assert.ok(platformFiles.includes(file), `the helper must list ${file}`);
    }
    const result = spawnSync('node', ['--test', ...subset], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 0, `platform subset failed (status ${result.status}):\n${result.stderr}\n${result.stdout}`);
  });

  test('the expanded root tests (both files) run and pass', () => {
    const rootFiles = listTestFiles(ROOT_TESTS_DIR);
    assert.equal(rootFiles.length, 2, 'the root tests/ directory should expose both root test files');
    const result = spawnSync('node', ['--test', ...rootFiles], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 0, `root tests failed (status ${result.status}):\n${result.stderr}\n${result.stdout}`);
  });
});

describe('check-all.mjs no longer spawns a --test glob', () => {
  test('no literal glob string is passed to node --test', () => {
    assert.ok(!CHECK_ALL_SOURCE.includes("'--test', '*.test.mjs'"),
      'the ["--test", "*.test.mjs"] literal must be gone');
    assert.ok(!/--test['"]\s*,\s*['"][^'"]*\*/.test(CHECK_ALL_SOURCE),
      'node --test must never receive a glob string argument on the pinned Node 20');
  });

  test('both test suites are wired through the readdir-based expander', () => {
    assert.ok(CHECK_ALL_SOURCE.includes('fsSync.readdirSync(dir)'),
      'the expander must read the directory itself (no shell, no glob)');
    assert.ok(CHECK_ALL_SOURCE.includes('testArgs(PLATFORM_TESTS_DIR)'),
      'the platform tests must run through testArgs(PLATFORM_TESTS_DIR)');
    assert.ok(CHECK_ALL_SOURCE.includes('testArgs(ROOT_TESTS_DIR)'),
      'the root tests must run through testArgs(ROOT_TESTS_DIR)');
    assert.ok(CHECK_ALL_SOURCE.includes('...rootTestGateChecks'),
      'the root tests must be part of the gating loop');
  });
});
