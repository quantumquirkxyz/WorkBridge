import { makeCandidateId, makeId, type CandidatePreferences } from '@puente/domain';

/**
 * The preference fields a candidate submits explicitly. Server-generated
 * fields (schema version, id, origin, timestamps) are added by
 * `buildPreferences`; they are never accepted from the client.
 */
export type PreferencesDraft = Omit<
  CandidatePreferences,
  'schema_version' | 'preferences_id' | 'origin' | 'created_at' | 'updated_at' | 'candidate_id'
> & {
  /** Optional: a deterministic candidate id is derived from the declaration when absent. */
  candidate_id?: string;
};

/**
 * Build a CandidatePreferences document from an explicit submission.
 *
 * This is a pure mapping with no model call: preferences reach persistence only
 * because the candidate declared them. `origin` is fixed to
 * `candidate_explicit`, which the contract enforces.
 */
export function buildPreferences(
  draft: PreferencesDraft,
  { now = () => new Date() }: { now?: () => Date } = {},
): CandidatePreferences {
  const timestamp = now().toISOString();
  const declaredId = typeof draft.candidate_id === 'string' && draft.candidate_id.length > 0
    ? draft.candidate_id
    : makeCandidateId(
        JSON.stringify({
          roles: draft.target_roles,
          modality: draft.modality,
          province: draft.max_location?.province ?? null,
        }),
      );
  return {
    ...draft,
    schema_version: '1.0.0',
    preferences_id: makeId('preferences', declaredId),
    candidate_id: declaredId,
    origin: 'candidate_explicit',
    created_at: timestamp,
    updated_at: timestamp,
  };
}
