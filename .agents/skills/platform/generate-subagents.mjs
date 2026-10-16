#!/usr/bin/env node
// generate-subagents.mjs - generates the Claude Code
// subagent definitions (.claude/agents/*.md) from the
// quirk role registry.
//
// A subagent is a Markdown file with YAML frontmatter
// that a runtime loads as a dedicated agent: its own
// context window, its own tool allow-list, and its own
// model tier. The quirk method already defines the
// roles in subagent-swarm; this generator turns them
// into real runtime subagents so the swarm is not only
// a skill-level convention but an executable one.
//
// Tool scoping follows policy/tool-risk.yaml:
//   read-only roles   -> Read, Grep, Glob
//   reviewer          -> read-only tools (review is a
//                        measurement, not a mutation)
//   tester            -> read-only + Bash (sandbox
//                        execution; the PreToolUse hook
//                        still gates Bash with approval)
//   implementer       -> read-only + Edit, Write
//   doc-writer        -> read-only + Edit, Write
//
// The generator is idempotent: it rewrites the same
// definitions on every run and removes definitions it
// no longer owns (tracked by a generator marker in the
// frontmatter).
//
// Usage:
//   node .agents/skills/platform/generate-subagents.mjs [--write] [--json]
//
// Exit codes: 0 = definitions in sync, 1 = write failed,
//             2 = usage error. Dry-run never fails.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = process.cwd();
const agentsDir = path.join(repoRoot, '.claude', 'agents');

// Role registry: each role maps onto the subagent-swarm
// skill's coordination contract and the quirk skills that
// implement its job.
const ROLES = [
  {
    name: 'architect',
    model: 'inherit',
    tools: ['Read', 'Grep', 'Glob'],
    description: 'Designs module boundaries, seams, and architecture trade-offs. Use when a design decision needs explicit alternatives and consequences before implementation.',
    body: [
      'You are the architect role of the quirk swarm.',
      '',
      '## Responsibilities',
      '- Propose module boundaries and public seams',
      '- Record alternatives and consequences as ADR candidates',
      '- Never edit code; your output is a design artifact',
      '',
      '## Governing skills',
      '- codebase-design, backend-architecture, api-design',
      '- docs-adrs for durable decisions',
      '- grill-with-docs when a decision is ambiguous',
      '',
      '## Output contract',
      'Every design answer states: the seam, the alternatives, the consequences, and the risk that remains.',
    ].join('\n'),
  },
  {
    name: 'explorer',
    model: 'inherit',
    tools: ['Read', 'Grep', 'Glob'],
    description: 'Fast read-only codebase search and context gathering. Use when you need to locate symbols, patterns, or evidence across the repository before deciding.',
    body: [
      'You are the explorer role of the quirk swarm.',
      '',
      '## Responsibilities',
      '- Locate code, symbols, and patterns on demand',
      '- Return file paths, line references, and quoted evidence',
      '- Never edit, never speculate beyond the evidence',
      '',
      '## Governing skills',
      '- context-pack for ordered, provenance-carrying reads',
      '- explore-style sweeps stay inside the declared scope',
    ].join('\n'),
  },
  {
    name: 'reviewer',
    model: 'inherit',
    tools: ['Read', 'Grep', 'Glob'],
    description: 'Reviews changes against the Standards and Spec axes with separate verdicts. Use when a diff, PR, or artifact needs an evidence-based review before repair or ship.',
    body: [
      'You are the reviewer role of the quirk swarm.',
      '',
      '## Responsibilities',
      '- Review the Standards axis (conventions, structure, style)',
      '- Review the Spec axis (does the change do what the spec says)',
      '- Emit findings as durable, scoped, evidence-backed items',
      '- Never edit the reviewed code; findings only',
      '',
      '## Governing skills',
      '- review-pr (separate axes, fixed point required)',
      '- code-review for change-set review',
      '- analyze-artifacts when spec, plan, and tickets must agree',
    ].join('\n'),
  },
  {
    name: 'tester',
    model: 'inherit',
    tools: ['Read', 'Grep', 'Glob', 'Bash'],
    description: 'Designs and runs tests in a sandboxed loop. Use when behavior needs verification at the right seam, including repro loops for hard bugs.',
    body: [
      'You are the tester role of the quirk swarm.',
      '',
      '## Responsibilities',
      '- Choose the right test seam (unit, integration, e2e)',
      '- Run tests and report failures with reproduction steps',
      '- Keep the loop inside its declared budget',
      '',
      '## Governing skills',
      '- testing, tdd, webapp-testing, qa-automation',
      '- diagnosing-bugs for tight reproduction loops',
      '- loop-budget to keep the test loop bounded',
      '',
      '## Note',
      'Bash remains approval-gated by the PreToolUse tool-risk hook; the allow-list here only scopes intent.',
    ].join('\n'),
  },
  {
    name: 'implementer',
    model: 'inherit',
    tools: ['Read', 'Grep', 'Glob', 'Edit', 'Write'],
    description: 'Implements a scoped slice from a spec or ticket and stops at the validated branch. Use when a narrow, claimable work item is ready to build.',
    body: [
      'You are the implementer role of the quirk swarm.',
      '',
      '## Responsibilities',
      '- Implement one vertical slice: behavior, validation, delivery',
      '- Keep the change inside the declared scope of the ticket',
      '- Stop at the implemented, validated branch; do not ship',
      '',
      '## Governing skills',
      '- implement for the build flow and artifact contract',
      '- tdd when the slice benefits from test-first construction',
      '- prototype for throwaway design answers',
    ].join('\n'),
  },
  {
    name: 'doc-writer',
    model: 'inherit',
    tools: ['Read', 'Grep', 'Glob', 'Edit', 'Write'],
    description: 'Writes and maintains durable documentation: ADRs, knowledge bases, and technical guides. Use when a decision or convention must survive beyond the session.',
    body: [
      'You are the doc-writer role of the quirk swarm.',
      '',
      '## Responsibilities',
      '- Turn decisions into ADRs and conventions into guides',
      '- Keep the knowledge base coherent and provenance-carrying',
      '- Write for the next consumer, not for the current session',
      '',
      '## Governing skills',
      '- docs-adrs, docs-knowledge-base, docs-technical-writing',
      '- knowledge-curator for registry and context coherence',
      '- handoff for session-to-session continuity',
    ].join('\n'),
  },
];

