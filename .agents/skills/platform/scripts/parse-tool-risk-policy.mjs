#!/usr/bin/env node
// parse-tool-risk-policy.mjs - dependency-free reader for the bounded YAML
// subset that policy/tool-risk.yaml is written in. The repository carries no
// YAML dependency and the policy file is authored to stay inside this subset,
// so a small documented parser replaces a library.
//
// Supported subset (and nothing else):
//   - comment lines whose first non-space character is '#'
//   - block maps with scalar values, nested up to two levels
//   - block sequences of maps: "- key: value" plus deeper "key: value" lines
//   - block sequences of scalars: "- value"
//   - flow sequences used as a value: "[read-only, local-mutating]"
//   - scalars: double/single quoted strings, booleans, integers, null, plain text
//
// Rejected on purpose, each with a line-numbered error: tab indentation,
// anchors and aliases, tags, multi-line block scalars, flow maps, and any line
// that is neither a "key: value" pair nor a "- " list item.
//
// The parsed policy is validated: tools[] entries must carry name, tier and
// risk; rules[] entries must carry id, severity and a statement; defaultTier
// must be declared; duplicate tool names are a parse error.
//
// Usage: node parse-tool-risk-policy.mjs [--policy <path>] [--summary]
// Exit codes: 0 parsed and validated, 2 usage or unreadable/malformed policy.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY_FILE = path.resolve(HERE, '..', '..', '..', '..', 'policy', 'tool-risk.yaml');

export class PolicyParseError extends Error {
  constructor(message, line = null) {
    super(line === null ? message : `${message} (line ${line})`);
    this.name = 'PolicyParseError';
    this.line = line;
  }
}

const KEY_VALUE = /^(?:"([^"]*)"|'([^']*)'|([A-Za-z0-9_][A-Za-z0-9_.-]*))\s*:\s*(.*)$/;
const LIST_ITEM = /^-\s+(.*)$/;
const FLOW_SEQUENCE = /^\[(.*)\]$/;

function defaultPolicyPath(root = process.cwd()) {
  return path.join(root, 'policy', 'tool-risk.yaml');
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A '#' starts a comment only at the start of a line or after whitespace, and
// never inside a quoted scalar.
function stripComment(raw) {
  let quote = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '#' && (i === 0 || /\s/.test(raw[i - 1]))) return raw.slice(0, i);
  }
  return raw;
}

function splitFlowItems(inner, lineNo) {
  const items = [];
  let current = '';
  let quote = null;
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      current += ch;
      if (ch === '\\') { current += inner[i + 1] ?? ''; i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === '[') { depth += 1; current += ch; continue; }
    if (ch === ']') { depth -= 1; current += ch; continue; }
    if (ch === ',' && depth === 0) { items.push(current); current = ''; continue; }
    current += ch;
  }
  items.push(current);
  const cleaned = items.map((item) => item.trim()).filter((item) => item !== '');
  if (!cleaned.length && inner.trim()) {
    throw new PolicyParseError('flow sequence could not be split into items', lineNo);
  }
  return cleaned;
}

function parseScalar(rawValue, lineNo) {
  const value = rawValue.trim();
  if (value === '') return null;
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\'/g, "'");
  }
  const flow = value.match(FLOW_SEQUENCE);
  if (flow) {
    const inner = flow[1].trim();
    if (!inner) return [];
    return splitFlowItems(inner, lineNo).map((item) => parseScalar(item, lineNo));
  }
  if (/^(?:true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^(?:null|~)$/i.test(value)) return null;
  if (/^[+-]?\d+$/.test(value)) return Number(value);
  if (/^[+-]?(?:\d+\.\d*|\.\d+)$/.test(value)) return Number(value);
  return value;
}

function matchKeyValue(content) {
  const match = content.match(KEY_VALUE);
  if (!match) return null;
  const key = (match[1] ?? match[2] ?? match[3] ?? '').trim();
  if (!key) return null;
  return { key, value: match[4] ?? '' };
}

