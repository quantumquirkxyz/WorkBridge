import { spawn } from 'node:child_process';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultDagFile } from './dag-scheduler.mjs';
import { defaultMemoryDirArg } from './memory-index.mjs';
import { auditSkills as auditContextBudget } from './context-budget-auditor.mjs';
import { auditSkills as auditCostLedger } from './cost-ledger.mjs';
import { auditSkills as auditSpecCompliance } from './validate-spec-compliance.mjs';
import { auditSkills as auditSkillGraph } from './skill-graph.mjs';
import { auditSkillTools } from './check-tool-risk-policy.mjs';
import { auditAdapterDrift } from './scripts/generate-adapters.mjs';
import { auditSkills as auditAgentskillsCompliance } from './agentskills-compliance.mjs';

const REPO_ROOT = process.cwd();
const SKILLS_ROOT = path.join(REPO_ROOT, '.agents', 'skills');
const PLATFORM_TESTS_DIR = path.join('.agents', 'skills', 'platform', 'tests');
const ROOT_TESTS_DIR = 'tests';
const TOOL_RISK_BUDGET_PATH = path.join(REPO_ROOT, 'policy', 'tool-risk-budget.json');

function readJsonFile(file) {
  return JSON.parse(fsSync.readFileSync(file, 'utf8'));
}

function toolRiskBudgetStatus(report, budget) {
  const counts = report?.counts ?? {};
  const limits = budget?.budgets ?? {};
  const errors = Number(counts.errors ?? 0);
  const warnings = Number(counts.warnings ?? 0);
  const maxErrors = Number(limits.errors ?? 0);
  const maxWarnings = Number(limits.warnings ?? 0);
  const over = [];
  if (errors > maxErrors) over.push(`errors ${errors} > budget ${maxErrors}`);
  if (warnings > maxWarnings) over.push(`warnings ${warnings} > budget ${maxWarnings}`);
  return {
    pass: over.length === 0,
    over,
    counts: { errors, warnings },
    budgets: { errors: maxErrors, warnings: maxWarnings },
    budgetSource: path.relative(REPO_ROOT, TOOL_RISK_BUDGET_PATH).split(path.sep).join('/'),
    phase: budget?.phase ?? null,
  };
}

// Single walk + read of every SKILL.md per check-all run. The report-only
// audits below consume this manifest in-process (auditSkills) instead of each
// spawning a subprocess that re-walks and re-parses the whole bundle, which
// used to multiply full traversals of the skills tree.
function buildSkillManifest(skillsRoot) {
  const entries = [];
  const walk = (dir, domain) => {
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      const skillMd = path.join(full, 'SKILL.md');
      const toPosix = (value) => path.relative(REPO_ROOT, value).split(path.sep).join('/');
      if (fsSync.existsSync(skillMd)) {
        entries.push({
          path: toPosix(skillMd),
          dirPath: toPosix(full),
          domain,
          dirName: entry.name,
          text: fsSync.readFileSync(skillMd, 'utf8'),
        });
      } else {
        walk(full, domain || entry.name);
      }
    }
  };
  walk(skillsRoot, '');
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return entries;
}

let manifest = null;
let manifestError = null;
try {
  manifest = buildSkillManifest(SKILLS_ROOT);
} catch (error) {
  manifestError = `cannot walk the skills bundle at ${SKILLS_ROOT}: ${error?.message ?? error}`;
}

// The idempotency demo writes its intent ledger; run it against a temp dir so
// the gate leaves no scratch data in the working tree.
const idempotencyIntentsDir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'quirk-idempotency-demo-'));

// node --test only expanded glob patterns on Node 21+, so the pinned Node 20
// runner would treat a literal "*.test.mjs" argument as a filename and fail.
// Expand the test directories here (readdir + filter + sort, no shell, no glob)
// and hand node --test explicit, existing file paths instead.
function listTestFiles(dir) {
  let names;
  try {
    names = fsSync.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => path.join(dir, name));
}

function testArgs(dir) {
  return ['--test', ...listTestFiles(dir)];
}

