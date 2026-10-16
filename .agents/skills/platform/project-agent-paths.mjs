#!/usr/bin/env node
// project-agent-paths.mjs - generates the native skill views for
// every agent runtime that reads the open Agent Skills format.
//
// `.agents/skills/` is canonical (Codex and Antigravity already
// read it). Each ecosystem expects a different project path:
//
//   Claude Code   .claude/skills/      (managed by fix-compatibility-view)
//   Cursor        .cursor/skills/
//   Gemini CLI    .gemini/skills/
//   GitHub        .github/skills/
//   OpenCode      .opencode/skills/
//   Windsurf      .windsurf/skills/
//
// Each view is a flat symlink farm: one link per canonical skill,
// named by skill, pointing at the canonical directory with a
// relative path so the views stay portable across checkouts
// (absolute links break on clone - the same defect this script
// repairs in the Claude view).
//
// Repairs applied to every first-level entry of a view:
//   - symlink whose destination resolves inside the repository
//     -> rewritten to a relative link when it is absolute
//   - symlink whose destination does not resolve, or resolves
//     outside the repository -> removed
//   - a real directory or file -> left intact and counted as
//     skipped (a local override wins over the projection)
//
// Usage:
//   node .agents/skills/platform/project-agent-paths.mjs [--write] [--json] [--view name]
//
// Default mode is dry-run. --write applies the projection.
// --view limits the run to one ecosystem (cursor, gemini,
// copilot, opencode, windsurf).
//
// Exit codes: 0 = views in sync or fully projected,
//             1 = a repair could not be applied,
//             2 = usage error. Dry-run never fails on drift.
//
// Report fields: per-view scanned/fixed/removed/skipped/pending
// counts, the link actions with from/to pairs, and errors.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = process.cwd();
const skillsRoot = path.join(repoRoot, '.agents', 'skills');

// Native view directory per ecosystem, relative to the repo root.
const VIEWS = {
  cursor: path.join('.cursor', 'skills'),
  gemini: path.join('.gemini', 'skills'),
  copilot: path.join('.github', 'skills'),
  opencode: path.join('.opencode', 'skills'),
  windsurf: path.join('.windsurf', 'skills'),
};

const HELP = `project-agent-paths options:
  (no flags)   dry-run: report the projection each native view needs
  --write      create and repair the native views
  --view name  limit the run to one of: ${Object.keys(VIEWS).join(', ')}
  --json       emit the machine-readable report
  --help       show this help`;

class UsageError extends Error {}

function parseArgs(argv) {
  const flags = { write: false, json: false, help: false, view: null };
  for (const token of argv) {
    if (token === '--write') flags.write = true;
    else if (token === '--json') flags.json = true;
    else if (token === '--help' || token === '-h') flags.help = true;
    else if (token === '--view') flags.viewNext = true;
    else if (flags.viewNext) { flags.view = token; flags.viewNext = false; }
    else throw new UsageError(`unknown argument: ${token}`);
  }
  return flags;
}

// Flat inventory of shippable skills: [{ name, dirPath }].
// The platform domain is tooling, not a shippable skill.
function canonicalSkills() {
  const out = [];
  for (const domain of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!domain.isDirectory() || domain.name === 'platform') continue;
    const domainDir = path.join(skillsRoot, domain.name);
    for (const skill of fs.readdirSync(domainDir, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      if (fs.existsSync(path.join(domainDir, skill.name, 'SKILL.md'))) {
        out.push({ name: skill.name, dirPath: path.join(domainDir, skill.name) });
      }
    }
  }
  // A flat view cannot hold two skills with the same name; that is
  // a bundle defect, so keep the first and record the collision.
  const seen = new Map();
  const collisions = [];
  const unique = [];
  for (const skill of out) {
    if (seen.has(skill.name)) collisions.push({ name: skill.name, first: seen.get(skill.name), second: skill.dirPath });
    else { seen.set(skill.name, skill.dirPath); unique.push(skill); }
  }
  return { skills: unique.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)), collisions };
}

