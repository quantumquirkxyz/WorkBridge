import type { CandidatePreferences, CandidateProfile } from '@puente/domain';
import type { SavedSearch } from './saved-searches-store';
import { neon } from '@neondatabase/serverless';

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

export async function persistCandidateProfile(profile: CandidateProfile): Promise<void> {
  await database()`
    insert into candidate_profiles (candidate_id, profile)
    values (${profile.candidate_id}, ${JSON.stringify(profile)}::jsonb)
    on conflict (candidate_id) do update set profile = excluded.profile, updated_at = now()
  `;
}

export async function persistCandidatePreferences(preferences: CandidatePreferences): Promise<void> {
  await database()`
    insert into candidate_preferences (candidate_id, preferences)
    values (${preferences.candidate_id}, ${JSON.stringify(preferences)}::jsonb)
    on conflict (candidate_id) do update set preferences = excluded.preferences, updated_at = now()
  `;
}

export async function readCandidatePreferences(candidateId: string): Promise<CandidatePreferences | undefined> {
  const rows = await database()`select preferences from candidate_preferences where candidate_id = ${candidateId}`;
  return (rows[0] as { preferences?: CandidatePreferences } | undefined)?.preferences;
}

export async function readCandidateProfile(candidateId: string): Promise<CandidateProfile | undefined> {
  const rows = await database()`select profile from candidate_profiles where candidate_id = ${candidateId}`;
  return (rows[0] as { profile?: CandidateProfile } | undefined)?.profile;
}

export async function deleteCandidateData(candidateId: string): Promise<void> {
  await database()`delete from candidate_saved_searches where candidate_id = ${candidateId}`;
  await database()`delete from candidate_profiles where candidate_id = ${candidateId}`;
  await database()`delete from candidate_preferences where candidate_id = ${candidateId}`;
}

export async function persistSavedSearch(search: SavedSearch): Promise<void> {
  await database()`
    insert into candidate_saved_searches (search_id, candidate_id, search)
    values (${search.searchId}, ${search.candidateId}, ${JSON.stringify(search)}::jsonb)
    on conflict (search_id) do update set search = excluded.search, updated_at = now()
  `;
}

export async function readSavedSearches(candidateId: string): Promise<SavedSearch[]> {
  const rows = await database()`select search from candidate_saved_searches where candidate_id = ${candidateId} order by search_id`;
  return rows.map((row) => (row as { search: SavedSearch }).search);
}