const checks = [
  ['node', ['.agents/skills/platform/validate-skills.mjs']],
  ['node', ['.agents/skills/platform/validate-traceability.mjs']],
  ['node', ['.agents/skills/platform/audit-semantics.mjs']],
  ['node', ['.agents/skills/platform/evaluate-scenarios.mjs']],
  ['node', ['.agents/skills/platform/evaluate-behavioral-fixtures.mjs']],
  ['node', ['--check', '.agents/skills/platform/audit-semantics.mjs']],
  ['node', ['--check', '.agents/skills/platform/evaluate-scenarios.mjs']],
  ['node', ['--check', '.agents/skills/platform/evaluate-behavioral-fixtures.mjs']],
  ['node', ['--check', '.agents/skills/platform/sync-bundle.mjs']],
  ['bash', ['-n', '.agents/skills/delivery/diagnosing-bugs/scripts/hitl-loop.template.sh']],
  ['node', ['.agents/skills/platform/loop-runner.mjs', '--demo', '--json']],
  ['node', ['.agents/skills/platform/idempotency.mjs', '--demo', '--intents-dir', idempotencyIntentsDir]],
  ['node', ['.agents/skills/platform/security-scan-skills.mjs', '--strict']],
  ['node', ['evals/run-routing.mjs', '--check']],
  ['node', testArgs(PLATFORM_TESTS_DIR)],
  ['node', ['.agents/skills/platform/validate-runtime-manifests.mjs', '--check', '--json']],
  ['node', ['.agents/skills/platform/scripts/run-skill-task.mjs', 'task-lockfile-integrity', '--json']],
  ['node', ['.agents/skills/platform/scripts/build-skill-index.mjs', '--json']],
];

const memoryDir = defaultMemoryDirArg();
const memoryReportChecks = memoryDir
  ? [['node', ['.agents/skills/platform/memory-index.mjs', 'check', memoryDir, '--json']]]
  : [];
const memorySkipReason = 'no memory directory at .agents/memory (the layout is a shipped convention, not a runtime store)';
const compatibilityViewReportChecks = [
  ['node', ['.agents/skills/platform/fix-compatibility-view.mjs', '--json']],
];

// Runtime-evidence report checks: each runs its CLI,
// emits JSON, and a non-clean status sets the check
// code to 1. Proposals from trace-improver are
// informational by design: having improvement
// proposals is not a gate failure.
const runtimeEvidenceReportChecks = [
  ['node', ['.agents/skills/platform/project-agent-paths.mjs', '--json']],
  ['node', ['.agents/skills/platform/trajectory-eval.mjs', '--json']],
  ['node', ['.agents/skills/platform/trace-improver.mjs', '--json']],
  ['node', ['.agents/skills/platform/benchmark-harness.mjs', '--repeats', '1', '--json']],
];

function runtimeEvidenceExitCode(parsed) {
  // A report-producing gate must fail closed when its JSON cannot be
  // parsed; otherwise a crashed evaluator can silently pass the gate.
  if (!parsed) return 1;
  if (parsed.status === 'fail' || parsed.status === 'error') return 1;
  if (parsed.status === 'drift' && Number(parsed.pending ?? 0) > 0) return 1;
  if (Array.isArray(parsed.violations) && parsed.violations.length > 0) return 1;
  return 0;
}

