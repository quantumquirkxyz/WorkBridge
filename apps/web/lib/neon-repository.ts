import type { CandidatePreferences, CandidateProfile } from '@puente/domain';
import { getNeonPool } from './neon-db';

export async function persistCandidateProfile(profile: CandidateProfile): Promise<void> {
  await getNeonPool().query(
    `insert into candidate_profiles (candidate_id, profile)
     values ($1, $2::jsonb)
     on conflict (candidate_id) do update set profile = excluded.profile, updated_at = now()`,
    [profile.candidate_id, JSON.stringify(profile)],
  );
}

export async function persistCandidatePreferences(preferences: CandidatePreferences): Promise<void> {
  await getNeonPool().query(
    `insert into candidate_preferences (candidate_id, preferences)
     values ($1, $2::jsonb)
     on conflict (candidate_id) do update set preferences = excluded.preferences, updated_at = now()`,
    [preferences.candidate_id, JSON.stringify(preferences)],
  );
}

export async function deleteCandidateData(candidateId: string): Promise<void> {
  const pool = getNeonPool();
  await pool.query('delete from candidate_profiles where candidate_id = $1', [candidateId]);
  await pool.query('delete from candidate_preferences where candidate_id = $1', [candidateId]);
}