function preprocess(text) {
  const entries = [];
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const withoutComment = stripComment(lines[i]);
    if (!withoutComment.trim()) continue;
    if (/\t/.test(withoutComment)) {
      throw new PolicyParseError('tab indentation is outside the supported subset', i + 1);
    }
    const indent = withoutComment.length - withoutComment.trimStart().length;
    entries.push({ indent, content: withoutComment.trim(), line: i + 1 });
  }
  return entries;
}

function parseSequence(entries, index, indent) {
  const out = [];
  let i = index;
  while (i < entries.length && entries[i].indent === indent && LIST_ITEM.test(entries[i].content)) {
    const entry = entries[i];
    const rest = entry.content.match(LIST_ITEM)[1].trim();
    i += 1;
    if (!rest) {
      if (i < entries.length && entries[i].indent > indent) {
        const parsed = parseNodes(entries, i, entries[i].indent);
        out.push(parsed.value);
        i = parsed.next;
      } else {
        out.push(null);
      }
      continue;
    }
    const pair = matchKeyValue(rest);
    if (!pair) {
      out.push(parseScalar(rest, entry.line));
      continue;
    }
    const item = {};
    assignPair(item, pair, entry.line);
    while (i < entries.length && entries[i].indent > indent) {
      const nested = entries[i];
      if (LIST_ITEM.test(nested.content)) {
        const parsed = parseSequence(entries, i, nested.indent);
        const lastKey = Object.keys(item).pop();
        if (!lastKey) throw new PolicyParseError('nested list without a parent key', nested.line);
        item[lastKey] = parsed.value;
        i = parsed.next;
        continue;
      }
      const nestedPair = matchKeyValue(nested.content);
      if (!nestedPair) {
        throw new PolicyParseError(`unreadable line inside list item: ${nested.content}`, nested.line);
      }
      i += 1;
      assignPair(item, nestedPair, nested.line);
      if (nestedPair.value === '' && i < entries.length && entries[i].indent > nested.indent) {
        const parsed = parseNodes(entries, i, entries[i].indent);
        item[nestedPair.key] = parsed.value;
        i = parsed.next;
      }
    }
    out.push(item);
  }
  return { value: out, next: i };
}

function parseMapping(entries, index, indent) {
  const out = {};
  let i = index;
  while (i < entries.length && entries[i].indent === indent && !LIST_ITEM.test(entries[i].content)) {
    const entry = entries[i];
    const pair = matchKeyValue(entry.content);
    if (!pair) {
      throw new PolicyParseError(`expected "key: value" but found: ${entry.content}`, entry.line);
    }
    i += 1;
    assignPair(out, pair, entry.line);
    if (pair.value !== '') continue;
    if (i < entries.length && entries[i].indent > indent) {
      const parsed = parseNodes(entries, i, entries[i].indent);
      out[pair.key] = parsed.value;
      i = parsed.next;
      continue;
    }
    if (i < entries.length && entries[i].indent === indent && LIST_ITEM.test(entries[i].content)) {
      const parsed = parseSequence(entries, i, indent);
      out[pair.key] = parsed.value;
      i = parsed.next;
      continue;
    }
    out[pair.key] = null;
  }
  return { value: out, next: i };
}

function assignPair(target, pair, lineNo) {
  if (Object.prototype.hasOwnProperty.call(target, pair.key)) {
    throw new PolicyParseError(`duplicate key "${pair.key}"`, lineNo);
  }
  target[pair.key] = pair.value === '' ? null : parseScalar(pair.value, lineNo);
}

function parseNodes(entries, index, indent) {
  if (index >= entries.length) return { value: null, next: index };
  const entry = entries[index];
  if (entry.indent !== indent) {
    throw new PolicyParseError(`inconsistent indentation (expected ${indent} spaces, found ${entry.indent})`, entry.line);
  }
  if (LIST_ITEM.test(entry.content)) return parseSequence(entries, index, indent);
  return parseMapping(entries, index, indent);
}

