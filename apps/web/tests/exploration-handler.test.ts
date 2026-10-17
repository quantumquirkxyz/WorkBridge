import { describe, expect, it, vi } from 'vitest';
import { validateCandidatePreferences } from '@puente/domain';
import { validateExplorationResult } from '@puente/catalog';
import { buildPreferences, type PreferencesDraft } from '../lib/preferences';
import { createInMemoryPreferencesStore } from '../lib/preferences-store';
import { handleDeleteCandidate, handleExploration, handleSavePreferences } from '../lib/exploration-handler';

const NOW = () => new Date('2026-10-16T12:00:00.000Z');

function draft(overrides: Partial<PreferencesDraft> = {}): PreferencesDraft {
  return {
    candidate_id: 'candidate_web_1',
    locale: 'es-PA',
    target_roles: ['Atención al cliente'],
    modality: 'onsite',
    max_location: { country: 'PA', province: 'Panamá', district: 'Panamá', raw: 'Ciudad de Panamá' },
    max_travel_minutes: 60,
    monthly_transport_budget_usd: 40,
    minimum_salary_usd: 600,
    availability: { days: [1, 2, 3, 4, 5], start_minute: 480, end_minute: 1020, weekly_hours: 40 },
    contract_types: ['full_time'],
    transport_modes: ['transit'],
    willing_to_train: true,
    willing_to_intern: false,
    ...overrides,
  };
}

describe('buildPreferences', () => {
  it('adds server-generated fields and fixes origin to candidate_explicit', () => {
    const preferences = buildPreferences(draft(), { now: NOW });
    expect(preferences.schema_version).toBe('1.0.0');
    expect(preferences.origin).toBe('candidate_explicit');
    expect(preferences.created_at).toBe('2026-10-16T12:00:00.000Z');
    expect(preferences.preferences_id).toMatch(/^preferences_/);
    expect(validateCandidatePreferences(preferences)).toEqual({ valid: true });
  });

  it('derives a deterministic candidate id when none is provided', () => {
    const { candidate_id: _omit, ...withoutId } = draft();
    const first = buildPreferences(withoutId, { now: NOW });
    const second = buildPreferences(withoutId, { now: NOW });
    expect(first.candidate_id).toBe(second.candidate_id);
    expect(first.candidate_id).toMatch(/^candidate_/);
  });
});

describe('handleExploration', () => {
  it('persists preferences and returns a valid exploration result', async () => {
    const store = createInMemoryPreferencesStore();
    const { status, body } = await handleExploration(draft(), { store, now: NOW });

    expect(status).toBe(200);
    expect(validateExplorationResult(body)).toBe(true);
    const result = body as { matches: Array<{ vacancy: { jobId: string } }>; summary: { stale: number } };
    expect(result.matches.map((match) => match.vacancy.jobId)).toEqual(['lnk-1001']);
    expect(result.summary.stale).toBe(1);
    expect(store.get('candidate_web_1')?.origin).toBe('candidate_explicit');
  });

  it('rejects a payload that violates the preferences contract', async () => {
    const { status, body } = await handleExploration(draft({ target_roles: [] }), { now: NOW });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: 'invalid_preferences' });
    expect((body as { details: string[] }).details.length).toBeGreaterThan(0);
  });

  it('rejects a non-object payload', async () => {
    const { status, body } = await handleExploration('nope', { now: NOW });
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: 'invalid_preferences' });
  });

  it('explains each cause, keeps single-constraint near matches with warnings, and requests training', async () => {
    const result = await handleExploration(draft({ willing_to_train: true, max_location: { country: 'PA', province: 'Bocas del Toro', district: null, raw: 'Bocas del Toro' } }), { now: NOW });
    expect(result.status).toBe(200);
    const body = result.body as {
      matches: unknown[];
      excluded: Array<{ jobId: string; reason: string; failedConstraints: Array<{ reason: string; detail: string }> }>;
      noMatch?: {
        explanation: string;
        causes: Array<{ reason: string; count: number; detail: string }>;
        nearMatches: Array<{ vacancy: { jobId: string }; blockedBy: string; warnings: string[] }>;
        roadmapRequested: boolean;
      };
    };
    expect(body.matches).toHaveLength(0);
    expect(body.noMatch?.explanation).toContain('restricciones');
    expect(body.noMatch?.roadmapRequested).toBe(true);

    // Every stated cause is present with an explicit count, and names a declared
    // constraint that actually blocked at least one vacancy.
    const causes = body.noMatch?.causes ?? [];
    expect(causes.length).toBeGreaterThan(0);
    for (const cause of causes) {
      expect(cause.count).toBeGreaterThan(0);
      expect(cause.detail.length).toBeGreaterThan(0);
      expect(
        body.excluded.some((entry) =>
          entry.failedConstraints.some((failure) => failure.reason === cause.reason),
        ),
      ).toBe(true);
    }
    // Secondary failures surface too: contract blocks a vacancy whose primary
    // reason is location.
    expect(causes.map((cause) => cause.reason)).toContain('contract');

    // Near matches are blocked by exactly one declared constraint and carry a warning.
    expect(body.noMatch?.nearMatches.length).toBeGreaterThan(0);
    for (const near of body.noMatch!.nearMatches) {
      expect(near.warnings.length).toBeGreaterThan(0);
      expect(near.blockedBy).toBe('location');
    }
  });

  it('never calls an external submission tool while exploring', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in test'));
    try {
      const result = await handleExploration(draft(), { now: NOW });
      expect(result.status).toBe(200);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('handleSavePreferences', () => {
  it('persists preferences without exploring', () => {
    const store = createInMemoryPreferencesStore();
    const { status, body } = handleSavePreferences(draft(), { store, now: NOW });
    expect(status).toBe(200);
    expect(validateCandidatePreferences(body)).toEqual({ valid: true });
    expect(store.all()).toHaveLength(1);
  });

  it('rejects an invalid document', () => {
    const { status } = handleSavePreferences({ target_roles: ['x'] }, { now: NOW });
    expect(status).toBe(400);
  });
});

describe('handleDeleteCandidate', () => {
  it('deletes candidate preferences and saved searches without touching a submission seam', () => {
    const store = createInMemoryPreferencesStore();
    handleSavePreferences(draft(), { store, now: NOW });
    const { status, body } = handleDeleteCandidate('candidate_web_1', { store });
    expect(status).toBe(200);
    expect(body).toMatchObject({ deleted: true, candidateId: 'candidate_web_1', preferencesDeleted: true });
    expect(store.get('candidate_web_1')).toBeUndefined();
  });

  it('rejects a missing or oversized candidate id', () => {
    expect(handleDeleteCandidate('')).toMatchObject({ status: 400 });
    expect(handleDeleteCandidate('x'.repeat(129))).toMatchObject({ status: 400 });
  });
});
