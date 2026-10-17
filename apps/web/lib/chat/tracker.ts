import { SLOTS, isSlotId, type ChatPhase, type SlotId } from './slots';

export type SlotStatus = 'missing' | 'incomplete' | 'proposed' | 'filled';

export interface SlotEntry {
  state: SlotStatus;
  value?: unknown;
}

export type SlotState = Record<SlotId, SlotEntry>;

export interface SlotUpdate {
  slot: SlotId;
  value: unknown;
  state: 'proposed' | 'incomplete';
}

/** What the user actually did this turn. Only chip/confirm/skip can fill a slot. */
export type UserAction =
  | { kind: 'text' }
  | { kind: 'chip'; slot: SlotId; value?: unknown }
  | { kind: 'confirm'; slot: SlotId }
  | { kind: 'change'; slot: SlotId }
  | { kind: 'skip'; slot: SlotId; value?: unknown };

export function initialSlotState(): SlotState {
  return Object.fromEntries(SLOTS.map((s) => [s.id, { state: 'missing' as const }])) as SlotState;
}

/**
 * Pure transition: (state, model proposals, user action) -> new state.
 * Model updates are downgraded to `proposed`/`incomplete` and never touch a
 * `filled` slot (AC-02, AC-47); the user action is applied after them.
 */
export function applyTurn(
  state: SlotState,
  slotUpdates: readonly SlotUpdate[],
  action: UserAction,
): SlotState {
  const next = { ...state } as SlotState;
  for (const update of slotUpdates) {
    if (!isSlotId(update.slot) || next[update.slot].state === 'filled') continue;
    next[update.slot] = {
      state: update.state === 'incomplete' ? 'incomplete' : 'proposed',
      value: update.value,
    };
  }
  if (action.kind === 'text' || !isSlotId(action.slot)) return next;
  const current = next[action.slot];
  switch (action.kind) {
    case 'chip':
    case 'skip':
      next[action.slot] = { state: 'filled', ...(action.value !== undefined ? { value: action.value } : {}) };
      break;
    case 'confirm':
      if (current.state === 'proposed') next[action.slot] = { state: 'filled', value: current.value };
      break;
    case 'change':
      next[action.slot] = { state: 'missing' };
      break;
  }
  return next;
}

/** Highest-priority missing/incomplete slot; null when the agenda is complete. */
export function pendingSlot(state: SlotState): SlotId | null {
  for (const slot of SLOTS) {
    const status = state[slot.id].state;
    if (status === 'missing' || status === 'incomplete') return slot.id;
  }
  return null;
}

export function currentPhase(state: SlotState): ChatPhase {
  const pending = pendingSlot(state);
  if (!pending) return 'done';
  return SLOTS.find((s) => s.id === pending)!.phase;
}
