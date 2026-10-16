// workflow-state-machine.mjs - executable state machine for platform/workflows/*.yaml
//
// Commands:
//   <workflow> current          print the current state (text, or --json)
//   <workflow> legal-events     print the events legal from the current state
//                               AFTER guard evaluation (text, or --json)
//                               (both `<workflow> <command>` and
//                               `<command> <workflow>` argument orders work)
//   <workflow> transition <event>
//                               advance; illegal events are rejected
//   <workflow> reset            restart at the entry point
//   <workflow> history          print the persisted event history
//   <workflow> replay [--to <seq>] [--from <seq>]
//                               re-fold the checkpoint journal into a state
//                               object and print it; folding the whole journal
//                               reproduces the persisted snapshot exactly
//                               (`verified`). `--to` stops at a seq, `--from`
//                               resumes the fold at a seq. Guard decisions are
//                               re-evaluated: a disagreement with the recorded
//                               guardResult is reported as `divergence`.
//                               A missing journal prints a structured
//                               `no-journal` result and still exits 0.
//   <workflow> fork --to <seq> [--set key=value ...] [--name <forkName>]
//                               branch a NEW thread from the state at <seq>
//                               with `--set` overrides applied; the original
//                               thread is never modified
//
// Guards (research basis: Stately/XState agent semantics - "the machine defines
// what the agent can do; the model only ever picks a legal event"). A guard is
// a transition predicate, NOT a prompt instruction: it is declared per state as
// `guards: {EVENT: "<expression>"}`, mirroring the shape of `transitions:
// {EVENT: target}` and keyed by the leaving event, so the guard sits exactly
// where the event leaves the state. Expressions are evaluated by the machine
// against the persisted workflow context with a small safe interpreter (no
// eval/Function). Grammar: ==, !=, >=, <=, >, <, &&, ||, !, parentheses,
// string/number/bool literals, dotted context paths (review.passCount) and
// len(array) >= n. An event whose guard does not hold is rejected with the
// structured result {ok:false, reason:"rejected-by-guard", event,
// legalEvents:[...], guard:"<expression>"}, the rejection is recorded in the
// state history (event `rejected-by-guard`, together with the remaining legal
// move set), and the legal alternatives are re-offered to the caller.
// Guards are pure functions of (state, context): same state + same context =>
// same decision. No clock, randomness, or I/O enters the decision, so the
// persisted snapshot plus the event log replays to identical decisions
// (replay stability). Unresolved context paths fail closed (event rejected).
// When no guard is declared for an event, behavior is exactly as before.
//
// Idempotency (research basis: Temporal - "write intent before executing the
// effect", effect sandwich record claim -> execute -> commit outcome;
// LangGraph HITL - resume re-executes the whole node from its start, so side
// effects before an interrupt must be safe to re-run): mutating skills pair
// this machine with platform/idempotency.mjs.
//
// `transition` exit codes: 0 ok, 1 invalid event or max-iteration escalation,
// 2 rejected-by-guard. `replay` exits 0 (ok and no-journal), 1 (usage), 3
// (divergence: guard re-evaluation disagrees with the journal).
//
// Checkpoint journal (research basis: LangGraph checkpointers -
// docs.langchain.com/oss/python/langgraph/checkpointers and use-time-travel;
// the MODEL is adapted, not the framework). platform/state/<workflow>.json
// remains the authoritative CURRENT snapshot with an unchanged shape; the
// journal in checkpoints/<workflow>.jsonl is an ADDITIVE, append-only event log
// from which that snapshot is derived by folding (see CHECKPOINTS.md). A
// state-changing command (transition, rejected-by-guard, reset, escalate) takes
// a timestamp first and appends exactly one JSON line:
//   {seq, ts, workflow, event, from, to, contextDelta?, guard?, guardResult?,
//    legalEvents?, status, loopIterations}
// `contextDelta` is a sparse top-level context patch (null removes a key), so a
// fold replays the context without copying the whole object per event. The
// journal may be absent for legacy runs (a snapshot written before the journal
// existed): replay then reports `no-journal` instead of failing.
//
// Test isolation: WORKFLOW_STATE_MACHINE_STATE_DIR and
// WORKFLOW_STATE_MACHINE_WORKFLOWS_DIR override the state and workflow
// directories (defaults: platform/state and platform/workflows). The ambient
// repository state directory is never written by tests.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKFLOWS_DIR = process.env.WORKFLOW_STATE_MACHINE_WORKFLOWS_DIR
  ? resolve(process.env.WORKFLOW_STATE_MACHINE_WORKFLOWS_DIR)
  : join(__dirname, 'workflows')
// Resolved per call rather than once at import, so a caller that redirects the
// directories with the environment overrides gets the same behaviour the CLI
// has (the CLI resolves them from process.env on every invocation anyway).
function stateDir() {
  return process.env.WORKFLOW_STATE_MACHINE_STATE_DIR
    ? resolve(process.env.WORKFLOW_STATE_MACHINE_STATE_DIR)
    : join(__dirname, 'state')
}

// Journal location: .agents/skills/platform/checkpoints/<workflow>.jsonl by
// default. WORKFLOW_STATE_MACHINE_CHECKPOINTS_DIR overrides it explicitly; when
// the state directory is overridden (tests, scratch runs) the journal nests
// inside it, so isolation travels with the existing wave-2 env var.
function checkpointsDir() {
  if (process.env.WORKFLOW_STATE_MACHINE_CHECKPOINTS_DIR) {
    return resolve(process.env.WORKFLOW_STATE_MACHINE_CHECKPOINTS_DIR)
  }
  if (process.env.WORKFLOW_STATE_MACHINE_STATE_DIR) {
    return join(stateDir(), 'checkpoints')
  }
  return join(__dirname, 'checkpoints')
}

