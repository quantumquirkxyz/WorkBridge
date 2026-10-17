import {
  assertCandidateProfile,
  normalizeTerm,
  PROVENANCE_RANK,
  type CandidateCertification,
  type CandidateEducation,
  type CandidateExperience,
  type CandidateProfile,
  type CandidateSkill,
  type Evidence,
  type Provenance,
  type SkillLevel,
} from '@workbridge/domain';

/**
 * Combine skills that share a `skill_id`. The first occurrence keeps its
 * identity fields. Level and confidence take the maximum, evidence and notes
 * are unioned, and provenance moves only when the incoming source is stronger.
 */
export function mergeSkillLists(skills: readonly CandidateSkill[]): CandidateSkill[] {
  const merged = new Map<string, CandidateSkill>();
  for (const skill of skills) {
    const existing = merged.get(skill.skill_id);
    if (!existing) {
      merged.set(skill.skill_id, { ...skill });
      continue;
    }
    existing.level = Math.max(existing.level, skill.level) as SkillLevel;
    existing.evidence_ids = [...new Set([...existing.evidence_ids, ...skill.evidence_ids])];
    existing.confidence = Number(Math.max(existing.confidence, skill.confidence).toFixed(2));
    if (PROVENANCE_RANK[skill.source] > PROVENANCE_RANK[existing.source]) existing.source = skill.source;
    const notes = [...(existing.normalization_notes ?? []), ...(skill.normalization_notes ?? [])];
    if (notes.length) existing.normalization_notes = [...new Set(notes)];
  }
  return [...merged.values()].sort((a, b) => a.skill_id.localeCompare(b.skill_id));
}

function unionUnique(left: readonly string[] | undefined, right: readonly string[] | undefined): string[] {
  return [...new Set([...(left ?? []), ...(right ?? [])])];
}

function strongerProvenance(current: Provenance, next: Provenance): Provenance {
  return PROVENANCE_RANK[next] > PROVENANCE_RANK[current] ? next : current;
}

function maxConfidence(current: number, next: number): number {
  return Number(Math.max(current, next).toFixed(2));
}

function preferredDescription(existing: string, incoming: string): string {
  if (incoming.trim().length > existing.trim().length) return incoming.trim();
  return existing;
}

function experienceKey(experience: CandidateExperience): string {
  return `${experience.experience_type}|${normalizeTerm(experience.title)}|${normalizeTerm(experience.organization ?? '')}`;
}

function educationKey(education: CandidateEducation): string {
  return `${education.level ?? ''}|${normalizeTerm(education.program)}|${normalizeTerm(education.institution)}`;
}

function certificationKey(certification: CandidateCertification): string {
  return `certification|${normalizeTerm(certification.name)}|${normalizeTerm(certification.issuer ?? '')}`;
}

function mergeKeyed<T>(
  existing: readonly T[],
  incoming: readonly T[],
  keyOf: (item: T) => string,
  combine: (current: T, next: T) => T,
): T[] {
  const indexByKey = new Map<string, number>();
  const merged: T[] = [];
  const absorb = (item: T) => {
    const key = keyOf(item);
    const index = indexByKey.get(key);
    if (index === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(item);
      return;
    }
    const current = merged[index];
    if (current) merged[index] = combine(current, item);
  };
  for (const item of existing) absorb(item);
  for (const item of incoming) absorb(item);
  return merged;
}

function mergeExperience(existing: CandidateExperience, incoming: CandidateExperience): CandidateExperience {
  const merged: CandidateExperience = {
    ...existing,
    evidence_ids: unionUnique(existing.evidence_ids, incoming.evidence_ids),
    skill_ids: unionUnique(existing.skill_ids, incoming.skill_ids).sort(),
    source: strongerProvenance(existing.source, incoming.source),
    confidence: maxConfidence(existing.confidence, incoming.confidence),
    description: preferredDescription(existing.description, incoming.description),
  };
  if (incoming.confidence > existing.confidence) {
    merged.relevance = incoming.relevance;
    merged.relevance_reason = incoming.relevance_reason;
  }
  if (merged.organization === undefined && incoming.organization !== undefined) merged.organization = incoming.organization;
  if (merged.started_at === undefined && incoming.started_at !== undefined) merged.started_at = incoming.started_at;
  if (merged.ended_at === undefined && incoming.ended_at !== undefined) merged.ended_at = incoming.ended_at;
  if (merged.ongoing === undefined && incoming.ongoing !== undefined) merged.ongoing = incoming.ongoing;
  if (merged.location === undefined && incoming.location !== undefined) merged.location = incoming.location;
  return merged;
}