// Frontmatter marker that identifies a definition this
// generator owns, so a hand-authored subagent is never
// clobbered and stale owned definitions are removed.
const GENERATOR_MARKER = 'quirk-generated-subagent';

function frontmatter(role) {
  return [
    '---',
    `name: ${role.name}`,
    `description: ${role.description}`,
    `tools: ${role.tools.join(', ')}`,
    `model: ${role.model}`,
    `${GENERATOR_MARKER}: true`,
    '---',
  ].join('\n');
}

function definition(role) {
  return `${frontmatter(role)}\n\n${role.body}\n`;
}

async function readIfExists(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function scanExisting() {
  let entries = [];
  try {
    entries = await fs.readdir(agentsDir);
  } catch {
    return [];
  }
  const existing = [];
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const text = await readIfExists(path.join(agentsDir, entry));
    if (text === null) continue;
    existing.push({ file: entry, owned: text.includes(GENERATOR_MARKER), text });
  }
  return existing;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const json = args.includes('--json');
  if (args.includes('--help') || args.includes('-h')) {
    console.log('generate-subagents options:\n  (no flags) dry-run\n  --write    write .claude/agents/ definitions\n  --json     machine-readable report\n  --help     this help');
    return 0;
  }

  await fs.mkdir(agentsDir, { recursive: true });
  const existing = await scanExisting();
  const report = { mode: write ? 'write' : 'dry-run', root: path.relative(repoRoot, agentsDir), created: [], updated: [], removed: [], unchanged: [], conflicts: [], errors: [] };

  // Remove owned definitions for roles that no longer exist.
  const ownedNames = new Set(ROLES.map((role) => `${role.name}.md`));
  for (const entry of existing) {
    if (entry.owned && !ownedNames.has(entry.file)) {
      report.removed.push(entry.file);
      if (write) await fs.unlink(path.join(agentsDir, entry.file));
    }
  }

  for (const role of ROLES) {
    const file = `${role.name}.md`;
    const target = path.join(agentsDir, file);
    const desired = definition(role);
    const current = await readIfExists(target);
    if (current === null) {
      report.created.push(file);
      if (write) await fs.writeFile(target, desired);
    } else if (current !== desired) {
      if (current.includes(GENERATOR_MARKER)) {
        report.updated.push(file);
        if (write) await fs.writeFile(target, desired);
      } else {
        // A hand-authored subagent with the same name wins.
        report.conflicts.push(file);
      }
    } else {
      report.unchanged.push(file);
    }
  }

  report.status = report.errors.length ? 'error' : report.conflicts.length ? 'conflict' : write ? 'projected' : 'clean';

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[generate-subagents] mode: ${report.mode} (${report.root})`);
    for (const file of report.created) console.log(`[generate-subagents] create: ${file}`);
    for (const file of report.updated) console.log(`[generate-subagents] update: ${file}`);
    for (const file of report.removed) console.log(`[generate-subagents] remove: ${file}`);
    for (const file of report.conflicts) console.log(`[generate-subagents] conflict (hand-authored wins): ${file}`);
    console.log(`[generate-subagents] status: ${report.status} (created ${report.created.length}, updated ${report.updated.length}, unchanged ${report.unchanged.length})`);
  }

  return report.status === 'error' ? 1 : 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`[generate-subagents] error: ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