function parseScalar(str) {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1)
  }
  if (str === 'true') return true
  if (str === 'false') return false
  const num = Number(str)
  if (!Number.isNaN(num) && str.trim() !== '') return num
  return str
}

function parseYaml(text) {
  const lines = text.split('\n')
  const root = {}
  const path = [{ container: root, indent: -1 }]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) continue

    const indent = line.search(/\S/)
    const trimmed = line.trim()

    if (trimmed.startsWith('- ')) {
      const value = parseScalar(trimmed.slice(2))
      for (let j = path.length - 1; j >= 0; j--) {
        if (Array.isArray(path[j].container)) {
          path[j].container.push(value)
          break
        }
      }
      continue
    }

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const key = trimmed.slice(0, colonIdx).trim()
    const valueStr = trimmed.slice(colonIdx + 1).trim()

    while (path.length > 1 && indent <= path[path.length - 1].indent) {
      path.pop()
    }

    const current = path[path.length - 1].container

    if (valueStr === '') {
      let lookahead = i + 1
      while (lookahead < lines.length && (!lines[lookahead].trim() || lines[lookahead].trim().startsWith('#'))) {
        lookahead++
      }
      if (lookahead < lines.length) {
        const nextLine = lines[lookahead]
        const nextIndent = nextLine.search(/\S/)
        const nextTrimmed = nextLine.trim()
        if (nextIndent > indent) {
          if (nextTrimmed.startsWith('- ')) {
            const list = []
            current[key] = list
            path.push({ container: list, indent })
          } else if (nextTrimmed.includes(':')) {
            const dict = {}
            current[key] = dict
            path.push({ container: dict, indent })
          } else {
            current[key] = ''
          }
          continue
        }
      }
      const dict = {}
      current[key] = dict
      path.push({ container: dict, indent })
    } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      const items = valueStr.slice(1, -1).split(',').map(s => parseScalar(s.trim()))
      current[key] = items
    } else {
      current[key] = parseScalar(valueStr)
    }
  }

  return root
}

function loadWorkflow(name) {
  const path = join(WORKFLOWS_DIR, name + '.yaml')
  let text
  try {
    text = readFileSync(path, 'utf-8')
  } catch (error) {
    // A fork has no YAML of its own: it resolves through the parent recorded
    // in its first journal record, so `<forkName> <command>` works exactly
    // like any other workflow.
    const parent = forkParent(name)
    if (parent) return loadWorkflow(parent)
    throw error
  }
  return parseYaml(text)
}

// ---------------------------------------------------------------------------
// Guard expression interpreter
//
// Deliberately small recursive-descent parser over a token list - no eval and
// no Function, so a guard expression can never execute arbitrary code. Guards
// are pure: evaluation reads only the context argument, so the same (state,
// context) always yields the same decision and the persisted snapshot plus
// event log replays identically (replay stability).
//
//   expr        := or
//   or          := and ( '||' and )*
//   and         := not ( '&&' not )*
//   not         := '!' not | comparison
//   comparison  := primary ( ('=='|'!='|'>='|'<='|'>'|'<') primary )?
//   primary     := '(' expr ')' | literal | contextPath | 'len' '(' contextPath ')'
//
// Unresolved context paths evaluate to undefined, so a guard over missing
// context fails closed (the event is rejected); an unparseable expression also
// fails closed rather than silently opening a transition.
// ---------------------------------------------------------------------------

const COMPARISON_OPS = ['==', '!=', '>=', '<=', '>', '<']

function tokenizeGuard(expression) {
  const tokens = []
  let i = 0
  while (i < expression.length) {
    const ch = expression[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1
      let value = ''
      while (j < expression.length && expression[j] !== ch) {
        value += expression[j]
        j++
      }
      if (expression[j] !== ch) throw new Error('unterminated string literal')
      tokens.push({ type: 'string', value })
      i = j + 1
      continue
    }
    const twoChar = expression.slice(i, i + 2)
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChar)) {
      tokens.push({ type: 'op', value: twoChar })
      i += 2
      continue
    }
    if (['>', '<', '!', '(', ')'].includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }
    const next = expression[i + 1]
    if ((ch >= '0' && ch <= '9') || (ch === '-' && next !== undefined && next >= '0' && next <= '9')) {
      let j = i + (ch === '-' ? 1 : 0)
      while (j < expression.length && expression[j] >= '0' && expression[j] <= '9') j++
      if (expression[j] === '.') {
        j++
        while (j < expression.length && expression[j] >= '0' && expression[j] <= '9') j++
      }
      tokens.push({ type: 'number', value: Number(expression.slice(i, j)) })
      i = j
      continue
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < expression.length && /[A-Za-z0-9_$.]/.test(expression[j])) j++
      tokens.push({ type: 'ident', value: expression.slice(i, j) })
      i = j
      continue
    }
    throw new Error('unexpected character: ' + ch)
  }
  return tokens
}

function resolveContextPath(path, context) {
  let value = context
  for (const part of path.split('.')) {
    if (value === null || value === undefined || typeof value !== 'object') return undefined
    value = value[part]
  }
  return value
}

function compareValues(left, op, right) {
  switch (op) {
    case '==': return left === right
    case '!=': return left !== right
    case '>': return left > right
    case '<': return left < right
    case '>=': return left >= right
    case '<=': return left <= right
    default: throw new Error('unknown comparison operator: ' + op)
  }
}

