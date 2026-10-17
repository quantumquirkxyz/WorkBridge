import { describe, expect, it } from 'vitest';
import {
  assertCandidatePreferences,
  createAjv,
  validateCandidatePreferences,
  type CandidatePreferences,
} from '../src/index';

export function validPreferences(overrides: Record<string, unknown> = {}): CandidatePreferences {
  return {
    schema_version: '1.0.0',
    preferences_id: 'pref_1',
    candidate_id: 'candidate_1',
    locale: 'es-PA',
    origin: 'candidate_explicit',
    created_at: '2026-10-16T00:00:00.000Z',
    updated_at: '2026-10-16T00:00:00.000Z',
    target_roles: ['Atención al cliente'],
    modality: 'onsite',
    max_location: { country: 'PA', province: 'Panamá', district: 'Panamá', raw: 'Ciudad de Panamá' },
    max_travel_minutes: 60,
    monthly_transport_budget_usd: 30,
    minimum_salary_usd: 600,
    availability: { days: [1, 2, 3, 4, 5], start_minute: 480, end_minute: 1020, weekly_hours: 40 },
    contract_types: ['full_time'],
    transport_modes: ['transit', 'walking'],
    willing_to_train: true,
    willing_to_intern: false,
    ...overrides,
  } as CandidatePreferences;
}

describe('CandidatePreferences schema', () => {
  it('registers the preferences schema under its canonical $id', () => {
    expect(createAjv().getSchema('https://workbridge.pa/schemas/candidate-preferences/1.0.0')).toBeTruthy();
  });

  it('accepts a fully explicit preferences document', () => {
    expect(validateCandidatePreferences(validPreferences())).toEqual({ valid: true });
    expect(() => assertCandidatePreferences(validPreferences())).not.toThrow();
  });

  it('rejects preferences that were not explicitly captured (origin guard)', () => {
    const result = validateCandidatePreferences(validPreferences({ origin: 'inferred_by_llm' }));
    expect(result.valid).toBe(false);
  });

  it('requires at least one target role and one transport mode', () => {
    expect(validateCandidatePreferences(validPreferences({ target_roles: [] })).valid).toBe(false);
    expect(validateCandidatePreferences(validPreferences({ transport_modes: [] })).valid).toBe(false);
  });

  it('rejects an out-of-range weekday and an unknown modality', () => {
    expect(
      validateCandidatePreferences(
        validPreferences({ availability: { days: [7], start_minute: 0, end_minute: 60, weekly_hours: 1 } }),
      ).valid,
    ).toBe(false);
    expect(validateCandidatePreferences(validPreferences({ modality: 'telework' })).valid).toBe(false);
  });

  it('rejects unexpected properties', () => {
    expect(validateCandidatePreferences(validPreferences({ inferred_salary: 1200 })).valid).toBe(false);
  });
});