function mergeEducation(existing: CandidateEducation, incoming: CandidateEducation): CandidateEducation {
  const merged: CandidateEducation = {
    ...existing,
    evidence_ids: unionUnique(existing.evidence_ids, incoming.evidence_ids),
    source: strongerProvenance(existing.source, incoming.source),
    confidence: maxConfidence(existing.confidence, incoming.confidence),
  };
  if (merged.level === undefined && incoming.level !== undefined) merged.level = incoming.level;
  if (merged.started_at === undefined && incoming.started_at !== undefined) merged.started_at = incoming.started_at;
  if (merged.ended_at === undefined && incoming.ended_at !== undefined) merged.ended_at = incoming.ended_at;
  if (merged.ongoing === undefined && incoming.ongoing !== undefined) merged.ongoing = incoming.ongoing;
  return merged;
}

function mergeCertification(existing: CandidateCertification, incoming: CandidateCertification): CandidateCertification {
  const skillIds = unionUnique(existing.skill_ids, incoming.skill_ids).sort();
  const merged: CandidateCertification = {
    ...existing,
    evidence_ids: unionUnique(existing.evidence_ids, incoming.evidence_ids),
    source: strongerProvenance(existing.source, incoming.source),
    confidence: maxConfidence(existing.confidence, incoming.confidence),
    status: existing.status,
  };
  if (skillIds.length) merged.skill_ids = skillIds;
  else delete merged.skill_ids;
  if (merged.issuer === undefined && incoming.issuer !== undefined) merged.issuer = incoming.issuer;
  if (merged.issued_at === undefined && incoming.issued_at !== undefined) merged.issued_at = incoming.issued_at;
  if (merged.expires_at === undefined && incoming.expires_at !== undefined) merged.expires_at = incoming.expires_at;
  if (merged.credential_url === undefined && incoming.credential_url !== undefined) {
    merged.credential_url = incoming.credential_url;
  }
  return merged;
}

function mergeEvidence(existing: readonly Evidence[], incoming: readonly Evidence[]): Evidence[] {
  const byId = new Map<string, Evidence>();
  for (const record of existing) byId.set(record.id, record);
  for (const record of incoming) if (!byId.has(record.id)) byId.set(record.id, record);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** True when the profile still has gaps a reviewer should confirm. */
export function profileNeedsReview(profile: CandidateProfile): boolean {
  return (
    (profile.warnings?.length ?? 0) > 0 ||
    profile.experiences.some((experience) => experience.relevance === 'requires_additional_evidence') ||
    profile.skills.some((skill) => skill.level === 0)
  );
}

/**
 * Fold a newly extracted profile into the one already stored for that
 * candidate. Previously stored items stay; evidence is appended. The result
 * is validated before it is returned.
 */
export function mergeCandidateProfiles(existing: CandidateProfile, incoming: CandidateProfile): CandidateProfile {
  const left = structuredClone(existing);
  const right = structuredClone(incoming);
  const targetRoles = unionUnique(left.target_roles, right.target_roles);
  const warnings = unionUnique(left.warnings, right.warnings);

  const profile: CandidateProfile = {
    schema_version: left.schema_version,
    candidate_id: left.candidate_id,
    locale: left.locale,
    created_at: left.created_at,
    updated_at: right.updated_at,
    sources: [...left.sources, ...right.sources],
    skills: mergeSkillLists([...left.skills, ...right.skills]),
    experiences: mergeKeyed(left.experiences, right.experiences, experienceKey, mergeExperience),
    education: mergeKeyed(left.education, right.education, educationKey, mergeEducation),
    certifications: mergeKeyed(left.certifications, right.certifications, certificationKey, mergeCertification),
    evidence: mergeEvidence(left.evidence, right.evidence),
    trace_id: right.trace_id,
  };
  if (targetRoles.length) profile.target_roles = targetRoles;
  if (warnings.length) profile.warnings = warnings;

  assertCandidateProfile(profile);
  return profile;
}