function createGuardParser(tokens, context) {
  let pos = 0
  const peek = () => tokens[pos]
  const advance = () => tokens[pos++]

  function parseExpression() {
    return parseOr()
  }

  function parseOr() {
    let left = parseAnd()
    while (peek() && peek().type === 'op' && peek().value === '||') {
      advance()
      const right = parseAnd()
      left = left || right
    }
    return left
  }

  function parseAnd() {
    let left = parseNot()
    while (peek() && peek().type === 'op' && peek().value === '&&') {
      advance()
      const right = parseNot()
      left = left && right
    }
    return left
  }

  function parseNot() {
    if (peek() && peek().type === 'op' && peek().value === '!') {
      advance()
      return !parseNot()
    }
    return parseComparison()
  }

  function parseComparison() {
    const left = parsePrimary()
    if (peek() && peek().type === 'op' && COMPARISON_OPS.includes(peek().value)) {
      const op = advance().value
      const right = parsePrimary()
      return compareValues(left, op, right)
    }
    return left
  }

  function parsePrimary() {
    const token = advance()
    if (!token) throw new Error('unexpected end of guard expression')
    if (token.type === 'op' && token.value === '(') {
      const value = parseExpression()
      const close = advance()
      if (!close || close.type !== 'op' || close.value !== ')') throw new Error('expected )')
      return value
    }
    if (token.type === 'op' && token.value === ')') throw new Error('unexpected )')
    if (token.type === 'string' || token.type === 'number') return token.value
    if (token.type === 'ident') {
      if (token.value === 'true') return true
      if (token.value === 'false') return false
      if (token.value === 'null') return null
      if (token.value === 'len') {
        const open = advance()
        if (!open || open.type !== 'op' || open.value !== '(') throw new Error('len expects (contextPath)')
        const pathToken = advance()
        if (!pathToken || pathToken.type !== 'ident') throw new Error('len expects a context path')
        const close = advance()
        if (!close || close.type !== 'op' || close.value !== ')') throw new Error('expected ) after len(contextPath)')
        const value = resolveContextPath(pathToken.value, context)
        if (!Array.isArray(value)) throw new Error('len() expects an array context path')
        return value.length
      }
      return resolveContextPath(token.value, context)
    }
    throw new Error('unexpected token in guard expression')
  }

  return {
    parseExpression,
    atEnd: () => pos >= tokens.length
  }
}

// Evaluate a guard expression against a workflow context. Returns a boolean;
// any malformed expression or missing context path fails closed to false.
function evaluateGuard(expression, context) {
  if (typeof expression !== 'string' || expression.trim() === '') return true
  try {
    const tokens = tokenizeGuard(expression)
    if (tokens.length === 0) return true
    const parser = createGuardParser(tokens, context || {})
    const value = parser.parseExpression()
    if (!parser.atEnd()) throw new Error('trailing tokens in guard expression')
    return Boolean(value)
  } catch {
    return false
  }
}

// Merge the YAML context defaults under the persisted context: values already
// present in the snapshot win, missing keys (including nested ones) are filled
// from the declared defaults. Defaults are cloned so the workflow definition
// object is never mutated by runtime state.
function mergeContext(defaults, current) {
  const merged = { ...current }
  for (const [key, value] of Object.entries(defaults || {})) {
    if (merged[key] === undefined) {
      merged[key] = value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value
    } else if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      merged[key] && typeof merged[key] === 'object' && !Array.isArray(merged[key])
    ) {
      merged[key] = mergeContext(value, merged[key])
    }
  }
  return merged
}

// The context a guard sees: persisted context merged over YAML defaults.
function effectiveContext(workflow, state) {
  return mergeContext(workflow.context || {}, (state && state.context) || {})
}

// ---------------------------------------------------------------------------
// Checkpoint journal (append-only event log) and time travel
//
// Research basis: LangGraph checkpointers
// (docs.langchain.com/oss/python/langgraph/checkpointers and the use-time-travel
// guide). The MODEL is adapted, not the framework: instead of a checkpointer
// object with get_state/update_state, this machine keeps
//   * an append-only JSONL journal at checkpoints/<workflow>.jsonl, and
//   * the CURRENT snapshot at state/<workflow>.json, which is DERIVED by
//     folding the journal (the snapshot keeps its historical shape; the
//     journal is additive and may be absent for legacy runs).
//
// Pending-writes semantics: a step rejected by a guard still appends its
// record (status 'rejected-by-guard', guardResult false), so a failed step
// never invalidates the successful siblings already folded into the snapshot -
// the machine stays where it was and the legal move set is re-offered.
//
// Time travel is replay (re-fold from a prior checkpoint) and fork (branch
// from a prior checkpoint with a modified context into a NEW thread, which
// never rolls back or mutates the original thread).
// ---------------------------------------------------------------------------

function journalPath(name) {
  return join(checkpointsDir(), name + '.jsonl')
}

// The journal as an ordered array of records, or null when the file does not
// exist (a legacy run predating the journal). A torn trailing line - the crash
// mid-append case - is skipped rather than failing the fold, so replay
// degrades to the last complete record.
function readJournal(name) {
  let text
  try {
    text = readFileSync(journalPath(name), 'utf-8')
  } catch {
    return null
  }
  const records = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    try {
      records.push(JSON.parse(trimmed))
    } catch {
      continue
    }
  }
  return records
}

// Append exactly one journal line for a state-changing command. The snapshot is
// written first and stays authoritative, so a journal write failure is
// best-effort: the command still succeeds and replay later reports
// `no-journal` instead of crashing.
function appendJournalEvent(fields) {
  try {
    const workflow = fields.state.workflow
    const records = readJournal(workflow) || []
    const seq = records.reduce((max, record) => Math.max(max, Number(record.seq) || 0), 0) + 1
    mkdirSync(checkpointsDir(), { recursive: true })
    appendFileSync(journalPath(workflow), JSON.stringify({
      seq: seq,
      ts: fields.ts,
      workflow: workflow,
      event: fields.event,
      from: fields.from,
      to: fields.to,
      ...(fields.contextDelta ? { contextDelta: fields.contextDelta } : {}),
      ...(fields.guard !== undefined ? { guard: fields.guard } : {}),
      ...(fields.guardResult !== undefined ? { guardResult: fields.guardResult } : {}),
      ...(fields.legalEvents ? { legalEvents: fields.legalEvents } : {}),
      ...(fields.forkedFrom ? { forkedFrom: fields.forkedFrom } : {}),
      status: fields.status,
      loopIterations: Number((fields.state.context || {}).loopIterations) || 0
    }) + '\n')
  } catch {
    // Additive audit trail only - never fail the command it records.
  }
}

