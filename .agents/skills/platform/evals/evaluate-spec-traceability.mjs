#!/usr/bin/env node
// evaluate-spec-traceability.mjs — verifies spec↔ticket traceability
// Usage: node evaluate-spec-traceability.mjs <spec-artifact> <tickets-dir> [--json]

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function loadJson(filePath) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const content = await fs.readFile(absolute, 'utf8');
  return JSON.parse(content);
}

async function findTicketArtifacts(ticketsDir) {
  const absolute = path.isAbsolute(ticketsDir) ? ticketsDir : path.join(ROOT, ticketsDir);
  const entries = await fs.readdir(absolute, { recursive: true });
  return entries.filter(f => f.endsWith('.json')).map(f => path.join(absolute, f));
}

function evaluateTraceability(spec, tickets) {
  const specId = spec.id || '';
  const acceptanceCriteria = spec.output?.acceptanceCriteria || [];
  const ticketTitles = tickets.map(t => t.output?.title || t.title || '').filter(Boolean);
  const ticketBlockers = tickets.map(t => t.output?.blockedBy || t.blockedBy || []).flat();

  const criteriaCovered = acceptanceCriteria.filter(criteria =>
    ticketTitles.some(title => title.toLowerCase().includes(criteria.toLowerCase().slice(0, 20)))
  );

  const orphanTickets = tickets.filter(t => {
    const title = t.output?.title || t.title || '';
    return !acceptanceCriteria.some(c => title.toLowerCase().includes(c.toLowerCase().slice(0, 20)));
  });

  const circularDeps = [];
  const allBlockers = new Map();
  for (const t of tickets) {
    const id = t.id || path.basename(t.input?.sourceRef || 'unknown');
    const blockedBy = t.output?.blockedBy || t.blockedBy || [];
    allBlockers.set(id, blockedBy);
  }
  for (const [id, blockers] of allBlockers) {
    for (const blocker of blockers) {
      if (allBlockers.has(blocker) && (allBlockers.get(blocker) || []).includes(id)) {
        circularDeps.push([id, blocker]);
      }
    }
  }

  const coverage = acceptanceCriteria.length > 0 ? (criteriaCovered.length / acceptanceCriteria.length) * 100 : 0;

  return {
    specId,
    totalAcceptanceCriteria: acceptanceCriteria.length,
    criteriaCovered: criteriaCovered.length,
    coveragePercent: Math.round(coverage),
    orphanTickets: orphanTickets.map(t => t.id || t.input?.sourceRef),
    circularDependencies: circularDeps,
    totalTickets: tickets.length,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const specPath = args.find(a => !a.startsWith('--'));
  const ticketsDir = args[args.indexOf(specPath) + 1];
  const json = args.includes('--json');

  if (!specPath || !ticketsDir) {
    console.error('Usage: node evaluate-spec-traceability.mjs <spec-artifact> <tickets-dir> [--json]');
    process.exit(1);
  }

  const spec = await loadJson(specPath);
  const ticketFiles = await findTicketArtifacts(ticketsDir);
  const tickets = await Promise.all(ticketFiles.map(f => loadJson(f).catch(() => ({}))));
  const validTickets = tickets.filter(t => t.id && t.output);

  const result = evaluateTraceability(spec, validTickets);
  result.passed = result.coveragePercent >= 80 && result.circularDependencies.length === 0;

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nSpec Traceability Evaluation`);
    console.log(`Coverage: ${result.coveragePercent}% (${result.criteriaCovered}/${result.totalAcceptanceCriteria} criteria)`);
    console.log(`Orphan tickets: ${result.orphanTickets.length}`);
    console.log(`Circular dependencies: ${result.circularDependencies.length}`);
    console.log(`Result: ${result.passed ? 'PASS' : 'FAIL'}`);
  }

  process.exit(result.passed ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
