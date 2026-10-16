#!/usr/bin/env node
// idempotency.mjs - intent ledger for skills that mutate external state
//
// Research basis:
// - Temporal: "write intent before executing the effect". The effect
//   sandwich is record claim -> execute -> commit outcome. A retry that
//   finds only a claim (outcome still null) reports outcome-unknown instead
//   of re-running the effect.
// - LangGraph HITL semantics: resume re-executes the whole node from its
//   start, so every side effect before an interrupt must be safe to re-run.
//
// Contract for mutating skills (issue / pull request / merge / label /
// comment writers, see platform/contract-base.xml <idempotency>):
//   1. checkIntent(intentsDir, key) BEFORE anything else.
//        null              -> no prior attempt: proceed to record.
//        "unknown-outcome" -> a prior attempt recorded a claim but never
//                            committed: report "outcome unknown" and DO NOT
//                            re-execute.
//        <outcome>         -> already complete: reuse the recorded outcome.
//   2. recordIntent(intentsDir, key, payload) BEFORE the effect.
//   3. completeIntent(intentsDir, key, outcome) AFTER the effect commits.
//
// Keys are unique per effect (e.g. "merge-pr-108", "label-issue-77-triage");
// the ledger lives at .scratch/intents/<key>.json with the shape
// {key, payload, recordedAt, outcome:null}. Ledger files are scratch data:
// they are the replay-stable record that makes retries safe.
//
// CLI:
//   node idempotency.mjs --demo [--intents-dir <dir>]   narrated effect sandwich
//   node idempotency.mjs --help                         show this help

import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_INTENTS_DIR = '.scratch/intents'
export const UNKNOWN_OUTCOME = 'unknown-outcome'

const HELP = `idempotency.mjs - intent ledger for skills that mutate external state

Usage:
  node idempotency.mjs --demo [--intents-dir <dir>]   run the narrated effect-sandwich demo
  node idempotency.mjs --help                         show this help

Importable API:
  import { recordIntent, completeIntent, checkIntent, runEffectOnce, UNKNOWN_OUTCOME } from './idempotency.mjs'

  checkIntent(dir, key)     -> null (absent) | UNKNOWN_OUTCOME (claim without outcome) | <outcome>
  recordIntent(dir, key, payload)   -> {status, intent}   write the claim BEFORE the effect
  completeIntent(dir, key, outcome) -> {status, intent}   commit the outcome AFTER the effect
  runEffectOnce(dir, key, payload, effect) -> canonical skill-side wrapper:
      checks the ledger first, records before the effect, completes after it

Effect sandwich (Temporal): record claim -> execute -> commit outcome.
A retry finding only a claim reports outcome-unknown; it never re-executes.`

function intentPath(intentsDir, key) {
  return join(intentsDir, key + '.json')
}

export function readIntent(intentsDir, key) {
  try {
    return JSON.parse(readFileSync(intentPath(intentsDir, key), 'utf8'))
  } catch {
    return null
  }
}

// Write the claim before executing the effect. An in-flight claim (outcome
// still null) is never clobbered: re-arming it would hide a crashed attempt,
// which is exactly what unknown-outcome must surface. A completed
// intent is never silently re-armed either; a new execution of the same
// effect must reuse a new key.
export function recordIntent(intentsDir, key, payload) {
  const existing = readIntent(intentsDir, key)
  if (existing && (existing.outcome === null || existing.outcome === undefined)) {
    return { status: 'already-pending', intent: existing }
  }
  if (existing) {
    return { status: 'already-completed', intent: existing }
  }
  mkdirSync(intentsDir, { recursive: true })
  const intent = { key, payload, recordedAt: new Date().toISOString(), outcome: null }
  writeFileSync(intentPath(intentsDir, key), JSON.stringify(intent, null, 2))
  return { status: 'recorded', intent }
}

// Commit the outcome after the effect. First write wins: a second completion
// (parallel retry) keeps the first committed outcome instead of overwriting
// the audit record.
export function completeIntent(intentsDir, key, outcome) {
  const intent = readIntent(intentsDir, key)
  if (!intent) {
    return { status: 'not-found', intent: null }
  }
  if (intent.outcome !== null && intent.outcome !== undefined) {
    return { status: 'already-completed', intent }
  }
  intent.outcome = outcome
  mkdirSync(intentsDir, { recursive: true })
  writeFileSync(intentPath(intentsDir, key), JSON.stringify(intent, null, 2))
  return { status: 'completed', intent }
}