// Sparse top-level context delta between the context before and after a
// command. The machine's only context mutation today is the loop counter, but
// computing the delta rather than assuming the key keeps the journal honest if
// more context fields are ever mutated, and keeps escalation (which moves the
// counter and the state in the same command) replay-exact.
function contextDeltaOf(before, after) {
  const delta = {}
  const beforeMap = before || {}
  const afterMap = after || {}
  for (const key of Object.keys(afterMap)) {
    if (JSON.stringify(beforeMap[key]) !== JSON.stringify(afterMap[key])) {
      delta[key] = afterMap[key]
    }
  }
  for (const key of Object.keys(beforeMap)) {
    if (!Object.prototype.hasOwnProperty.call(afterMap, key)) {
      delta[key] = null
    }
  }
  return Object.keys(delta).length > 0 ? delta : undefined
}

// Sparse top-level context patch: null removes a key, any other value sets it.
function applyContextDelta(context, delta) {
  const next = { ...context }
  if (!delta || typeof delta !== 'object') return next
  for (const [key, value] of Object.entries(delta)) {
    if (value === null) {
      delete next[key]
    } else {
      next[key] = value
    }
  }
  return next
}

// Fold one journal record into the running fold state. Every record maps to
// exactly one history entry, so folding the whole journal reproduces the
// persisted snapshot (same currentState, same history, same context) - the
// fold is the snapshot's derivation, not an approximation of it.
//
// Context rule (mirrors the machine exactly): `reset` persists a fresh empty
// context, every other state-changing command loads the snapshot, merges the
// YAML context defaults under it (`withContextDefaults`) and then saves, so the
// fold merges the defaults after each non-reset event. That is what makes
// `replay` reproduce a snapshot byte-for-byte instead of approximately.
function applyJournalRecord(state, record, workflow) {
  const event = record.event
  if (event === 'reset') {
    // resetState() builds a brand-new snapshot, so the fold REPLACES the
    // history and the context rather than appending to them.
    state.currentState = record.to
    state.history = [{ state: record.to, enteredAt: record.ts, event: null }]
    state.context = applyContextDelta({}, record.contextDelta)
    return
  }
  if (event === 'fork') {
    // A fork is a NEW thread: its history starts at the branch point, while
    // currentState and context come verbatim from the replayed parent state at
    // that seq with the `--set` overrides folded in - exactly what the fork
    // wrote, so no defaults merge is applied here (same rule as `reset`).
    state.currentState = record.to
    state.history.push({ state: record.to, enteredAt: record.ts, event: 'fork' })
    state.context = applyContextDelta({}, record.contextDelta)
    return
  }
  if (record.status === 'rejected-by-guard') {
    state.currentState = record.from
    state.history.push({
      state: record.from,
      enteredAt: record.ts,
      event: 'rejected-by-guard',
      rejectedEvent: event,
      guard: record.guard,
      legalEvents: record.legalEvents || []
    })
  } else {
    state.currentState = record.to
    state.history.push({ state: record.to, enteredAt: record.ts, event: event })
  }
  state.context = mergeContext(workflow.context || {}, applyContextDelta(state.context, record.contextDelta))
}

// Re-fold the journal into a state object.
//
// `from`/`to` bound the folded window (`--from <seq>` / `--to <seq>`); by
// default the whole journal is folded, which is the only fold that must
// reproduce the persisted snapshot exactly.
//
// Replay stability: guard decisions are recorded in the journal, and the fold
// RE-EVALUATES each recorded guard against the context that was in effect when
// the decision was made (the fold state just before the record applies - the
// machine evaluates guards on load, before any loop counter moves). A mismatch
// with the recorded guardResult is reported as `divergence`. Verification is
// only meaningful when the fold starts at the journal head, so a windowed fold
// (`--from > 1`) reports it as skipped rather than guessing.
function foldJournal(records, options) {
  const workflow = options.workflow
  const from = options.from === undefined ? null : options.from
  const to = options.to === undefined ? null : options.to
  const verifyGuards = from === null || from <= 1
  // The thread identity comes from the journal, not from the workflow YAML: a
  // fork's journal holds the fork's own name while its definition comes from
  // the parent workflow.
  const state = {
    workflow: options.name || (records.length > 0 ? records[0].workflow : workflow.name),
    version: workflow.version,
    currentState: null,
    history: [],
    context: {}
  }
  const divergences = []
  const guardChecks = []
  let folded = 0

  for (const record of records) {
    if (from !== null && Number(record.seq) < from) continue
    if (to !== null && Number(record.seq) > to) continue
    folded += 1
    if (verifyGuards && typeof record.guard === 'string' && record.guard.trim() !== '') {
      const decisionContext = effectiveContext(workflow, state)
      const reevaluated = evaluateGuard(record.guard, decisionContext)
      const recorded = record.guardResult === undefined ? null : Boolean(record.guardResult)
      const match = recorded === null ? null : reevaluated === recorded
      const check = {
        seq: record.seq,
        event: record.event,
        guard: record.guard,
        recordedGuardResult: recorded,
        reevaluatedGuardResult: reevaluated,
        match: match
      }
      guardChecks.push(check)
      if (match === false) {
        divergences.push({
          seq: record.seq,
          event: record.event,
          guard: record.guard,
          recordedGuardResult: recorded,
          reevaluatedGuardResult: reevaluated,
          note: 'guard re-evaluation disagrees with the journal: the workflow definition or the recorded decision changed'
        })
      }
    }
    applyJournalRecord(state, record, workflow)
  }

  return { state, divergences, guardChecks, folded }
}

