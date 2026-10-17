import type { CandidatePreferences, CandidateProfile } from '@workbridge/domain';
import { savedSearchesStore, type SavedSearch } from './saved-searches-store';
import { neon } from '@neondatabase/serverless';
import { preferencesStore } from './preferences-store';
import { profileStore } from './profile-store';
import { vacancyVisitsStore } from './vacancy-visits-store';
import { ChatSessionConflictError, chatSessionStore, type ChatSession } from './chat-store';

export function persistenceMode(env: NodeJS.ProcessEnv = process.env): 'neon' | 'memory' {
  return env.WORKBRIDGE_PERSISTENCE === 'memory' ? 'memory' : 'neon';
}

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

export async function persistCandidateProfile(profile: CandidateProfile): Promise<void> {
  if (persistenceMode() === 'memory') {
    if (!profileStore.get(profile.candidate_id)) {
      throw new Error('Candidate profile is not in the memory store');
    }
    return;
  }
  await database()`
    insert into candidate_profiles (candidate_id, profile)
    values (${profile.candidate_id}, ${JSON.stringify(profile)}::jsonb)
    on conflict (candidate_id) do update set profile = excluded.profile, updated_at = now()
  `;
}

export async function persistCandidatePreferences(preferences: CandidatePreferences): Promise<void> {
  if (persistenceMode() === 'memory') {
    if (!preferencesStore.get(preferences.candidate_id)) {
      throw new Error('Candidate preferences are not in the memory store');
    }
    return;
  }
  await database()`
    insert into candidate_preferences (candidate_id, preferences)
    values (${preferences.candidate_id}, ${JSON.stringify(preferences)}::jsonb)
    on conflict (candidate_id) do update set preferences = excluded.preferences, updated_at = now()
  `;
}

export async function readCandidatePreferences(candidateId: string): Promise<CandidatePreferences | undefined> {
  if (persistenceMode() === 'memory') return preferencesStore.get(candidateId);
  const rows = await database()`select preferences from candidate_preferences where candidate_id = ${candidateId}`;
  return (rows[0] as { preferences?: CandidatePreferences } | undefined)?.preferences;
}

export async function readCandidateProfile(candidateId: string): Promise<CandidateProfile | undefined> {
  if (persistenceMode() === 'memory') return profileStore.get(candidateId);
  const rows = await database()`select profile from candidate_profiles where candidate_id = ${candidateId}`;
  return (rows[0] as { profile?: CandidateProfile } | undefined)?.profile;
}

export async function deleteCandidateData(candidateId: string): Promise<void> {
  if (persistenceMode() === 'memory') {
    profileStore.delete(candidateId);
    preferencesStore.delete(candidateId);
    savedSearchesStore.deleteByCandidate(candidateId);
    chatSessionStore.delete(candidateId);
    return;
  }
  await database()`delete from candidate_chat_sessions where candidate_id = ${candidateId}`;
  await database()`delete from candidate_saved_searches where candidate_id = ${candidateId}`;
  await database()`delete from candidate_profiles where candidate_id = ${candidateId}`;
  await database()`delete from candidate_preferences where candidate_id = ${candidateId}`;
}

export async function persistSavedSearch(search: SavedSearch): Promise<void> {
  if (persistenceMode() === 'memory') {
    if (!savedSearchesStore.get(search.searchId)) {
      throw new Error('Saved search is not in the memory store');
    }
    return;
  }
  await database()`
    insert into candidate_saved_searches (search_id, candidate_id, search)
    values (${search.searchId}, ${search.candidateId}, ${JSON.stringify(search)}::jsonb)
    on conflict (search_id) do update set search = excluded.search, updated_at = now()
  `;
}

export async function readSavedSearches(candidateId: string): Promise<SavedSearch[]> {
  if (persistenceMode() === 'memory') return savedSearchesStore.list(candidateId);
  const rows = await database()`select search from candidate_saved_searches where candidate_id = ${candidateId} order by search_id`;
  return rows.map((row) => (row as { search: SavedSearch }).search);
}

export async function markCandidateVacancyVisit(candidateId: string, visitedAt = new Date().toISOString()): Promise<void> {
  if (persistenceMode() === 'memory') { vacancyVisitsStore.mark(candidateId, visitedAt); return; }
  await database()`insert into candidate_vacancy_visits (candidate_id, visited_at) values (${candidateId}, ${visitedAt}::timestamptz) on conflict (candidate_id) do update set visited_at = excluded.visited_at`;
}

export async function readCandidateVacancyVisit(candidateId: string): Promise<string | undefined> {
  if (persistenceMode() === 'memory') return vacancyVisitsStore.get(candidateId);
  const rows = await database()`select visited_at from candidate_vacancy_visits where candidate_id = ${candidateId}`;
  return (rows[0] as { visited_at?: string } | undefined)?.visited_at;
}

export async function persistChatSession(candidateId: string, session: ChatSession): Promise<void> {
  if (persistenceMode() === 'memory') {
    chatSessionStore.save(candidateId, session);
    return;
  }
  const { version, ...data } = session;
  const json = JSON.stringify(data);
  // Optimistic lock: version 0 means no row yet; otherwise update only if the stored version still matches.
  const rows =
    version === 0
      ? await database()`
          insert into candidate_chat_sessions (candidate_id, session, version)
          values (${candidateId}, ${json}::jsonb, 1)
          on conflict (candidate_id) do nothing
          returning version
        `
      : await database()`
          update candidate_chat_sessions
          set session = ${json}::jsonb, version = version + 1, updated_at = now()
          where candidate_id = ${candidateId} and version = ${version}
          returning version
        `;
  if (rows.length === 0) throw new ChatSessionConflictError();
}

export async function readChatSession(candidateId: string): Promise<ChatSession | undefined> {
  if (persistenceMode() === 'memory') return chatSessionStore.get(candidateId);
  const rows = await database()`select session, version from candidate_chat_sessions where candidate_id = ${candidateId}`;
  const row = rows[0] as { session?: Omit<ChatSession, 'version'>; version?: number } | undefined;
  return row?.session ? { ...row.session, version: Number(row.version ?? 0) } : undefined;
}
