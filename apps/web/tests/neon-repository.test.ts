import { afterEach, describe, expect, it } from 'vitest';
import type { CandidatePreferences, CandidateProfile } from '@workbridge/domain';
import {
  deleteCandidateData,
  persistCandidatePreferences,
  persistCandidateProfile,
  persistSavedSearch,
  persistenceMode,
  readCandidatePreferences,
  readCandidateProfile,
  readSavedSearches,
} from '../lib/neon-repository';
import { preferencesStore } from '../lib/preferences-store';
import { profileStore } from '../lib/profile-store';
import { savedSearchesStore, type SavedSearch } from '../lib/saved-searches-store';

const CANDIDATE_ID = 'candidate_memory_suite';

const profile: CandidateProfile = {
  schema_version: '1.0.0',
  candidate_id: CANDIDATE_ID,
  locale: 'es-PA',
  created_at: '2026-10-16T12:00:00.000Z',
  updated_at: '2026-10-16T12:00:00.000Z',
  sources: [],
  skills: [],
  experiences: [],
  education: [],
  certifications: [],
  evidence: [],
  trace_id: 'trace_memory_suite',
};

const preferences: CandidatePreferences = {
  schema_version: '1.0.0',
  preferences_id: 'preferences_memory_suite',
  candidate_id: CANDIDATE_ID,
  locale: 'es-PA',
  origin: 'candidate_explicit',
  created_at: '2026-10-16T12:00:00.000Z',
  updated_at: '2026-10-16T12:00:00.000Z',
  target_roles: ['Atención al cliente'],
  modality: 'onsite',
  max_location: { country: 'PA', province: 'Panamá', district: 'Panamá', raw: 'Panamá, Panamá' },
  max_travel_minutes: 60,
  monthly_transport_budget_usd: 40,
  minimum_salary_usd: 600,
  availability: { days: [1, 2, 3, 4, 5], start_minute: 480, end_minute: 1020, weekly_hours: 40 },
  contract_types: ['full_time'],
  transport_modes: ['transit'],
  willing_to_train: true,
  willing_to_intern: false,
};

const previousPersistence = process.env.WORKBRIDGE_PERSISTENCE;
const previousDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (previousPersistence === undefined) delete process.env.WORKBRIDGE_PERSISTENCE;
  else process.env.WORKBRIDGE_PERSISTENCE = previousPersistence;
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
  profileStore.delete(CANDIDATE_ID);
  preferencesStore.delete(CANDIDATE_ID);
  savedSearchesStore.deleteByCandidate(CANDIDATE_ID);
});

describe('persistenceMode', () => {
  it('is memory only when the flag is exactly memory', () => {
    process.env.WORKBRIDGE_PERSISTENCE = 'memory';
    expect(persistenceMode()).toBe('memory');
    process.env.WORKBRIDGE_PERSISTENCE = 'neon';
    expect(persistenceMode()).toBe('neon');
    delete process.env.WORKBRIDGE_PERSISTENCE;
    expect(persistenceMode()).toBe('neon');
  });
});

describe('memory persistence', () => {
  it('resolves writes and reads without DATABASE_URL', async () => {
    process.env.WORKBRIDGE_PERSISTENCE = 'memory';
    delete process.env.DATABASE_URL;
    profileStore.save(profile);
    preferencesStore.save(preferences);

    await expect(persistCandidateProfile(profile)).resolves.toBeUndefined();
    await expect(persistCandidatePreferences(preferences)).resolves.toBeUndefined();
    await expect(readCandidateProfile(CANDIDATE_ID)).resolves.toEqual(profile);
    await expect(readCandidatePreferences(CANDIDATE_ID)).resolves.toEqual(preferences);

    const search: SavedSearch = {
      searchId: 'search_memory_suite',
      candidateId: CANDIDATE_ID,
      label: 'Atención al cliente',
      savedAt: '2026-10-16T12:00:00.000Z',
      preferences,
      seenJobIds: [],
    };
    savedSearchesStore.save(search);
    await expect(persistSavedSearch(search)).resolves.toBeUndefined();
    await expect(readSavedSearches(CANDIDATE_ID)).resolves.toEqual([search]);

    await deleteCandidateData(CANDIDATE_ID);
    await expect(readCandidateProfile(CANDIDATE_ID)).resolves.toBeUndefined();
    await expect(readCandidatePreferences(CANDIDATE_ID)).resolves.toBeUndefined();
    await expect(readSavedSearches(CANDIDATE_ID)).resolves.toEqual([]);
  });

  it('still requires DATABASE_URL when the flag is absent', async () => {
    delete process.env.WORKBRIDGE_PERSISTENCE;
    delete process.env.DATABASE_URL;
    profileStore.save(profile);

    await expect(persistCandidateProfile(profile)).rejects.toThrow('DATABASE_URL is not configured');
    await expect(readCandidateProfile(CANDIDATE_ID)).rejects.toThrow('DATABASE_URL is not configured');
    await expect(persistCandidatePreferences(preferences)).rejects.toThrow('DATABASE_URL is not configured');
  });
});