// The parent workflow of a fork, read from the fork's first journal record, so
// `<forkName> <command>` resolves exactly like any other workflow.
function forkParent(name) {
  const records = readJournal(name)
  if (!records || records.length === 0) return null
  const source = records[0] && records[0].forkedFrom
  if (source && typeof source.workflow === 'string' && source.workflow !== name) {
    return source.workflow
  }
  return null
}

// Structured "no journal - replay unavailable" result. Exit code stays 0: a
// missing journal is a documented capability gap (a legacy run), not an error.
function noJournalResult(name, note) {
  return {
    ok: false,
    reason: 'no-journal',
    workflow: name,
    journalPath: journalPath(name),
    note: note
  }
}

// `--set key=value` value parsing: quoted strings, booleans, null, numbers,
// otherwise the raw string. Dotted keys (`review.specFindings=0`) set a nested
// path; the reserved key `currentState` moves the fork instead of the context.
function parseSetValue(raw) {
  const trimmed = raw.trim()
  if (trimmed.length >= 2 &&
      ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
       (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1)
  }
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  const num = Number(trimmed)
  if (trimmed !== '' && !Number.isNaN(num)) return num
  return trimmed
}

function setContextPath(context, key, value) {
  const parts = key.split('.')
  let cursor = context
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
      cursor[part] = {}
    }
    cursor = cursor[part]
  }
  cursor[parts[parts.length - 1]] = value
}

// The next unused fork name: <workflow>-fork-<n>, or an explicit --name that is
// already taken (an error rather than an overwrite).
function resolveForkName(workflowName, requested) {
  if (requested) {
    if (existsSync(join(stateDir(), requested + '.json')) || existsSync(journalPath(requested))) {
      return { error: 'Fork name already in use: ' + requested }
    }
    return { name: requested }
  }
  let n = 1
  while (existsSync(join(stateDir(), workflowName + '-fork-' + n + '.json')) ||
         existsSync(journalPath(workflowName + '-fork-' + n))) {
    n += 1
  }
  return { name: workflowName + '-fork-' + n }
}

// `fork <workflow> --to <seq> [--set key=value ...] [--name <forkName>]`.
// Replays the parent journal to <seq>, applies the overrides, and writes a NEW
// thread. The parent snapshot and the parent journal are never touched.
function forkWorkflow(workflow, workflowName, rest) {
  let to = null
  const sets = []
  let requestedName = null
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (arg === '--to') {
      to = Number(rest[i + 1])
      i += 1
    } else if (arg === '--set') {
      sets.push(rest[i + 1])
      i += 1
    } else if (arg === '--name') {
      requestedName = rest[i + 1]
      i += 1
    } else {
      return { ok: false, reason: 'usage', error: 'Unknown fork option: ' + arg, exitCode: 1 }
    }
  }

  if (to === null || !Number.isInteger(to) || to < 1) {
    return {
      ok: false,
      reason: 'usage',
      error: 'Usage: fork <workflow> --to <seq> [--set key=value ...] [--name <forkName>]',
      exitCode: 1
    }
  }
  for (const pair of sets) {
    if (typeof pair !== 'string' || pair.indexOf('=') === -1) {
      return { ok: false, reason: 'usage', error: 'Malformed --set (expected key=value): ' + pair, exitCode: 1 }
    }
  }

  const records = readJournal(workflowName)
  if (records === null || records.length === 0) {
    return { ...noJournalResult(workflowName, 'fork needs a journal to branch from'), exitCode: 1 }
  }
  if (!records.some((record) => Number(record.seq) === to)) {
    return {
      ok: false,
      reason: 'unknown-seq',
      workflow: workflowName,
      error: 'No journal event with seq ' + to,
      availableSeqs: records.map((record) => record.seq),
      exitCode: 1
    }
  }

  const fold = foldJournal(records, { workflow, to })
  if (fold.divergences.length > 0) {
    return { ok: false, reason: 'divergence', workflow: workflowName, divergences: fold.divergences, exitCode: 3 }
  }
  if (fold.folded === 0) {
    return { ok: false, reason: 'unknown-seq', workflow: workflowName, error: 'No journal event with seq ' + to, exitCode: 1 }
  }

  const naming = resolveForkName(workflowName, requestedName)
  if (naming.error) {
    return { ok: false, reason: 'fork-name-in-use', workflow: workflowName, error: naming.error, exitCode: 1 }
  }
  const forkName = naming.name

  const state = fold.state
  state.workflow = forkName
  const overrides = {}
  for (const pair of sets) {
    const idx = pair.indexOf('=')
    const key = pair.slice(0, idx).trim()
    const value = parseSetValue(pair.slice(idx + 1))
    overrides[key] = value
    if (key === 'currentState') {
      state.currentState = value
    } else {
      state.context = state.context || {}
      setContextPath(state.context, key, value)
    }
  }
  // One timestamp for the snapshot and the journal record, so a fold of the
  // fork journal reproduces the fork snapshot exactly.
  const ts = now()
  state.history = [{ state: state.currentState, enteredAt: ts, event: 'fork' }]

  ensureStateDir()
  saveState(state)
  appendJournalEvent({
    state,
    ts,
    event: 'fork',
    from: fold.state.currentState,
    to: state.currentState,
    contextDelta: state.context,
    status: 'applied',
    forkedFrom: { workflow: workflowName, seq: to, name: forkName }
  })

  return {
    ok: true,
    mode: 'fork',
    workflow: workflowName,
    fork: {
      name: forkName,
      forkedFrom: { workflow: workflowName, seq: to, name: forkName },
      overrides: Object.keys(overrides).length > 0 ? overrides : null,
      statePath: join(stateDir(), forkName + '.json'),
      journalPath: journalPath(forkName),
      parentStatePath: join(stateDir(), workflowName + '.json'),
      parentUnmodified: true,
      state: state
    }
  }
}

