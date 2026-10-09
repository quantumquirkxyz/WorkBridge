#!/usr/bin/env node
// audit-trail.mjs - Immutable append-only audit trail for skill lifecycle events
// Usage: node audit-trail.mjs record <event> --skill <name> [--actor <user>] [--detail <json>]

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const auditDir = path.join(root, '.agents', 'skills', 'platform', 'audit');

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function appendRecord(record) {
  await fs.mkdir(auditDir, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const auditFile = path.join(auditDir, `${date}.jsonl`);
  const line = JSON.stringify({ ...record, recordedAt: new Date().toISOString() }) + '\n';
  await fs.appendFile(auditFile, line, 'utf8');
  return auditFile;
}

async function queryRecords(options = {}) {
  const { skill, event, from, to, limit = 100 } = options;
  if (!await exists(auditDir)) return [];

  const entries = [];
  const files = await fs.readdir(auditDir);
  for (const file of files.sort()) {
    if (!file.endsWith('.jsonl')) continue;
    const content = await fs.readFile(path.join(auditDir, file), 'utf8');
    for (const line of content.split('\n').filter(Boolean)) {
      try {
        const record = JSON.parse(line);
        if (skill && record.skill !== skill) continue;
        if (event && record.event !== event) continue;
        if (from && record.recordedAt < from) continue;
        if (to && record.recordedAt > to) continue;
        entries.push(record);
      } catch { /* skip invalid lines */ }
    }
  }

  entries.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  return entries.slice(-limit);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'record') {
    const event = args[1] || 'unknown';
    const skill = args[args.indexOf('--skill') + 1];
    const actor = args[args.indexOf('--actor') + 1] || process.env.USER || 'unknown';
    const detailArg = args[args.indexOf('--detail') + 1];

    if (!skill) {
      console.error('Usage: node audit-trail.mjs record <event> --skill <name> [--actor <user>] [--detail <json>]');
      process.exit(1);
    }

    let detail = {};
    if (detailArg) {
      try { detail = JSON.parse(detailArg); } catch { detail = { raw: detailArg }; }
    }

    const record = {
      event,
      skill,
      actor,
      detail,
      source: 'skill-evolver',
    };

    const auditFile = await appendRecord(record);
    console.log(JSON.stringify({ recorded: true, file: auditFile, record }, null, 2));
  } else if (command === 'query') {
    const skill = args[args.indexOf('--skill') + 1];
    const event = args[args.indexOf('--event') + 1];
    const limit = parseInt(args[args.indexOf('--limit') + 1] || '100');
    const records = await queryRecords({ skill, event, limit });
    console.log(JSON.stringify({ total: records.length, records }, null, 2));
  } else if (command === 'stats') {
    const records = await queryRecords({ limit: 10000 });
    const byEvent = {};
    const bySkill = {};
    for (const r of records) {
      byEvent[r.event] = (byEvent[r.event] || 0) + 1;
      bySkill[r.skill] = (bySkill[r.skill] || 0) + 1;
    }
    console.log(JSON.stringify({ totalRecords: records.length, byEvent, bySkill }, null, 2));
  } else {
    console.error('Usage: node audit-trail.mjs record|query|stats ...');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
