import { redactPii, type ChatFn } from '@puente/agent-runtime';
import type { HandlerResult } from './handler-result';
import { ChatSessionConflictError, chatSessionStore, type ChatSession } from './chat-store';
import { buildMessages, buildSystemPrompt, type CandidateContext } from './chat/prompt';
import { modelOutputJsonSchema, validateChatTurn, validateModelOutput, type ChatTurn } from './chat/schema';
import { SKIP_DEFAULTS, isSlotId, slotDefinition, type SlotId } from './chat/slots';
import {
  applyTurn,
  currentPhase,
  initialSlotState,
  pendingSlot,
  type SlotState,
  type SlotUpdate,
  type UserAction,
} from './chat/tracker';

export const MAX_LLM_TURNS = 40;
export const LLM_TIMEOUT_MS = 20_000;
export const MAX_MESSAGE_LENGTH = 2000;
/** Stored transcript cap; older messages are dropped before each save. */
export const MAX_TRANSCRIPT_MESSAGES = 40;
const MAX_FREE_VALUE_LENGTH = 100;
export const CAP_MESSAGE = 'Sigamos con lo importante para encontrarte vacantes.';
const PROFILE_DONE = '¡Gracias! Estoy leyendo lo que me contaste…';
const PREFERENCES_OPENER = 'Ya sé bastante de ti. Solo me faltan unas cosas para buscarte vacantes.';
const ALL_DONE = '¡Listo! Buscando vacantes para ti…';

export interface ChatHandlerDeps {
  /** Undefined means no API key: every turn uses the deterministic fallback. */
  chat?: ChatFn;
  store?: AsyncChatStore;
  context?: CandidateContext;
  timeoutMs?: number;
  log?: (entry: Record<string, unknown>) => void;
  now?: () => number;
}

export interface AsyncChatStore {
  get(candidateId: string): ChatSession | undefined | Promise<ChatSession | undefined>;
  save(candidateId: string, session: ChatSession): void | Promise<void>;
}

function seededSlotState(context?: CandidateContext): SlotState {
  const state = initialSlotState();
  const profile = context?.profile && typeof context.profile === 'object' ? (context.profile as Record<string, unknown>) : undefined;
  const preferences = context?.preferences && typeof context.preferences === 'object' ? (context.preferences as Record<string, unknown>) : undefined;
  const targetRoles = profile?.target_roles;
  if (Array.isArray(targetRoles) && typeof targetRoles[0] === 'string' && targetRoles[0].trim()) {
    state.target_roles = { state: 'filled', value: targetRoles[0] };
  }

  const location = preferences?.max_location;
  if (location && typeof location === 'object') {
    const locationRecord = location as Record<string, unknown>;
    const value = locationRecord.raw ?? locationRecord.district ?? locationRecord.province;
    if (typeof value === 'string' && value.trim()) state.zone = { state: 'filled', value };
  }
  if (preferences?.modality !== undefined && isAllowedSlotValue('modality', preferences.modality)) state.modality = { state: 'filled', value: preferences.modality };
  if (preferences?.minimum_salary_usd !== undefined && isAllowedSlotValue('minimum_salary_usd', preferences.minimum_salary_usd)) state.minimum_salary_usd = { state: 'filled', value: preferences.minimum_salary_usd };
  if (preferences?.willing_to_train !== undefined && isAllowedSlotValue('willing_to_train', preferences.willing_to_train)) state.willing_to_train = { state: 'filled', value: preferences.willing_to_train };
  return state;
}

function freshSession(context?: CandidateContext): ChatSession {
  return { transcript: [], slotState: seededSlotState(context), llmTurns: 0, capNoticeSent: false, version: 0 };
}

/**
 * Values a client may persist for a slot. Enumerated slots (some chip defines a
 * value) accept only those values; free-value slots accept a bounded primitive.
 */