// The ledger query every retry performs first: null when absent, the
// recorded outcome when complete, "unknown-outcome" while a claim is pending.
export function checkIntent(intentsDir, key) {
  const intent = readIntent(intentsDir, key)
  if (!intent) return null
  if (intent.outcome === null || intent.outcome === undefined) return UNKNOWN_OUTCOME
  return intent.outcome
}

// Canonical skill-side wrapper implementing the documented contract:
// check -> record -> execute -> complete. If the effect throws, the claim
// stays pending so the replay reports outcome-unknown rather than re-running
// a possibly half-applied effect.
export function runEffectOnce(intentsDir, key, payload, effect) {
  const prior = checkIntent(intentsDir, key)
  if (prior === UNKNOWN_OUTCOME) {
    return { executed: false, reason: UNKNOWN_OUTCOME }
  }
  if (prior !== null) {
    return { executed: false, reason: 'already-completed', outcome: prior }
  }
  recordIntent(intentsDir, key, payload)
  const outcome = effect()
  completeIntent(intentsDir, key, outcome)
  return { executed: true, outcome }
}

function countEffectExecutions(effectLog) {
  if (!existsSync(effectLog)) return 0
  return readFileSync(effectLog, 'utf8').split('\n').filter((line) => line.trim() !== '').length
}

function demoCrashChild(intentsDir) {
  // Attempt 1: record the claim, execute the effect, then die before the
  // outcome is committed. The effect may or may not have completed
  // server-side; that is precisely why the replay cannot re-run it.
  const key = 'demo-merge-pr-42'
  recordIntent(intentsDir, key, { pr: 42, action: 'merge', attempt: 1 })
  appendFileSync(join(intentsDir, 'demo-effect.log'), 'effect executed (attempt 1, before crash)\n')
  process.exit(1)
}

function demo() {
  const args = process.argv.slice(2)
  const dirIndex = args.indexOf('--intents-dir')
  const intentsDir = dirIndex !== -1 && args[dirIndex + 1] ? args[dirIndex + 1] : DEFAULT_INTENTS_DIR
  const effectLog = join(intentsDir, 'demo-effect.log')

  console.log('=== Effect sandwich demo (Temporal: record claim -> execute -> commit outcome) ===')

  // Scenario A: a crash between record and complete.
  const crashKey = 'demo-merge-pr-42'
  rmSync(intentPath(intentsDir, crashKey), { force: true })
  rmSync(effectLog, { force: true })

  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--demo-crash', '--intents-dir', intentsDir], { encoding: 'utf8' })
  console.log('attempt 1 (child process): exit ' + child.status + ' - claim recorded, effect executed, crashed before completeIntent')
  const replay = checkIntent(intentsDir, crashKey)
  console.log('replay: checkIntent -> ' + JSON.stringify(replay))
  if (replay === UNKNOWN_OUTCOME) {
    console.log('replay: outcome unknown - reporting "outcome unknown", NOT re-executing the effect')
  }
  console.log('replay: effect executions so far: ' + countEffectExecutions(effectLog) + ' (must stay 1)')

  // Scenario B: a clean sandwich, then a replay that reuses the outcome.
  const labelKey = 'demo-label-pr-42'
  rmSync(intentPath(intentsDir, labelKey), { force: true })
  const first = runEffectOnce(intentsDir, labelKey, { pr: 42, action: 'label', attempt: 1 }, () => {
    appendFileSync(effectLog, 'effect executed (attempt 1, committed)\n')
    return 'labeled'
  })
  console.log('attempt 2: ' + JSON.stringify(first))
  const second = runEffectOnce(intentsDir, labelKey, { pr: 42, action: 'label', attempt: 2 }, () => {
    appendFileSync(effectLog, 'effect executed (attempt 2, must not happen)\n')
    return 'labeled'
  })
  console.log('replay : ' + JSON.stringify(second))
  console.log('replay: effect executions total: ' + countEffectExecutions(effectLog) + ' (must stay 2)')
  console.log('=== demo complete: ledger at ' + intentsDir + ' ===')
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--demo-crash')) {
    const dirIndex = args.indexOf('--intents-dir')
    const intentsDir = dirIndex !== -1 && args[dirIndex + 1] ? args[dirIndex + 1] : DEFAULT_INTENTS_DIR
    demoCrashChild(intentsDir)
    return
  }
  if (args.includes('--help') || args.length === 0) {
    console.log(HELP)
    return
  }
  if (args.includes('--demo')) {
    demo()
    return
  }
  console.error(HELP)
  process.exit(1)
}

const invokedDirectly = (() => {
  try {
    const entry = process.argv[1]
    if (!entry) return false
    return realpathSync(entry) === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
})()

if (invokedDirectly) {
  main()
}