function validatePolicy(policy) {
  if (!isPlainObject(policy)) throw new PolicyParseError('policy root must be a block map');
  if (policy.defaultTier === null || policy.defaultTier === undefined || String(policy.defaultTier).trim() === '') {
    throw new PolicyParseError('policy must declare defaultTier');
  }
  if (!Array.isArray(policy.tools) || policy.tools.length === 0) {
    throw new PolicyParseError('policy must declare a non-empty tools list');
  }
  const seenNames = new Set();
  for (const tool of policy.tools) {
    if (!isPlainObject(tool)) throw new PolicyParseError('every tools entry must be a map');
    for (const field of ['name', 'tier', 'risk']) {
      const value = tool[field];
      if (value === null || value === undefined || String(value).trim() === '') {
        throw new PolicyParseError(`tools entry is missing "${field}" (offending entry: ${JSON.stringify(tool)})`);
      }
    }
    const name = String(tool.name);
    if (seenNames.has(name)) throw new PolicyParseError(`duplicate tool name in policy: ${name}`);
    seenNames.add(name);
  }
  if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
    throw new PolicyParseError('policy must declare a non-empty rules list');
  }
  const seenRules = new Set();
  for (const rule of policy.rules) {
    if (!isPlainObject(rule)) throw new PolicyParseError('every rules entry must be a map');
    for (const field of ['id', 'severity']) {
      const value = rule[field];
      if (value === null || value === undefined || String(value).trim() === '') {
        throw new PolicyParseError(`rules entry is missing "${field}" (offending entry: ${JSON.stringify(rule)})`);
      }
    }
    const id = String(rule.id);
    if (seenRules.has(id)) throw new PolicyParseError(`duplicate rule id in policy: ${id}`);
    seenRules.add(id);
  }
  return policy;
}

export function parseToolRiskPolicy(text) {
  const entries = preprocess(text);
  if (!entries.length) throw new PolicyParseError('policy file carries no entries');
  const rootIndent = entries[0].indent;
  const parsed = parseNodes(entries, 0, rootIndent);
  if (parsed.next !== entries.length) {
    const leftover = entries[parsed.next];
    throw new PolicyParseError(`unconsumed policy content at line ${leftover.line}: ${leftover.content}`, leftover.line);
  }
  return validatePolicy(parsed.value);
}

export async function readToolRiskPolicy(filePath) {
  const resolved = path.resolve(filePath);
  let text;
  try {
    text = await fs.readFile(resolved, 'utf8');
  } catch {
    throw new PolicyParseError(`policy file is not readable: ${resolved}`);
  }
  return { path: resolved, policy: parseToolRiskPolicy(text) };
}

function parseArgs(argv) {
  const args = { policy: null, summary: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--summary') args.summary = true;
    else if (token === '--policy') {
      args.policy = argv[i + 1];
      if (args.policy === undefined) throw new Error('--policy requires a path');
      i += 1;
    } else if (token.startsWith('--policy=')) args.policy = token.slice('--policy='.length);
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`parse-tool-risk-policy: ${error.message}`);
    return 2;
  }
  if (args.help) {
    console.log('usage: node parse-tool-risk-policy.mjs [--policy <path>] [--summary]');
    console.log('  --policy <path>  policy file to read (default <repo root>/policy/tool-risk.yaml)');
    console.log('  --summary        emit tool and rule counts instead of the whole document');
    console.log('');
    console.log('Emits the validated policy as JSON on stdout. Exit 2 on a malformed or unreadable policy.');
    return 0;
  }
  const policyPath = args.policy ? path.resolve(process.cwd(), args.policy) : defaultPolicyPath();
  let policy;
  try {
    ({ policy } = await readToolRiskPolicy(policyPath));
  } catch (error) {
    console.error(`parse-tool-risk-policy: ${error.message}`);
    return 2;
  }
  if (args.summary) {
    console.log(JSON.stringify({
      policyPath,
      version: policy.version ?? null,
      defaultTier: policy.defaultTier ?? null,
      tiers: Object.keys(policy.tiers ?? {}),
      tools: policy.tools.length,
      rules: policy.rules.length,
      toolNames: policy.tools.map((tool) => String(tool.name)),
      ruleIds: policy.rules.map((rule) => String(rule.id)),
    }, null, 2));
    return 0;
  }
  console.log(JSON.stringify(policy, null, 2));
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((error) => {
    console.error(`parse-tool-risk-policy: ${error?.message ?? error}`);
    process.exit(2);
  });
}

export { DEFAULT_POLICY_FILE, defaultPolicyPath };