export function isAllowedSlotValue(slot: SlotId, value: unknown): boolean {
  if (value === undefined) return true;
  const chipValues = slotDefinition(slot).chips.filter((c) => c.value !== undefined).map((c) => c.value);
  if (chipValues.length > 0) return chipValues.includes(value);
  if (typeof value === 'string') return value.trim().length > 0 && value.length <= MAX_FREE_VALUE_LENGTH;
  return (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean';
}

function parseAction(raw: unknown): UserAction | undefined {
  if (raw === undefined || raw === null) return { kind: 'text' };
  if (typeof raw !== 'object') return undefined;
  const a = raw as Record<string, unknown>;
  if (a.kind === 'text') return { kind: 'text' };
  if (!isSlotId(a.slot)) return undefined;
  if (a.kind === 'chip') return isAllowedSlotValue(a.slot, a.value) ? { kind: 'chip', slot: a.slot, value: a.value } : undefined;
  if (a.kind === 'confirm') return { kind: 'confirm', slot: a.slot };
  if (a.kind === 'change') return { kind: 'change', slot: a.slot };
  if (a.kind === 'skip') {
    if (!isAllowedSlotValue(a.slot, a.value)) return undefined;
    return { kind: 'skip', slot: a.slot, value: a.value !== undefined ? a.value : SKIP_DEFAULTS[a.slot] };
  }
  return undefined;
}

interface ModelOutput {
  intent: 'ask_slot' | 'answer' | 'confirm';
  reply: string;
  slotUpdates: SlotUpdate[];
}

interface LlmOutcome {
  output?: ModelOutput;
  usage?: { promptTokens: number; completionTokens: number };
  attempts: number;
  error?: string;
}

async function callModel(
  chat: ChatFn,
  messages: ReturnType<typeof buildMessages>,
  timeoutMs: number,
): Promise<LlmOutcome> {
  let error: string | undefined;
  let usage: LlmOutcome['usage'];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    // One AbortController per attempt: the timeout aborts the HTTP request, not just the wait.
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('chat_timeout'));
      }, timeoutMs);
    });
    try {
      const result = await Promise.race([
        chat({
          messages,
          jsonSchema: { name: 'chat_turn', schema: modelOutputJsonSchema as unknown as Record<string, unknown> },
          temperature: 0.4,
          maxTokens: 500,
          signal: controller.signal,
        }),
        timeout,
      ]);
      usage = result.usage ?? usage;
      const parsed: unknown = JSON.parse(result.content);
      if (validateModelOutput(parsed)) {
        return { output: parsed as ModelOutput, usage, attempts: attempt };
      }
      error = 'invalid_output';
    } catch (cause) {
      // Timeout is terminal: no retry, so a slow model cannot double the wait.
      if (controller.signal.aborted) return { usage, attempts: attempt, error: 'chat_timeout' };
      error = cause instanceof Error ? cause.message : 'chat_failed';
    } finally {
      clearTimeout(timer);
    }
  }
  return { usage, attempts: 2, error };
}

function fallbackReply(
  phaseChanged: boolean,
  phase: ChatTurn['phase'],
  pending: SlotId | null,
  freeTextQuestion = false,
): string {
  if (phase === 'done') return ALL_DONE;
  const question = pending ? slotDefinition(pending).question : '';
  if (phaseChanged) return `${PROFILE_DONE} ${PREFERENCES_OPENER} ${question}`.trim();
  if (freeTextQuestion) return `Ahora mismo solo puedo ayudarte a completar tu perfil. ¿Seguimos? ${question}`.trim();
  return question;
}

/**
 * One chat turn: apply the user's action, ask the model (retry once), and fall
 * back to the slot's deterministic question on any failure, timeout, missing
 * key, or after the per-session turn cap. The tracker, never the model, owns
 * pendingSlot and phase.
 */