// Report-only audits: run in-process instead of spawning subprocesses, most
// of them against the one shared manifest. Each entry keeps the command
// string, exit code, and report shape of its CLI. Non-zero report-only results
// are captured and surfaced, but only gating checks decide check-all's exit code.
const reportOnlyAudits = [
  {
    command: 'node .agents/skills/platform/context-budget-auditor.mjs --json --no-write',
    exitCode: () => 0,
    audit: () => auditContextBudget(manifest),
  },
  {
    command: 'node .agents/skills/platform/cost-ledger.mjs --json',
    exitCode: () => 0,
    audit: () => auditCostLedger(manifest),
  },
  {
    command: 'node .agents/skills/platform/validate-spec-compliance.mjs --json',
    exitCode: (report) => (report?.errors?.length ? 1 : 0),
    audit: () => auditSpecCompliance(manifest),
  },
  {
    command: 'node .agents/skills/platform/skill-graph.mjs build --json',
    exitCode: () => 0,
    audit: () => auditSkillGraph(manifest, { root: REPO_ROOT }),
  },
  // The tool-risk checker exposes real bundle debt and gates it against the
  // published debt budget in policy/tool-risk-budget.json. Existing debt can be
  // capped during staged remediation, but any increase over the budget fails the
  // full local gate.
  {
    command: 'node .agents/skills/platform/check-tool-risk-policy.mjs --json',
    mode: 'budgeted-gate',
    exitCode: (report) => {
      const budget = readJsonFile(TOOL_RISK_BUDGET_PATH);
      return toolRiskBudgetStatus(report, budget).pass ? 0 : 1;
    },
    budgetStatus: (report) => toolRiskBudgetStatus(report, readJsonFile(TOOL_RISK_BUDGET_PATH)),
    audit: () => auditSkillTools(manifest),
  },
  // Agentskills.io open-standard compliance: the bundle
  // must stay expressible in the form every ecosystem
  // runtime and community registry ingests.
  {
    command: 'node .agents/skills/platform/agentskills-compliance.mjs --json',
    exitCode: (report) => (report?.violations?.length ? 1 : 0),
    audit: () => auditAgentskillsCompliance(manifest),
  },
  // Regenerates the 1484 adapters in memory and compares them with the
  // committed tree. The CLI always exits 0 in dry-run mode, so drift is
  // reported here (exit 1 on a non-empty error list) without ever gating.
  {
    command: 'node .agents/skills/platform/scripts/generate-adapters.mjs --json',
    exitCode: (report) => (report?.errors?.length ? 1 : 0),
    audit: () => auditAdapterDrift(REPO_ROOT),
  },
];

const dagFile = defaultDagFile();
const dagGateChecks = dagFile
  ? [['node', ['.agents/skills/platform/dag-scheduler.mjs', '--check', dagFile, '--json']]]
  : [];
const dagSkipReason = 'no default ticket DAG file under .agents/skills/platform/workflows or .agents/skills/platform/artifacts';

const rootTestFiles = listTestFiles(ROOT_TESTS_DIR);
const rootTestGateChecks = rootTestFiles.length
  ? [['node', testArgs(ROOT_TESTS_DIR)]]
  : [];
const rootTestSkipReason = `no *.test.mjs files under ${ROOT_TESTS_DIR}/ (root test suite absent)`;

const modeMetadata = {
  layer: 'Layer 0',
  mode: 'structural',
  judge: 'none',
  modelInvocation: 'none',
  banner: 'Layer 0 structural gate; no model was invoked',
};

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => {
      resolve({ command: [command, ...args].join(' '), code, stdout, stderr });
    });
  });
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

const gatingResults = [];
for (const [command, args] of [...checks, ...dagGateChecks, ...rootTestGateChecks]) {
  gatingResults.push(await run(command, args));
}
fsSync.rmSync(idempotencyIntentsDir, { recursive: true, force: true });

const reportResults = [];
for (const entry of reportOnlyAudits) {
  let report = null;
  let error = null;
  try {
    if (manifestError) throw new Error(manifestError);
    report = entry.audit();
  } catch (auditError) {
    error = auditError?.stack ?? String(auditError);
    report = null;
  }
  reportResults.push({ ...entry, report, error, code: error ? 2 : entry.exitCode(report) });
}
for (const [command, args] of [...compatibilityViewReportChecks, ...memoryReportChecks, ...runtimeEvidenceReportChecks]) {
  const result = await run(command, args);
  const parsed = parseJson(result.stdout.trim());
  if (parsed?.status === 'drift' && parsed?.pending > 0) {
    result.code = 1;
  }
  if (runtimeEvidenceReportChecks.some((entry) => entry.join(' ') === [command, ...args].join(' '))) {
    result.code = runtimeEvidenceExitCode(parsed);
  }
  reportResults.push(result);
}

const failures = gatingResults.filter((result) => result.code !== 0);
const reportFailures = reportResults.filter((result) => result.code !== 0);
const budgetedReportFailures = reportResults.filter((result) => result.mode === 'budgeted-gate' && result.code !== 0);
const reportStderr = (result) => (result.error ?? result.stderr ?? '').trim();

