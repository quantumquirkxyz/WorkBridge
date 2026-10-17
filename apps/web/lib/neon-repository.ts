import type { CandidatePreferences, CandidateProfile } from '@puente/domain';
import { neon } from '@neondatabase/serverless';
import { preferencesStore } from './preferences-store';
import { profileStore } from './profile-store';

export function persistenceMode(env: NodeJS.ProcessEnv = process.env): 'neon' | 'memory' {
  return env.PUENTE_PERSISTENCE === 'memory' ? 'memory' : 'neon';
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
    return;
  }
  await database()`delete from candidate_profiles where candidate_id = ${candidateId}`;
  await database()`delete from candidate_preferences where candidate_id = ${candidateId}`;
}
