#!/usr/bin/env node
// memory-index.mjs - memory-filesystem index builder and validator (T0 root index,
// T1 subdirectory indexes).
//
// Research basis (cited in routing/knowledge-curator/references/memory-layout.md):
// - Letta Context Repositories / MemFS (docs.letta.com/agent-sdk/memory): memory is
//   a git-backed filesystem. ROOT files are always in context (indexed); files in
//   subdirectories stay out of context until a task needs them, and a subdirectory
//   with its own MEMORY.md keeps that index out of context on demand. Memory
//   reflection / defrag is a skill, not a runtime service.
// - Devin Agent Memory repo, MIT (docs.devin.ai/product-guides/memory,
//   cognition.com/agent-memory-repo): memory notes are short and each links back to
//   the session that produced it; a write is checked against the current revision
//   and a stale write is rejected instead of silently overwriting; a nightly
//   "dreaming" pass consolidates overlapping notes and drops stale ones.
//
// Convention implemented here:
//   <memory-dir>/
//     *.md          T0 memory files, always in context, each a short note with a
//                   source link back to the originating session
//     MEMORY.md     the T0 index (this tool generates/refreshes it)
//     <subdir>/     T1: out of context until needed; MAY carry its own MEMORY.md
//
// The generated region of MEMORY.md is everything ABOVE the hand-written marker
// block. Rebuilds replace that region and preserve the hand-written section between
// `<!-- memory-index:begin -->` and `<!-- memory-index:end -->` verbatim, so
// rebuilding is idempotent (no timestamps, alphabetical ordering) and never eats a
// curator's notes. Notes outside the markers are generated content and ARE replaced.
//
// Tokens are estimated as ceil(chars / 4), the same unmeasured-text rule the bundle
// uses in context-budget-auditor.mjs.
//
// Usage:
//   node memory-index.mjs build <dir> [--json] [--max-tokens <n>]
//   node memory-index.mjs check <dir> [--json] [--max-tokens <n>] [--max-index-lines <n>]
//   node memory-index.mjs --help
//
// Exit codes: 0 = ok, 1 = check found violations, 2 = usage or I/O error.

import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(HERE, '..', '..', '..');

export const INDEX_FILENAME = 'MEMORY.md';
export const BEGIN_MARKER = '<!-- memory-index:begin -->';
export const END_MARKER = '<!-- memory-index:end -->';
export const DEFAULT_MEMORY_DIR = path.join(repoRoot, '.agents', 'memory');
export const DEFAULT_TOKEN_BUDGET = 2000;
export const DEFAULT_INDEX_LINE_BUDGET = 200;

const CHARS_PER_TOKEN = 4;
const PURPOSE_MAX_CHARS = 120;
const TIER0_TITLE = 'Tier-0 files (always in context)';
const SUBDIR_TITLE = 'Subdirectories (loaded on demand)';
const TIER0_HEADING = `## ${TIER0_TITLE}`;
const SUBDIR_HEADING = `## ${SUBDIR_TITLE}`;

const usage = `memory-index options:
  build <dir>           write/refresh the root MEMORY.md index (default dir: .agents/memory)
  check <dir>           validate the memory tree against the convention
  --json                emit machine-readable JSON
  --max-tokens <n>      per-file token budget (default ${DEFAULT_TOKEN_BUDGET})
  --max-index-lines <n> index line budget (default ${DEFAULT_INDEX_LINE_BUDGET})
  --help                show this help`;