const parsedResults = gatingResults.map((result) => parseJson(result.stdout.trim()));
const structuredChecks = gatingResults.map((result, index) => {
  const parsed = parsedResults[index];
  return {
    command: result.command,
    status: result.code === 0 ? 'pass' : 'fail',
    code: result.code,
    skills: parsed?.skills ?? null,
    scenarios: parsed?.scenarios ?? null,
    fixtures: parsed?.fixtures ?? null,
    warnings: parsed?.warnings?.length ?? 0,
    errors: parsed?.errors?.length ?? 0,
  };
});

const reportChecks = reportResults.map((result) => {
  const parsed = result.report ?? (result.stdout ? parseJson(result.stdout.trim()) : null) ?? {};
  const budget = result.budgetStatus ? result.budgetStatus(parsed) : null;
  return {
    command: result.command,
    status: result.code === 0 ? 'pass' : 'fail',
    code: result.code,
    mode: result.mode ?? 'report-only',
    skills: parsed?.skills ?? null,
    scenarios: parsed?.scenarios ?? null,
    fixtures: parsed?.fixtures ?? null,
    warnings: parsed?.warnings?.length ?? 0,
    errors: parsed?.errors?.length ?? 0,
    detail: parsed?.totalTokens ?? parsed?.nodes ?? null,
    budget,
  };
});

function skippedCheck(command, reason) {
  return {
    command,
    status: 'skip',
    code: null,
    mode: 'skipped',
    skills: null,
    scenarios: null,
    fixtures: null,
    warnings: 0,
    errors: 0,
    reason,
  };
}

const skippedChecks = [
  ...(dagFile ? [] : [skippedCheck(
    'node .agents/skills/platform/dag-scheduler.mjs --check',
    dagSkipReason,
  )]),
  ...(memoryDir ? [] : [skippedCheck(
    'node .agents/skills/platform/memory-index.mjs check .agents/memory',
    memorySkipReason,
  )]),
  ...(rootTestFiles.length ? [] : [skippedCheck(
    'node --test tests/*.test.mjs',
    rootTestSkipReason,
  )]),
];

const allChecks = [...structuredChecks, ...reportChecks, ...skippedChecks];
const skillsCount = structuredChecks.find((check, index) => parsedResults[index]?.skills !== undefined)?.skills
  ?? structuredChecks.find((check, index) => parsedResults[index]?.skills)?.skills ?? null;

const report = {
  modeMetadata,
  status: failures.length || budgetedReportFailures.length ? 'fail' : 'pass',
  checks: structuredChecks,
  reportChecks,
  skippedChecks,
  summary: {
    totalChecks: gatingResults.length,
    passed: gatingResults.length - failures.length,
    failed: failures.length,
    skippedChecks: skippedChecks.length,
    reportChecks: reportChecks.length,
    budgetedGateChecks: reportChecks.filter((check) => check.mode === 'budgeted-gate').length,
    skillsEvaluated: skillsCount,
    totalWarnings: allChecks.reduce((total, check) => total + check.warnings, 0),
    totalErrors: allChecks.reduce((total, check) => total + check.errors, 0),
  },
};

console.log(JSON.stringify(report, null, 2));

if (failures.length) {
  for (const failure of failures) {
    console.error(`\n${failure.command}`);
    if (failure.stdout.trim()) console.error(failure.stdout.trim());
    if (failure.stderr.trim()) console.error(failure.stderr.trim());
  }
  process.exit(1);
}

if (reportFailures.length) {
  console.error(`\nreport-only checks reported errors (gate stays ${report.status} unless the check is budgeted):`);
  for (const failure of reportFailures) {
    console.error(`${failure.command}${failure.code === null ? ' (crashed)' : ` (exit ${failure.code})`}`);
    const detail = reportStderr(failure);
    if (detail) console.error(detail);
  }
}

if (budgetedReportFailures.length) {
  console.error(`\nbudgeted report checks exceeded their configured policy (gate fails):`);
  for (const failure of budgetedReportFailures) {
    console.error(`${failure.command}${failure.code === null ? ' (crashed)' : ` (exit ${failure.code})`}`);
    const detail = reportStderr(failure);
    if (detail) console.error(detail);
  }
  process.exit(1);
}