function resolveDestination(linkDir, rawTarget) {
  try {
    return fs.realpathSync(path.resolve(linkDir, rawTarget));
  } catch {
    return null;
  }
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

function projectView(viewName, viewDir, skills) {
  const report = { view: viewName, root: path.relative(repoRoot, viewDir), scanned: 0, created: 0, fixed: 0, removed: 0, skipped: 0, missing: 0, actions: [], errors: [] };

  // Dry-run must be side-effect free. The write path creates the
  // projection directory before applying its planned links.
  if (!fs.existsSync(viewDir)) {
    return report;
  }

  // Existing first-level entries: repair or skip.
  const existing = new Set();
  for (const entry of fs.readdirSync(viewDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const linkPath = path.join(viewDir, entry.name);
    existing.add(entry.name);
    report.scanned += 1;

    if (!entry.isSymbolicLink()) {
      report.skipped += 1;
      continue;
    }

    const raw = fs.readlinkSync(linkPath);
    const destination = resolveDestination(viewDir, raw);

    if (destination === null || !isInside(repoRoot, destination)) {
      report.actions.push({ name: entry.name, action: 'remove', from: raw, to: null, reason: 'destination does not resolve inside the repository', applied: false });
      continue;
    }

    if (path.isAbsolute(raw)) {
      report.actions.push({ name: entry.name, action: 'rewrite', from: raw, to: path.relative(viewDir, destination), reason: 'absolute link retargeted to the canonical bundle path', applied: false });
    }
  }

  // Missing links for canonical skills.
  for (const skill of skills) {
    if (existing.has(skill.name)) continue;
    const target = path.relative(viewDir, skill.dirPath);
    report.actions.push({ name: skill.name, action: 'create', from: null, to: target, reason: 'canonical skill has no native view link', applied: false });
    report.missing += 1;
  }

  return report;
}

function apply(report, viewDir) {
  fs.mkdirSync(viewDir, { recursive: true });
  for (const action of report.actions) {
    const linkPath = path.join(viewDir, action.name);
    try {
      if (action.action === 'remove') {
        fs.unlinkSync(linkPath);
        report.removed += 1;
      } else if (action.action === 'rewrite') {
        fs.unlinkSync(linkPath);
        fs.symlinkSync(action.to, linkPath);
        report.fixed += 1;
      } else {
        fs.symlinkSync(action.to, linkPath);
        report.created += 1;
      }
      action.applied = true;
    } catch (error) {
      action.error = error?.message ?? String(error);
      report.errors.push(`${action.name}: ${action.error}`);
    }
  }
}

function finalize(report, write) {
  const pending = report.actions.filter((action) => !action.applied).length;
  let status = 'clean';
  if (report.errors.length) status = 'error';
  else if (pending > 0) status = 'drift';
  else status = write ? 'projected' : 'clean';
  return {
    mode: write ? 'write' : 'dry-run',
    view: report.view,
    root: report.root,
    scanned: report.scanned,
    created: report.created,
    fixed: report.fixed,
    removed: report.removed,
    skipped: report.skipped,
    missing: report.missing,
    pending,
    status,
    actions: report.actions,
    errors: report.errors,
  };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) { console.log(HELP); return 0; }
  if (flags.view && !VIEWS[flags.view]) throw new UsageError(`unknown view "${flags.view}" (one of: ${Object.keys(VIEWS).join(', ')})`);

  const { skills, collisions } = canonicalSkills();
  const views = flags.view ? [flags.view] : Object.keys(VIEWS);
  const reports = [];
  for (const viewName of views) {
    const viewDir = path.join(repoRoot, VIEWS[viewName]);
    const report = projectView(viewName, viewDir, skills);
    if (flags.write) apply(report, viewDir);
    reports.push(finalize(report, flags.write));
  }

  const summary = {
    mode: flags.write ? 'write' : 'dry-run',
    views: reports,
    collisions,
    canonicalSkills: skills.length,
    status: reports.some((r) => r.status === 'error') ? 'error'
      : reports.some((r) => r.pending > 0) ? 'drift'
      : 'clean',
  };

  if (flags.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const report of reports) {
      console.log(`[project-agent-paths] ${report.view}: ${report.root} (scanned ${report.scanned}, missing ${report.missing}, pending ${report.pending}) [${report.status}]`);
      for (const action of report.actions.slice(0, 5)) {
        const verb = action.applied ? 'applied' : 'propose';
        console.log(`[project-agent-paths]   ${verb}: ${action.name} -> ${action.to ?? '(remove)'} [${action.reason}]`);
      }
      if (report.actions.length > 5) console.log(`[project-agent-paths]   ... and ${report.actions.length - 5} more`);
    }
    if (collisions.length) {
      for (const collision of collisions) console.log(`[project-agent-paths] collision: ${collision.name} at ${collision.second} (first: ${collision.first})`);
    }
    console.log(`[project-agent-paths] status: ${summary.status}`);
  }

  return summary.status === 'error' ? 1 : 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof UsageError) {
        console.error(`[project-agent-paths] ${error.message}`);
        console.error(HELP);
        process.exit(2);
      }
      console.error(`[project-agent-paths] error: ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