// Code-unit ordering, not localeCompare: index output must be byte-stable across
// machines so rebuilds never produce a spurious diff.
export function compareNames(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function estimateTokens(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// One-line purpose for an index entry: the first meaningful line of the file,
// with markdown noise stripped so the index reads as a sentence, not a dump.
export function derivePurpose(text) {
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#') || line.startsWith('<!--') || line === '---') continue;
    let purpose = line
      .replace(/^[-*+]\s+/, '')
      .replace(/^>\s?/, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^[_*]{1,3}(.+?)[_*]{1,3}$/, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (!purpose) continue;
    return purpose.length > PURPOSE_MAX_CHARS
      ? `${purpose.slice(0, PURPOSE_MAX_CHARS - 1).trimEnd()}\u2026`
      : purpose;
  }
  return '(no purpose line)';
}

export function defaultMemoryDirArg() {
  try {
    return fsSync.statSync(DEFAULT_MEMORY_DIR).isDirectory() ? '.agents/memory' : null;
  } catch {
    return null;
  }
}

function listMarkdownFiles(dir) {
  return fsSync.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(compareNames);
}

function listSubdirectories(dir) {
  return fsSync.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(compareNames);
}

// Recursive walk for the token scan; dot-directories (.git, .scratch) are not
// part of the memory convention.
function listAllMarkdownFiles(dir, out = []) {
  for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listAllMarkdownFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function linkCell(target, label) {
  return `[${label ?? target}](${target})`;
}

function entryFromCell(cell) {
  const linked = cell.trim().match(/^\[([^\]]+)\]\([^)]+\)$/);
  return (linked ? linked[1] : cell.trim()).replace(/\/+$/, '');
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function parseGeneratedEntries(generatedRegion) {
  const files = new Set();
  const dirs = new Map();
  let section = null;
  let afterSeparator = false;
  for (const line of generatedRegion.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      const title = heading[1].trim();
      section = title === TIER0_TITLE ? 'files' : title === SUBDIR_TITLE ? 'dirs' : null;
      afterSeparator = false;
      continue;
    }
    if (!section) continue;
    const row = line.trim().match(/^\|(.+)\|$/);
    if (!row) continue;
    const cells = row[1].split('|').map((cell) => cell.trim());
    if (isSeparatorRow(cells)) {
      // Markdown tables are header row, separator row, then entries; only rows
      // after the separator are index entries, so a header is never an entry.
      afterSeparator = true;
      continue;
    }
    if (!afterSeparator || cells.length < 2) continue;
    const name = entryFromCell(cells[0]);
    if (!name) continue;
    if (section === 'files') files.add(name);
    else dirs.set(name, cells[1]);
  }
  return { files, dirs };
}

export function buildIndex(memoryDir, options = {}) {
  const dir = path.resolve(memoryDir);
  if (!fsSync.existsSync(dir) || !fsSync.statSync(dir).isDirectory()) {
    throw new Error(`memory directory not found: ${dir}`);
  }
  const indexPath = path.join(dir, INDEX_FILENAME);

  const rootFiles = listMarkdownFiles(dir).filter((name) => name !== INDEX_FILENAME);
  const entries = rootFiles.map((name) => {
    const text = fsSync.readFileSync(path.join(dir, name), 'utf8');
    return { file: name, purpose: derivePurpose(text), tokens: estimateTokens(text) };
  });
  const subdirectories = listSubdirectories(dir).map((name) => ({
    dir: name,
    indexed: fsSync.existsSync(path.join(dir, name, INDEX_FILENAME)),
  }));

  const generated = [
    '# Memory',
    '',
    'Tier-0 (T0) files are always in context; subdirectories stay out of context until',
    'a task needs them, and a subdirectory index (T1) loads on demand. Memory is a',
    'git-backed filesystem: a note is not memory until the commit that carries it is',
    'pushed (Letta MemFS, docs.letta.com/agent-sdk/memory).',
    '',
    'Regenerate with `node .agents/skills/platform/memory-index.mjs build <dir>`.',
    'Keep hand-written notes between the memory-index markers so a rebuild keeps them.',
    '',
    TIER0_HEADING,
    '',
    '| File | Purpose | Tokens |',
    '| --- | --- | --- |',
    ...(entries.length
      ? entries.map((entry) => `| ${linkCell(entry.file)} | ${entry.purpose} | ${entry.tokens} |`)
      : ['_(none)_']),
    '',
    SUBDIR_HEADING,
    '',
    '| Directory | Index | Note |',
    '| --- | --- | --- |',
    ...(subdirectories.length
      ? subdirectories.map((sub) => `| ${linkCell(`${sub.dir}/`, `${sub.dir}/`)} | ${sub.indexed ? 'indexed' : 'unindexed'} | ${sub.indexed ? `has ${INDEX_FILENAME} (T1)` : `no ${INDEX_FILENAME}; listed here as unindexed`} |`)
      : ['_(none)_']),
    '',
    '',
  ].join('\n');

  let handWritten = `${BEGIN_MARKER}\n${END_MARKER}\n`;
  if (fsSync.existsSync(indexPath)) {
    const existing = fsSync.readFileSync(indexPath, 'utf8');
    const markerAt = existing.indexOf(BEGIN_MARKER);
    if (markerAt !== -1) handWritten = existing.slice(markerAt);
  }

  const content = `${generated}${handWritten}`;
  const previous = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : null;
  const changed = previous !== content;
  if (changed) fsSync.writeFileSync(indexPath, content);

  return {
    tool: 'memory-index',
    command: 'build',
    dir,
    indexPath,
    changed,
    created: previous === null,
    entries,
    subdirectories,
    totalTokens: entries.reduce((total, entry) => total + entry.tokens, 0),
    status: changed ? 'written' : 'unchanged',
  };
}

export function checkIndex(memoryDir, options = {}) {
  const dir = path.resolve(memoryDir);
  if (!fsSync.existsSync(dir) || !fsSync.statSync(dir).isDirectory()) {
    throw new Error(`memory directory not found: ${dir}`);
  }
  const maxTokens = Number.isFinite(Number(options.maxTokens)) && Number(options.maxTokens) > 0
    ? Number(options.maxTokens)
    : DEFAULT_TOKEN_BUDGET;
  const maxIndexLines = Number.isFinite(Number(options.maxIndexLines)) && Number(options.maxIndexLines) > 0
    ? Number(options.maxIndexLines)
    : DEFAULT_INDEX_LINE_BUDGET;
  const indexPath = path.join(dir, INDEX_FILENAME);
  const findings = [];

  const rootFiles = listMarkdownFiles(dir).filter((name) => name !== INDEX_FILENAME);
  const subdirs = listSubdirectories(dir);

  const indexedFiles = new Set();
  const indexedDirs = new Map();
  let indexText = null;
  let indexLines = 0;
  if (!fsSync.existsSync(indexPath)) {
    findings.push({
      type: 'missing-index',
      message: `no ${INDEX_FILENAME} at the memory root; every root file is unindexed`,
    });
  } else {
    indexText = fsSync.readFileSync(indexPath, 'utf8');
    indexLines = indexText.split(/\r?\n/).length;
    const markerAt = indexText.indexOf(BEGIN_MARKER);
    const endAt = indexText.indexOf(END_MARKER);
    if ((markerAt === -1) !== (endAt === -1) || (markerAt !== -1 && endAt < markerAt)) {
      findings.push({
        type: 'unbalanced-markers',
        message: `${INDEX_FILENAME} has an unbalanced memory-index marker block; build would preserve everything from begin to end of file`,
      });
    }
    // Only the generated region (above the hand-written block) is parsed as index
    // content, so a curator's table inside the markers is never mistaken for an entry.
    const generatedRegion = markerAt === -1 ? indexText : indexText.slice(0, markerAt);
    const parsed = parseGeneratedEntries(generatedRegion);
    for (const name of parsed.files) indexedFiles.add(name);
    for (const [name, status] of parsed.dirs) indexedDirs.set(name, status);
  }

  for (const name of rootFiles) {
    if (!indexedFiles.has(name)) {
      findings.push({
        type: 'unindexed-root-file',
        file: name,
        message: `root file is not indexed in ${INDEX_FILENAME}: ${name}`,
      });
    }
  }
  for (const name of indexedFiles) {
    if (!rootFiles.includes(name)) {
      findings.push({
        type: 'orphan-index-entry',
        file: name,
        message: `indexed file does not exist at the memory root: ${name}`,
      });
    }
  }

  for (const name of subdirs) {
    const hasIndex = fsSync.existsSync(path.join(dir, name, INDEX_FILENAME));
    const status = indexedDirs.get(name);
    if (status === undefined) {
      if (!hasIndex) {
        findings.push({
          type: 'subdir-unaccounted',
          dir: name,
          message: `subdirectory has no ${INDEX_FILENAME} and is not listed in the root index as unindexed: ${name}`,
        });
      }
      continue;
    }
    if (status !== 'indexed' && status !== 'unindexed') {
      findings.push({
        type: 'subdir-status-invalid',
        dir: name,
        message: `subdirectory ${name} is listed with unknown index status "${status}"`,
      });
      continue;
    }
    if (status === 'indexed' && !hasIndex) {
      findings.push({
        type: 'subdir-status-mismatch',
        dir: name,
        message: `subdirectory is listed as indexed but has no ${INDEX_FILENAME}: ${name}`,
      });
    }
    if (status === 'unindexed' && hasIndex) {
      findings.push({
        type: 'subdir-status-mismatch',
        dir: name,
        message: `subdirectory is listed as unindexed but has its own ${INDEX_FILENAME}: ${name}`,
      });
    }
  }
  for (const name of indexedDirs.keys()) {
    if (!subdirs.includes(name)) {
      findings.push({
        type: 'orphan-index-entry',
        dir: name,
        message: `indexed subdirectory does not exist: ${name}`,
      });
    }
  }

  const oversized = [];
  for (const file of listAllMarkdownFiles(dir)) {
    if (path.resolve(file) === path.resolve(indexPath)) continue; // the index has its own line budget
    const tokens = estimateTokens(fsSync.readFileSync(file, 'utf8'));
    if (tokens > maxTokens) {
      oversized.push(path.relative(dir, file));
      findings.push({
        type: 'oversized-file',
        file: path.relative(dir, file),
        tokens,
        maxTokens,
        message: `memory file is ${tokens} tokens, over the ${maxTokens}-token budget: ${path.relative(dir, file)}`,
      });
    }
  }

  if (indexText !== null && indexLines > maxIndexLines) {
    findings.push({
      type: 'oversized-index',
      file: INDEX_FILENAME,
      lines: indexLines,
      maxIndexLines,
      message: `${INDEX_FILENAME} is ${indexLines} lines, over the ${maxIndexLines}-line budget`,
    });
  }

  return {
    tool: 'memory-index',
    command: 'check',
    dir,
    ok: findings.length === 0,
    status: findings.length ? 'fail' : 'pass',
    findings,
    stats: {
      rootFiles: rootFiles.length,
      indexedFiles: indexedFiles.size,
      subdirectories: subdirs.length,
      indexLines,
      maxTokens,
      maxIndexLines,
      oversizedFiles: oversized,
    },
  };
}

export function printBuildReport(report) {
  const lines = [
    report.changed
      ? `memory-index: wrote ${report.indexPath} (${report.entries.length} T0 file(s), ${report.subdirectories.length} subdirectory/ies, ${report.totalTokens} tokens)`
      : `memory-index: ${report.indexPath} already up to date (${report.entries.length} T0 file(s), ${report.subdirectories.length} subdirectory/ies, ${report.totalTokens} tokens)`,
  ];
  for (const sub of report.subdirectories) {
    lines.push(`  ${sub.indexed ? 'indexed  ' : 'unindexed'} ${sub.dir}/`);
  }
  return lines.join('\n');
}

export function printCheckReport(report) {
  const { stats } = report;
  if (report.ok) {
    return [
      `memory-index: ${report.dir} OK - ${stats.rootFiles} root file(s) indexed, ${stats.subdirectories} subdirectory/ies accounted for, index ${stats.indexLines}/${stats.maxIndexLines} lines, token budget ${stats.maxTokens}`,
    ].join('\n');
  }
  const lines = [`memory-index: ${report.dir} FAILED - ${report.findings.length} finding(s)`];
  for (const finding of report.findings) lines.push(`  [${finding.type}] ${finding.message}`);
  return lines.join('\n');
}

const VALUE_FLAGS = ['--max-tokens', '--max-index-lines'];

export function parseArgs(argv) {
  const positional = [];
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (VALUE_FLAGS.includes(arg)) {
      values[arg] = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--')) continue;
    positional.push(arg);
  }
  return { positional, values, flags: argv.filter((arg) => arg.startsWith('--')) };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
    console.log(usage);
    return 0;
  }

  const command = argv[0];
  if (command !== 'build' && command !== 'check') {
    console.error(`memory-index: unknown command "${command}"\n\n${usage}`);
    return 2;
  }

  const { positional, values, flags } = parseArgs(argv.slice(1));
  const memoryDir = path.resolve(process.cwd(), positional[0] ?? DEFAULT_MEMORY_DIR);
  const positiveInt = (raw, fallback) => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  const options = {
    maxTokens: positiveInt(values['--max-tokens'], DEFAULT_TOKEN_BUDGET),
    maxIndexLines: positiveInt(values['--max-index-lines'], DEFAULT_INDEX_LINE_BUDGET),
  };
  const asJson = flags.includes('--json');

  try {
    if (command === 'build') {
      const report = buildIndex(memoryDir, options);
      console.log(asJson ? JSON.stringify(report, null, 2) : printBuildReport(report));
      return 0;
    }
    const report = checkIndex(memoryDir, options);
    console.log(asJson ? JSON.stringify(report, null, 2) : printCheckReport(report));
    return report.ok ? 0 : 1;
  } catch (err) {
    console.error(`memory-index: ${err.message}`);
    return 2;
  }
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code));
}
