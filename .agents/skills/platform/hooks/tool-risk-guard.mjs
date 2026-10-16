#!/usr/bin/env node
// tool-risk-guard.mjs - PreToolUse hook that enforces
// policy/tool-risk.yaml at runtime.
//
// Claude Code (and compatible runtimes) invoke a PreToolUse
// hook before a tool call, passing the payload on stdin and
// honoring a JSON decision on stdout:
//
//   {"hookSpecificOutput": {"hookEventName": "PreToolUse",
//     "permissionDecision": "allow" | "deny" | "ask",
//     "permissionDecisionReason": "..."}}
//
// Decision model (fail closed, matching the policy's own
// defaultTier: deny):
//   - tool not declared in the policy      -> deny
//   - read-only tier                       -> allow
//   - requiresApproval: true               -> ask
//   - irreversible local-mutating tool     -> ask
//   - network or orchestration tier        -> ask
//   - policy file missing or malformed     -> allow with a
//     stderr note (a missing policy must not brick the
//     session; the guard degrades to no-op)
//
// Direct testing without an agent runtime:
//   echo '{"tool_name":"Bash"}' | node hooks/tool-risk-guard.mjs
//   node hooks/tool-risk-guard.mjs --tool Bash
//
// Exit codes: 0 decision emitted, 1 guard crashed (the
// runtime treats a crashed hook as allow, so the guard logs
// the crash to stderr instead of exiting non-zero on purpose).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readToolRiskPolicy, defaultPolicyPath, PolicyParseError } from '../scripts/parse-tool-risk-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tiers whose calls need explicit user approval.
const ASK_TIERS = new Set(['network', 'orchestration']);

function decide(toolName, policy) {
  const entry = policy.tools.find((tool) => tool.name === toolName);
  if (!entry) {
    return {
      permissionDecision: 'deny',
      permissionDecisionReason: `tool "${toolName}" is not declared in policy/tool-risk.yaml (defaultTier: deny). Declare it with a risk tier before using it.`,
    };
  }
  if (entry.requiresApproval === true) {
    return {
      permissionDecision: 'ask',
      permissionDecisionReason: `tool "${toolName}" is ${entry.tier}/${entry.risk} and the policy requires approval before each call.`,
    };
  }
  if (entry.tier === 'read-only') {
    return {
      permissionDecision: 'allow',
      permissionDecisionReason: `tool "${toolName}" is read-only per policy/tool-risk.yaml.`,
    };
  }
  if (entry.reversible === false || ASK_TIERS.has(entry.tier)) {
    return {
      permissionDecision: 'ask',
      permissionDecisionReason: `tool "${toolName}" is ${entry.tier}/${entry.risk}${entry.reversible === false ? ' and irreversible' : ''}; confirm before the call.`,
    };
  }
  return {
    permissionDecision: 'allow',
    permissionDecisionReason: `tool "${toolName}" is ${entry.tier}/${entry.risk} and reversible per policy/tool-risk.yaml.`,
  };
}

function emit(decision) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision.permissionDecision,
      permissionDecisionReason: decision.permissionDecisionReason,
    },
  };
  console.log(JSON.stringify(output));
}

async function loadPolicy() {
  const policyPath = defaultPolicyPath(process.cwd());
  try {
    const { policy } = await readToolRiskPolicy(policyPath);
    return { policy, error: null };
  } catch (error) {
    return { policy: null, error: error instanceof PolicyParseError ? error.message : String(error?.message ?? error) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  let toolName = null;

  // Direct-test mode: --tool <name> skips stdin.
  const toolFlag = args.indexOf('--tool');
  if (toolFlag !== -1 && args[toolFlag + 1]) toolName = args[toolFlag + 1];

  if (!toolName) {
    let raw = '';
    try {
      raw = await new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => { data += chunk; });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
        // A hook that never receives stdin must not hang forever.
        setTimeout(() => resolve(data), 2000).unref();
      });
    } catch {
      raw = '';
    }
    try {
      const payload = JSON.parse(raw);
      toolName = payload?.tool_name ?? payload?.toolName ?? null;
    } catch {
      toolName = null;
    }
  }

  if (!toolName) {
    // No tool to judge: allow silently. An empty payload is not
    // a policy violation.
    emit({ permissionDecision: 'allow', permissionDecisionReason: 'no tool_name in hook payload; allowing' });
    return 0;
  }

  const { policy, error } = await loadPolicy();
  if (!policy) {
    process.stderr.write(`[tool-risk-guard] policy/tool-risk.yaml unavailable (${error}); guard degrades to allow\n`);
    emit({ permissionDecision: 'allow', permissionDecisionReason: 'tool risk policy not loaded; install policy/tool-risk.yaml to enforce tool risk' });
    return 0;
  }

  emit(decide(toolName, policy));
  return 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      // A crashing hook is treated as allow by the runtime; log
      // the crash so it is visible in the transcript.
      process.stderr.write(`[tool-risk-guard] crashed: ${error?.stack ?? error}\n`);
      emit({ permissionDecision: 'allow', permissionDecisionReason: `tool-risk-guard crashed: ${error?.message ?? error}` });
      process.exit(0);
    },
  );
}