// Events legal from the current state after guard evaluation. An event with no
// declared guard is always legal (backward compatible). Blocked events are
// reported with their guard expression so the caller can re-offer the legal
// move set with reasons.
function computeLegalEvents(workflow, state) {
  const current = getCurrentState(workflow, state)
  const transitions = getAvailableTransitions(workflow, current)
  const guards = (workflow.states[current] && workflow.states[current].guards) || {}
  const context = effectiveContext(workflow, state)
  const legalEvents = []
  const blockedEvents = []
  for (const [event, target] of Object.entries(transitions)) {
    const guard = guards[event]
    if (guard === undefined || evaluateGuard(guard, context)) {
      legalEvents.push(event)
    } else {
      blockedEvents.push({ event, target, guard })
    }
  }
  return { legalEvents, blockedEvents }
}

function loadState(name) {
  const path = join(stateDir(), name + '.json')
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function saveState(state) {
  writeFileSync(join(stateDir(), state.workflow + '.json'), JSON.stringify(state, null, 2))
}

function now() {
  return new Date().toISOString()
}

function getCurrentState(workflow, state) {
  if (!state || !state.history || state.history.length === 0) {
    return workflow.entryPoint
  }
  return state.currentState
}

function getAvailableTransitions(workflow, stateName) {
  const stateDef = workflow.states[stateName]
  if (!stateDef) return {}
  return stateDef.transitions || {}
}

function formatState(state, workflow, json) {
  const current = getCurrentState(workflow, state)
  const transitions = getAvailableTransitions(workflow, current)
  const stateDef = workflow.states[current] || {}
  const result = {
    workflow: workflow.name,
    version: workflow.version,
    currentState: current,
    stateType: stateDef.type || null,
    description: stateDef.description || null,
    availableTransitions: Object.keys(transitions),
    transitionMap: transitions,
    maxIterations: stateDef.maxIterations || null,
    context: state?.context || {}
  }
  if (json) {
    return JSON.stringify(result, null, 2)
  }
  let out = 'Workflow: ' + workflow.name + ' (v' + workflow.version + ')\n'
  out += 'Current State: ' + current + ' (' + (stateDef.type || 'unknown') + ')\n'
  out += 'Description: ' + (stateDef.description || 'N/A') + '\n'
  if (stateDef.maxIterations) {
    out += 'Max Iterations: ' + stateDef.maxIterations + '\n'
    const loopIterations = (state?.context?.loopIterations) || 0
    out += 'Current Iterations: ' + loopIterations + '\n'
  }
  out += '\nAvailable Transitions:\n'
  for (const [event, target] of Object.entries(transitions)) {
    out += '  ' + event + ' => ' + target + '\n'
  }
  if (Object.keys(state?.context || {}).length > 0) {
    out += '\nContext:\n'
    for (const [k, v] of Object.entries(state.context)) {
      out += '  ' + k + ': ' + v + '\n'
    }
  }
  return out
}

function formatHistory(state, workflow, json) {
  if (json) {
    return JSON.stringify(state.history || [], null, 2)
  }
  let out = 'Workflow: ' + workflow.name + '\n'
  out += 'Version: ' + workflow.version + '\n'
  out += 'History:\n'
  for (const entry of (state.history || [])) {
    const eventStr = entry.event ? ' [' + entry.event + ']' : ''
    out += '  ' + entry.state + ' at ' + entry.enteredAt + eventStr + '\n'
  }
  return out
}

function ensureStateDir() {
  mkdirSync(stateDir(), { recursive: true })
}

function transitionState(workflow, state, event) {
  const current = getCurrentState(workflow, state)
  const stateDef = workflow.states[current]
  if (!stateDef) {
    return { error: 'Unknown state: ' + current, exitCode: 1 }
  }

  const transitions = stateDef.transitions || {}
  const target = transitions[event]
  if (!target) {
    return { error: 'Invalid event \'' + event + '\' for state \'' + current + '\'. Available: ' + Object.keys(transitions).join(', '), exitCode: 1 }
  }

  const contextBefore = state.context ? { ...state.context } : {}

  // Guard gate (Stately/XState: the machine defines what the agent can do;
  // the model only ever picks a legal event). The guard is evaluated against
  // the persisted context and rejects the event BEFORE any loop counter or
  // escalation runs, so a blocked re-entry surfaces as rejected-by-guard with
  // the remaining legal move set instead of an opaque counter surprise.
  // Guards are pure: same state + same context => same decision.
  const guard = (stateDef.guards || {})[event]
  if (guard !== undefined && !evaluateGuard(guard, effectiveContext(workflow, state))) {
    const { legalEvents } = computeLegalEvents(workflow, state)
    const ts = now()
    state.history.push({
      state: current,
      enteredAt: ts,
      event: 'rejected-by-guard',
      rejectedEvent: event,
      guard: guard,
      legalEvents: legalEvents
    })
    saveState(state)
    // Pending-writes semantics: the rejection is journaled (guardResult false)
    // but changes nothing, so the successful siblings already folded into the
    // snapshot stay valid.
    appendJournalEvent({
      state,
      ts,
      event,
      from: current,
      to: current,
      contextDelta: contextDeltaOf(contextBefore, state.context),
      guard,
      guardResult: false,
      legalEvents,
      status: 'rejected-by-guard'
    })
    return {
      ok: false,
      reason: 'rejected-by-guard',
      event: event,
      guard: guard,
      legalEvents: legalEvents,
      state: state,
      exitCode: 2
    }
  }

  if (stateDef.loop) {
    const iterations = (state?.context?.loopIterations || 0) + 1
    state.context = state.context || {}
    state.context.loopIterations = iterations
  }

  if (stateDef.maxIterations) {
    const iterations = (state?.context?.loopIterations || 0)
    if (iterations >= stateDef.maxIterations) {
      state.currentState = 'escalate'
      const ts = now()
      state.history.push({
        state: 'escalate',
        enteredAt: ts,
        event: event
      })
      saveState(state)
      appendJournalEvent({
        state,
        ts,
        event,
        from: current,
        to: 'escalate',
        contextDelta: contextDeltaOf(contextBefore, state.context),
        ...(guard !== undefined ? { guard, guardResult: true } : {}),
        status: 'escalated'
      })
      return { error: 'Max iterations (' + stateDef.maxIterations + ') exceeded for state \'' + current + '\'. Escalated.', exitCode: 1, state }
    }
  }

  state.currentState = target
  const ts = now()
  state.history.push({
    state: target,
    enteredAt: ts,
    event: event
  })
  saveState(state)
  appendJournalEvent({
    state,
    ts,
    event,
    from: current,
    to: target,
    contextDelta: contextDeltaOf(contextBefore, state.context),
    ...(guard !== undefined ? { guard, guardResult: true } : {}),
    status: 'applied'
  })
  return { state, exitCode: 0 }
}

function resetState(workflow) {
  ensureStateDir()
  const previous = loadState(workflow.name)
  const ts = now()
  const state = {
    workflow: workflow.name,
    version: workflow.version,
    currentState: workflow.entryPoint,
    history: [
      {
        state: workflow.entryPoint,
        enteredAt: ts,
        event: null
      }
    ],
    context: {}
  }
  saveState(state)
  appendJournalEvent({
    state,
    ts,
    event: 'reset',
    from: previous ? previous.currentState : null,
    to: workflow.entryPoint,
    status: 'applied'
  })
  return state
}

// Seed missing context keys from the YAML defaults so guards evaluate against a
// complete, replay-stable context even for snapshots written before the
// workflow declared defaults. Called on load; the merge is idempotent.
function withContextDefaults(workflow, state) {
  if (!state) return state
  state.context = effectiveContext(workflow, state)
  return state
}

function main() {
  ensureStateDir()
  const args = process.argv.slice(2)
  const jsonIndex = args.indexOf('--json')
  const json = jsonIndex !== -1
  if (json) args.splice(jsonIndex, 1)

  if (args.length < 2) {
    console.error('Usage: workflow-state-machine.mjs <workflow-name> <command> [args]')
    process.exit(1)
  }

  // Commands are canonically `<workflow> <command>` (unchanged); the swapped
  // form `<command> <workflow>` is also accepted for convenience.
  const COMMANDS = ['current', 'legal-events', 'transition', 'reset', 'history', 'replay', 'fork']
  let workflowName = args[0]
  let command = args[1]
  let rest = args.slice(2)
  if (COMMANDS.includes(workflowName) && !COMMANDS.includes(command)) {
    const swapped = workflowName
    workflowName = command
    command = swapped
  }
  let workflow, state

  try {
    workflow = loadWorkflow(workflowName)
  } catch {
    console.error('Workflow not found: ' + workflowName)
    process.exit(1)
  }

  state = loadState(workflowName)
  state = withContextDefaults(workflow, state)

  switch (command) {
    case 'current':
      if (!state) {
        console.error('No state found for workflow: ' + workflowName + '. Run reset first.')
        process.exit(1)
      }
      console.log(formatState(state, workflow, json))
      break
    case 'legal-events': {
      // Events legal from the current state after guard evaluation. Works
      // with or without a persisted snapshot (entry point + YAML defaults).
      const { legalEvents, blockedEvents } = computeLegalEvents(workflow, state)
      if (json) {
        console.log(JSON.stringify({
          workflow: workflow.name,
          currentState: getCurrentState(workflow, state),
          legalEvents: legalEvents,
          blockedEvents: blockedEvents
        }, null, 2))
      } else {
        console.log('Workflow: ' + workflow.name + ' (v' + workflow.version + ')')
        console.log('Current State: ' + getCurrentState(workflow, state))
        console.log('Legal events (after guards):')
        if (legalEvents.length === 0) {
          console.log('  (none)')
        } else {
          const transitions = getAvailableTransitions(workflow, getCurrentState(workflow, state))
          for (const event of legalEvents) {
            console.log('  ' + event + ' => ' + (transitions[event] || '?'))
          }
        }
        if (blockedEvents.length > 0) {
          console.log('Blocked by guards:')
          for (const blocked of blockedEvents) {
            console.log('  ' + blocked.event + ' => ' + blocked.target + ' [guard: ' + blocked.guard + ']')
          }
        }
      }
      break
    }
    case 'transition':
      if (!state) {
        console.error('No state found for workflow: ' + workflowName + '. Run reset first.')
        process.exit(1)
      }
      if (rest.length === 0) {
        console.error('Usage: transition <event>')
        process.exit(1)
      }
      const event = rest[0]
      const result = transitionState(workflow, state, event)
      if (result.reason === 'rejected-by-guard') {
        // Structured rejection (Stately: re-offer the legal move set). The
        // rejection is already recorded in the persisted state history.
        if (json) {
          console.log(JSON.stringify({
            ok: false,
            reason: 'rejected-by-guard',
            event: result.event,
            legalEvents: result.legalEvents,
            guard: result.guard
          }, null, 2))
        } else {
          console.error('Rejected by guard: ' + event + ' blocked by [' + result.guard + '] in state ' + state.currentState + '.')
          console.error('Legal events: ' + (result.legalEvents.join(', ') || 'none'))
        }
        process.exit(2)
      }
      if (result.error) {
        console.error(result.error)
        process.exit(result.exitCode)
      }
      state = result.state
      const newTransitions = getAvailableTransitions(workflow, state.currentState)
      if (json) {
        const out = {
          previous: state.history[state.history.length - 2]?.state || null,
          current: state.currentState,
          event: event,
          availableTransitions: Object.keys(newTransitions),
          legalEvents: computeLegalEvents(workflow, state).legalEvents
        }
        console.log(JSON.stringify(out, null, 2))
      } else {
        console.log('Transitioned to: ' + state.currentState)
        console.log('Available transitions: ' + (Object.keys(newTransitions).join(', ') || 'none (terminal)'))
      }
      break
    case 'reset':
      state = resetState(workflow)
      if (json) {
        console.log(JSON.stringify(state, null, 2))
      } else {
        console.log('Reset ' + workflowName + ' to ' + workflow.entryPoint)
      }
      break
    case 'history':
      if (!state) {
        console.error('No state found for workflow: ' + workflowName + '. Run reset first.')
        process.exit(1)
      }
      console.log(formatHistory(state, workflow, json))
      break
    case 'replay': {
      // Time travel: re-fold the journal into a state object and print it.
      // Folding the whole journal must reproduce the persisted snapshot
      // exactly (`verification.matchesPersistedSnapshot`). A missing journal is
      // a documented capability gap, not a crash: exit 0 with a structured
      // result and a note. `replay` always emits a single JSON object - the
      // folded state IS the payload - so `--json` is accepted for uniformity.
      let to = null
      let from = null
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '--to') {
          to = Number(rest[i + 1])
          i += 1
        } else if (rest[i] === '--from') {
          from = Number(rest[i + 1])
          i += 1
        } else {
          console.error('Unknown replay option: ' + rest[i])
          process.exit(1)
        }
      }
      for (const [flag, value] of [['--to', to], ['--from', from]]) {
        if (value !== null && (!Number.isInteger(value) || value < 1)) {
          console.error('Usage: replay <workflow> [--from <seq>] [--to <seq>] (' + flag + ' expects a positive integer)')
          process.exit(1)
        }
      }
      if (to !== null && from !== null && from > to) {
        console.error('Usage: replay <workflow> [--from <seq>] [--to <seq>] (--from must not exceed --to)')
        process.exit(1)
      }

      const records = readJournal(workflowName)
      if (records === null) {
        console.log(JSON.stringify(noJournalResult(workflowName,
          'No journal at ' + journalPath(workflowName) + '. This run predates the checkpoint journal (legacy run): the snapshot in ' + join(stateDir(), workflowName + '.json') + ' is still authoritative, but time travel is unavailable until the next state-changing command appends a record.'), null, 2))
        break
      }
      if (records.length === 0) {
        console.log(JSON.stringify(noJournalResult(workflowName,
          'Journal at ' + journalPath(workflowName) + ' exists but contains no events, so there is nothing to fold.'), null, 2))
        break
      }

      const fold = foldJournal(records, { workflow, from, to })
      const snapshot = loadState(workflowName)
      const fullFold = fold.folded === records.length
      const result = {
        ok: fold.divergences.length === 0,
        ...(fold.divergences.length > 0 ? { reason: 'divergence', divergences: fold.divergences } : {}),
        mode: 'replay',
        workflow: workflowName,
        journalPath: journalPath(workflowName),
        window: { from: from === null ? 1 : from, to: to === null ? records[records.length - 1].seq : to },
        eventsFolded: fold.folded,
        state: fold.state,
        verification: {
          fullFold: fullFold,
          matchesPersistedSnapshot: fullFold && snapshot ? JSON.stringify(fold.state) === JSON.stringify(snapshot) : null,
          persistedSnapshotPath: join(stateDir(), workflowName + '.json'),
          guardChecks: fold.guardChecks,
          guardVerificationSkipped: from !== null && from > 1
            ? 'windowed fold (--from > 1): guard verification needs the fold to start at the journal head'
            : null,
          divergences: fold.divergences
        }
      }
      if (fold.divergences.length > 0) {
        // Structured payload on stdout (the `transition` rejection convention),
        // a human summary on stderr, and a dedicated exit code.
        console.log(JSON.stringify(result, null, 2))
        for (const divergence of fold.divergences) {
          console.error('Replay divergence at seq ' + divergence.seq + ' (' + divergence.event + '): guard [' + divergence.guard + '] recorded ' + divergence.recordedGuardResult + ' but re-evaluates to ' + divergence.reevaluatedGuardResult + '.')
        }
        process.exit(3)
      }
      console.log(JSON.stringify(result, null, 2))
      break
    }
    case 'fork': {
      const result = forkWorkflow(workflow, workflowName, rest)
      if (result.exitCode) {
        console.error(JSON.stringify(result, null, 2))
        process.exit(result.exitCode)
      }
      console.log(JSON.stringify(result, null, 2))
      break
    }
    default:
      console.error('Unknown command: ' + command)
      process.exit(1)
  }
}

// Run as a CLI only when executed directly; importing the module (tests)
// exposes the pure helpers below without side effects.
function isDirectRun() {
  try {
    const entry = process.argv[1]
    if (!entry) return false
    return realpathSync(entry) === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
}

if (isDirectRun()) {
  main()
}

export {
  parseYaml,
  loadWorkflow,
  evaluateGuard,
  computeLegalEvents,
  transitionState,
  mergeContext,
  tokenizeGuard,
  readJournal,
  foldJournal,
  applyContextDelta,
  journalPath,
  checkpointsDir
}
