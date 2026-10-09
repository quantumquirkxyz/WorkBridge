import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKFLOWS_DIR = join(__dirname, 'workflows')
const STATE_DIR = join(__dirname, 'state')

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
  const text = readFileSync(path, 'utf-8')
  return parseYaml(text)
}

function loadState(name) {
  const path = join(STATE_DIR, name + '.json')
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

function saveState(state) {
  writeFileSync(join(STATE_DIR, state.workflow + '.json'), JSON.stringify(state, null, 2))
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
  mkdirSync(STATE_DIR, { recursive: true })
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

  if (stateDef.loop) {
    const iterations = (state?.context?.loopIterations || 0) + 1
    state.context = state.context || {}
    state.context.loopIterations = iterations
  }

  if (stateDef.maxIterations) {
    const iterations = (state?.context?.loopIterations || 0)
    if (iterations >= stateDef.maxIterations) {
      state.currentState = 'escalate'
      state.history.push({
        state: 'escalate',
        enteredAt: now(),
        event: event
      })
      saveState(state)
      return { error: 'Max iterations (' + stateDef.maxIterations + ') exceeded for state \'' + current + '\'. Escalated.', exitCode: 1, state }
    }
  }

  state.currentState = target
  state.history.push({
    state: target,
    enteredAt: now(),
    event: event
  })
  saveState(state)
  return { state, exitCode: 0 }
}

function resetState(workflow) {
  ensureStateDir()
  const state = {
    workflow: workflow.name,
    version: workflow.version,
    currentState: workflow.entryPoint,
    history: [
      {
        state: workflow.entryPoint,
        enteredAt: now(),
        event: null
      }
    ],
    context: {}
  }
  saveState(state)
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

  const [workflowName, command, ...rest] = args
  let workflow, state

  try {
    workflow = loadWorkflow(workflowName)
  } catch {
    console.error('Workflow not found: ' + workflowName)
    process.exit(1)
  }

  state = loadState(workflowName)

  switch (command) {
    case 'current':
      if (!state) {
        console.error('No state found for workflow: ' + workflowName + '. Run reset first.')
        process.exit(1)
      }
      console.log(formatState(state, workflow, json))
      break
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
          availableTransitions: Object.keys(newTransitions)
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
    default:
      console.error('Unknown command: ' + command)
      process.exit(1)
  }
}

main()
