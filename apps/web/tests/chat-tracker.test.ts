import { describe, expect, it } from 'vitest';
import { SLOTS, SLOT_IDS, type SlotId } from '../lib/chat/slots';
import { applyTurn, currentPhase, initialSlotState, pendingSlot, type SlotState } from '../lib/chat/tracker';

function withStates(states: Partial<Record<SlotId, SlotState[SlotId]>>): SlotState {
  return { ...initialSlotState(), ...states } as SlotState;
}

function allFilledExcept(...open: SlotId[]): SlotState {
  const state = initialSlotState();
  for (const id of SLOT_IDS) if (!open.includes(id)) state[id] = { state: 'filled' };
  return state;
}

describe('slot agenda', () => {
  it('keeps the spec priority order and phases', () => {
    expect(SLOT_IDS.slice(0, 8)).toEqual([
      'greeting', 'cv_source', 'experiences', 'experience_tasks',
      'experience_duration', 'experiences_more', 'education', 'target_roles',
    ]);
    expect(SLOTS.filter((s) => s.phase === 'preferences').map((s) => s.id)).toEqual([
      'zone', 'modality', 'schedule', 'minimum_salary_usd', 'willing_to_train',
    ]);
  });
});

describe('pendingSlot / currentPhase', () => {
  const cases: Array<[string, SlotState, SlotId | null, string]> = [
    ['empty state asks greeting', initialSlotState(), 'greeting', 'profile'],
    ['skips filled and proposed slots', withStates({ greeting: { state: 'filled' }, cv_source: { state: 'proposed', value: 'no' } }), 'experiences', 'profile'],
    ['incomplete slot is asked before later missing ones', withStates({ greeting: { state: 'filled' }, cv_source: { state: 'filled' }, experiences: { state: 'incomplete' } }), 'experiences', 'profile'],
    ['profile done moves to preferences', allFilledExcept('zone', 'modality', 'schedule', 'minimum_salary_usd', 'willing_to_train'), 'zone', 'preferences'],
    ['everything filled is done', allFilledExcept(), null, 'done'],
  ];
  it.each(cases)('%s', (_name, state, pending, phase) => {
    expect(pendingSlot(state)).toBe(pending);
    expect(currentPhase(state)).toBe(phase);
  });
});

describe('applyTurn', () => {
  it('model updates are only proposed, never filled (AC-02)', () => {
    const next = applyTurn(initialSlotState(), [{ slot: 'zone', value: 'Arraiján', state: 'proposed' }], { kind: 'text' });
    expect(next.zone).toEqual({ state: 'proposed', value: 'Arraiján' });
    expect(pendingSlot(next)).toBe('greeting');
  });

  it('model cannot overwrite a filled slot', () => {
    const state = withStates({ zone: { state: 'filled', value: 'San Miguelito' } });
    const next = applyTurn(state, [{ slot: 'zone', value: 'Otra', state: 'proposed' }], { kind: 'text' });
    expect(next.zone).toEqual({ state: 'filled', value: 'San Miguelito' });
  });

  it('model can mark a slot incomplete', () => {
    const next = applyTurn(initialSlotState(), [{ slot: 'experiences', value: 'tienda', state: 'incomplete' }], { kind: 'text' });
    expect(next.experiences.state).toBe('incomplete');
  });

  it('a chip fills the slot (AC-47)', () => {
    const next = applyTurn(initialSlotState(), [], { kind: 'chip', slot: 'modality', value: 'remote' });
    expect(next.modality).toEqual({ state: 'filled', value: 'remote' });
  });

  it('confirming a proposed slot fills it with the proposed value', () => {
    const state = withStates({ zone: { state: 'proposed', value: 'Arraiján' } });
    expect(applyTurn(state, [], { kind: 'confirm', slot: 'zone' }).zone).toEqual({ state: 'filled', value: 'Arraiján' });
  });

  it('confirming a slot that is not proposed does nothing', () => {
    expect(applyTurn(initialSlotState(), [], { kind: 'confirm', slot: 'zone' }).zone.state).toBe('missing');
  });

  it('change resets a proposed slot to missing', () => {
    const state = withStates({ zone: { state: 'proposed', value: 'x' } });
    expect(applyTurn(state, [], { kind: 'change', slot: 'zone' }).zone).toEqual({ state: 'missing' });
  });

  it('ignores unknown slots from the model', () => {
    const next = applyTurn(initialSlotState(), [{ slot: 'nope' as SlotId, value: 1, state: 'proposed' }], { kind: 'text' });
    expect(Object.keys(next)).toEqual([...SLOT_IDS]);
  });

  it('does not mutate the input state', () => {
    const state = initialSlotState();
    applyTurn(state, [], { kind: 'chip', slot: 'zone', value: 'x' });
    expect(state.zone.state).toBe('missing');
  });
});
