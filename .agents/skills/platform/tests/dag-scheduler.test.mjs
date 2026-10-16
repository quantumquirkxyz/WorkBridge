import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT = '.agents/skills/platform/dag-scheduler.mjs';

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
}

function writeDag(dir, name, payload) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

const CLEAN = {
  tickets: [
    { id: 1, title: 'scaffold', blockedBy: [] },
    { id: 2, title: 'fixtures', blockedBy: [] },
    { id: 3, title: 'validator', blockedBy: [1, 2] },
    { id: 4, title: 'auditor', blockedBy: [2] },
    { id: 5, title: 'publish', blockedBy: [3, 4] },
  ],
};

describe('dag-scheduler.mjs', () => {
  test('clean DAG produces correct levels and three waves', () => {
    const result = run(['levels', writeDag(fs.mkdtempSync('/tmp/quirk-dag-'), 'clean.json', CLEAN), '--json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ticketCount, 5);
    assert.equal(report.edgeCount, 5);
    assert.equal(report.waves, 3);
    assert.deepEqual(report.levels.map((wave) => wave.count), [2, 2, 1]);
    assert.deepEqual(report.levels[0].tickets.map((ticket) => ticket.id), ['1', '2']);
    assert.deepEqual(report.levels[2].tickets.map((ticket) => ticket.id), ['5']);
    assert.equal(report.parallelismScore, (5 - 2) / 5);
    assert.equal(report.dependencyComplexity, 1);
    assert.deepEqual(report.warnings, []);
    assert.equal(report.status, 'pass');
  });

  test('redundant edge is flagged as over-coupling without failing the gate', () => {
    const dir = fs.mkdtempSync('/tmp/quirk-dag-');
    const payload = {
      tickets: [
        { id: 1, title: 'scaffold', blockedBy: [] },
        { id: 2, title: 'fixtures', blockedBy: [1] },
        { id: 3, title: 'publish', blockedBy: [1, 2] },
      ],
    };
    const result = run(['check', writeDag(dir, 'redundant.json', payload), '--json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    const redundant = report.warnings.filter((warning) => warning.type === 'redundant-edge');
    assert.equal(redundant.length, 1);
    assert.deepEqual([redundant[0].from, redundant[0].to], ['1', '3']);
    assert.equal(report.status, 'pass');
  });

  test('cycle is reported as an error and exits 1', () => {
    const dir = fs.mkdtempSync('/tmp/quirk-dag-');
    const payload = {
      tickets: [
        { id: 1, title: 'a', blockedBy: [3] },
        { id: 2, title: 'b', blockedBy: [1] },
        { id: 3, title: 'c', blockedBy: [2] },
      ],
    };
    const result = run(['check', writeDag(dir, 'cycle.json', payload), '--json']);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'fail');
    assert.equal(report.errors.length, 1);
    assert.match(report.errors[0], /dependency cycle detected: 1 -> 2 -> 3 -> 1/);
    assert.deepEqual(report.levels, []);
  });

  test('diamond dependency levels are correct and clean', () => {
    const dir = fs.mkdtempSync('/tmp/quirk-dag-');
    const payload = {
      tickets: [
        { id: 1, title: 'root', blockedBy: [] },
        { id: 2, title: 'left', blockedBy: [1] },
        { id: 3, title: 'right', blockedBy: [1] },
        { id: 4, title: 'join', blockedBy: [2, 3] },
      ],
    };
    const result = run(['levels', writeDag(dir, 'diamond.json', payload), '--json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.levels.map((wave) => wave.count), [1, 2, 1]);
    assert.deepEqual(report.warnings, []);
    assert.equal(report.waves, 3);
  });

  test('empty input is handled without error', () => {
    const dir = fs.mkdtempSync('/tmp/quirk-dag-');
    const levels = run(['levels', writeDag(dir, 'empty.json', []), '--json']);
    assert.equal(levels.status, 0, levels.stderr);
    const report = JSON.parse(levels.stdout);
    assert.equal(report.ticketCount, 0);
    assert.equal(report.waves, 0);
    assert.deepEqual(report.levels, []);
    assert.equal(report.parallelismScore, 0);
    assert.equal(report.dependencyComplexity, 0);
    const check = run(['check', writeDag(dir, 'empty-check.json', []), '--json']);
    assert.equal(check.status, 0, check.stderr);
    assert.equal(JSON.parse(check.stdout).status, 'pass');
  });

  test('TicketArtifact output array with numeric blockedBy is accepted', () => {
    const dir = fs.mkdtempSync('/tmp/quirk-dag-');
    const artifact = {
      schemaVersion: '2.0',
      artifactType: 'ticket',
      output: [
        { title: 'first slice', blockedBy: [] },
        { title: 'second slice', blockedBy: [1] },
        { title: 'third slice', blockedBy: [2] },
      ],
    };
    const result = run(['levels', writeDag(dir, 'artifact.json', artifact), '--json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ticketCount, 3);
    assert.deepEqual(report.levels.map((wave) => wave.count), [1, 1, 1]);
    assert.deepEqual(report.levels[1].tickets.map((ticket) => ticket.id), ['2']);
  });

  test('demo prints a clean 3-wave DAG plus an over-coupled DAG', () => {
    const result = run(['--demo']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /clean DAG - three waves, no over-coupling/);
    assert.match(result.stdout, /over-coupled DAG - redundant edge plus fan-in pressure/);
    assert.match(result.stdout, /wave 0 \(3 parallelizable\)/);
    assert.match(result.stdout, /\[over-coupling\] edge 1 -> 10 is redundant/);
    assert.match(result.stdout, /ticket 11 has 5 blockers/);
  });

  test('fan-in above the limit is warned', () => {
    const dir = fs.mkdtempSync('/tmp/quirk-dag-');
    const payload = {
      tickets: [
        { id: 1, title: 'a', blockedBy: [] },
        { id: 2, title: 'b', blockedBy: [1] },
        { id: 3, title: 'c', blockedBy: [1] },
        { id: 4, title: 'd', blockedBy: [1] },
        { id: 5, title: 'e', blockedBy: [1, 2, 3, 4] },
      ],
    };
    const result = run(['check', writeDag(dir, 'fanin.json', payload), '--json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    const fanIn = report.warnings.filter((warning) => warning.type === 'fan-in');
    assert.equal(fanIn.length, 1);
    assert.equal(fanIn[0].ticket, '5');
  });

  test('unreadable file is a usage error, not a crash', () => {
    const result = run(['levels', '/tmp/quirk-dag-missing-file.json']);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /cannot read/);
  });
});