export async function handleChatTurn(
  candidateId: string,
  payload: unknown,
  deps: ChatHandlerDeps = {},
): Promise<HandlerResult> {
  const body = (payload ?? {}) as Record<string, unknown>;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const action = parseAction(body.action);
  if (!message || message.length > MAX_MESSAGE_LENGTH || !action) {
    return { status: 400, body: { error: 'invalid_chat_request' } };
  }

  const store = deps.store ?? chatSessionStore;
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((entry) => console.info(JSON.stringify(entry)));
  const started = now();

  let session: ChatSession;
  try {
    session = (await store.get(candidateId)) ?? freshSession(deps.context);
  } catch {
    return { status: 503, body: { error: 'persistence_unavailable' } };
  }

  const previousState = session.slotState;
  const previousPhase = currentPhase(previousState);
  session.transcript.push({ role: 'user', content: redactPii(message).text });
  const afterAction = applyTurn(session.slotState, [], action);
  const pending = pendingSlot(afterAction);
  const phase = currentPhase(afterAction);
  const phaseChanged = phase !== previousPhase;
  const capped = session.llmTurns >= MAX_LLM_TURNS;

  let turn: ChatTurn | undefined;
  let outcome: LlmOutcome | undefined;
  let source: ChatTurn['source'] = 'fallback';
  let updates: SlotUpdate[] = [];

  if (deps.chat && !capped) {
    session.llmTurns += 1;
    const system = buildSystemPrompt({ pending, state: afterAction, context: deps.context });
    const redacted = session.transcript.map((m) => ({ ...m, content: redactPii(m.content).text }));
    outcome = await callModel(deps.chat, buildMessages(system, redacted), deps.timeoutMs ?? LLM_TIMEOUT_MS);
    if (outcome.output) {
      updates = outcome.output.slotUpdates.filter((u) => afterAction[u.slot]?.state !== 'filled');
      const proposed = updates.find((update) => update.state === 'proposed');
      const candidate: ChatTurn = {
        intent: phaseChanged || phase === 'done' ? 'complete_phase' : outcome.output.intent,
        reply: outcome.output.reply.trim(),
        pendingSlot: pending,
        slotUpdates: updates,
        chips: proposed
          ? [
              { label: 'Sí', value: proposed.value, kind: 'confirm' },
              { label: 'Cambiar', kind: 'change' },
            ]
          : pending
            ? slotDefinition(pending).chips
            : [],
        phase,
        source: 'llm',
      };
      if (validateChatTurn(candidate)) {
        turn = candidate;
        source = 'llm';
      } else {
        updates = [];
        outcome.error = 'invalid_turn';
      }
    }
  }

  if (!turn) {
    let reply = fallbackReply(phaseChanged, phase, pending, !deps.chat && action.kind === 'text' && message.includes('?'));
    if (capped && !session.capNoticeSent) {
      reply = CAP_MESSAGE;
      session.capNoticeSent = true;
    }
    turn = {
      intent: phaseChanged || phase === 'done' ? 'complete_phase' : 'ask_slot',
      reply,
      pendingSlot: pending,
      slotUpdates: [],
      chips: pending ? slotDefinition(pending).chips : [],
      phase,
      source: 'fallback',
    };
  }

  const nextState = applyTurn(afterAction, updates, { kind: 'text' });
  session.slotState = nextState;
  session.transcript.push({ role: 'assistant', content: turn.reply });
  session.transcript = session.transcript.slice(-MAX_TRANSCRIPT_MESSAGES);

  try {
    await store.save(candidateId, session);
  } catch (cause) {
    // Another turn saved first (optimistic lock on version): the client must re-sync.
    if (cause instanceof ChatSessionConflictError) return { status: 409, body: { error: 'chat_conflict' } };
    return { status: 503, body: { error: 'persistence_unavailable' } };
  }

  // Server-side only (NG4): never returned to the client beyond `source`.
  log({
    event: 'chat_turn',
    candidateId,
    source,
    reason: capped ? 'turn_cap' : !deps.chat ? 'no_api_key' : outcome?.error,
    attempts: outcome?.attempts ?? 0,
    latencyMs: now() - started,
    tokens: outcome?.usage,
    llmTurns: session.llmTurns,
    pendingSlot: turn.pendingSlot,
    slotTransitions: Object.entries(nextState)
      .filter(([slot, entry]) => entry.state !== previousState[slot as SlotId].state)
      .map(([slot, entry]) => `${slot}:${entry.state}`),
    phase: turn.phase,
  });
  return { status: 200, body: turn };
}

export async function readChatSessionView(
  candidateId: string,
  deps: Pick<ChatHandlerDeps, 'store' | 'context'> = {},
): Promise<HandlerResult> {
  try {
    const session = await (deps.store ?? chatSessionStore).get(candidateId);
    const view = session ?? freshSession(deps.context);
    return {
      status: 200,
      body: { transcript: view.transcript, slotState: view.slotState, pendingSlot: pendingSlot(view.slotState), phase: currentPhase(view.slotState) },
    };
  } catch {
    return { status: 503, body: { error: 'persistence_unavailable' } };
  }
}
