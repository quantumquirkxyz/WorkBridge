import {
  assertCandidateProfile,
  CONFIDENCE_BY_PROVENANCE,
  DECLARED_ONLY_MAX_LEVEL,
  DEFAULT_EXPERIENCE_CONFIDENCE,
  DEFAULT_LOCALE,
  LEVEL_BEYOND_BASIC_PROVENANCE,
  MIN_CONFIDENCE,
  PROFILE_SCHEMA_VERSION,
  PROVENANCE_RANK,
  SKILL_LEVEL_MAX,
  SKILL_LEVEL_MIN,
  makeId,
  matchMentions,
  profileMatchSkill,
  normalizeTerm,
  resolveTargetRoles,
  TAXONOMY_BY_ID,
  type CandidateCertification,
  type CandidateEducation,
  type CandidateExperience,
  type CandidateProfile,
  type CandidateSkill,
  type DraftEvidence,
  type Evidence,
  type IntakeSource,
  type ProfileDraft,
  type Provenance,
  type SkillDefinition,
  type SkillLevel,
} from '@puente/domain';
import { classifyExperience } from './classify';
import { inferExperienceType } from './experience-type';
import { mergeSkillLists } from './merge-profile';

export interface NormalizeOptions {
  traceId: string;
  sources: readonly IntakeSource[];
  /** Provenance of the raw intake text; drives the declared-only cap. */
  provenance: Provenance;
  targetRoles?: string[];
  candidateId?: string;
  locale?: string;
  warnings?: string[];
  now?: () => Date;
}

function clampLevel(value: number): SkillLevel {
  const bounded = Math.max(SKILL_LEVEL_MIN, Math.min(SKILL_LEVEL_MAX, Math.round(value)));
  return bounded as SkillLevel;
}

function provenanceRank(provenance: Provenance): number {
  return PROVENANCE_RANK[provenance];
}

export function strongestProvenance(records: readonly Evidence[]): Provenance {
  let strongest: Provenance = 'declared';
  for (const record of records) {
    if (provenanceRank(record.source) > provenanceRank(strongest)) strongest = record.source;
  }
  return strongest;
}

function slugify(value: string): string {
  const slug = normalizeTerm(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

class EvidenceFactory {
  private readonly byKey = new Map<string, Evidence>();
  readonly records: Evidence[] = [];

  constructor(
    private readonly provenance: Provenance,
    private readonly sourceRef: string,
    private readonly now: () => Date,
  ) {}

  add(draft: DraftEvidence | undefined, fallbackClaim: string): string {
    const claim = (draft?.claim?.trim() || fallbackClaim).trim();
    const source = this.resolveSource(draft?.source);
    const key = [this.sourceRef, source, normalizeTerm(claim)].join('|');
    const existing = this.byKey.get(key);
    if (existing) return existing.id;

    const confidence = draft?.confidence ?? CONFIDENCE_BY_PROVENANCE[source];
    const id = makeId('ev', key);
    const record: Evidence = {
      id,
      claim,
      source,
      confidence,
      captured_at: this.now().toISOString(),
      source_ref: draft?.source_ref ?? this.sourceRef,
    };
    if (draft?.excerpt) record.excerpt = draft.excerpt;
    this.byKey.set(key, record);
    this.records.push(record);
    return id;
  }

  /**
   * Clamp a draft-supplied evidence source so it never claims document-level or
   * verified evidence the intake source itself could not produce. This keeps
   * provenance honest and stops a model from raising a declared fact above
   * level 1 by relabelling its own evidence as `extracted`.
   */
  private resolveSource(requested: Provenance | undefined): Provenance {
    const candidate = requested ?? this.provenance;
    if (
      LEVEL_BEYOND_BASIC_PROVENANCE.includes(candidate) &&
      provenanceRank(candidate) > provenanceRank(this.provenance)
    ) {
      return this.provenance;
    }
    return candidate;
  }
}

/** Attach a draft's evidence (or one fallback record) and return the evidence ids. */
function collectEvidence(
  evidence: EvidenceFactory,
  draftEvidence: readonly DraftEvidence[] | undefined,
  fallbackClaim: string,
): string[] {
  const items = draftEvidence ?? [];
  return items.length > 0
    ? items.map((item) => evidence.add(item, fallbackClaim))
    : [evidence.add(undefined, fallbackClaim)];
}

function resolveTaxonomy(draft: {
  original_term: string;
  canonical_hint?: string;
}): SkillDefinition | undefined {
  const hint = draft.canonical_hint?.trim();
  if (hint) {
    const byId = TAXONOMY_BY_ID.get(hint);
    if (byId) return byId;
    const byHint = profileMatchSkill(hint);
    if (byHint) return byHint.skill;
  }
  return profileMatchSkill(draft.original_term)?.skill;
}

interface SkillBuildResult {
  skill: CandidateSkill;
}

function buildSkill(
  draft: NonNullable<ProfileDraft['skills']>[number],
  evidence: EvidenceFactory,
  provenance: Provenance,
): SkillBuildResult | undefined {
  const original = draft.original_term.trim();
  if (!original) return undefined;

  const taxonomy = resolveTaxonomy(draft);
  const notes: string[] = [];
  const evidenceIds = collectEvidence(evidence, draft.evidence, original);

  const records = evidence.records.filter((record) => evidenceIds.includes(record.id));
  const strongest = strongestProvenance(records);

  // A skill may exceed level 1 only when both the intake provenance and its own
  // evidence are strong enough (extracted/verified). Declared-only evidence caps
  // it at level 1 regardless of what the draft asked for.
  const beyondBasic =
    LEVEL_BEYOND_BASIC_PROVENANCE.includes(provenance) &&
    LEVEL_BEYOND_BASIC_PROVENANCE.includes(strongest);

  let level = clampLevel(draft.level_hint ?? (provenance === 'declared' ? 1 : 2));
  if (level > 0 && !beyondBasic && level > DECLARED_ONLY_MAX_LEVEL) {
    level = DECLARED_ONLY_MAX_LEVEL;
    notes.push('Declared-only skill capped at level 1 until stronger evidence is provided.');
  }

  let skillId: string;
  let canonicalName: string;
  let kind = draft.kind_hint ?? 'soft';
  if (taxonomy) {
    skillId = taxonomy.skill_id;
    canonicalName = taxonomy.canonical_name;
    kind = taxonomy.kind;
  } else {
    skillId = `plp:unmapped:${slugify(original)}`;
    canonicalName = original;
    notes.push('Not present in the curated taxonomy; skill kept unmapped and capped at level 1.');
    if (level > 1) level = 1;
  }

  const confidence =
    draft.confidence ?? Math.max(MIN_CONFIDENCE, Math.min(1, records.reduce((min, r) => Math.min(min, r.confidence), 1)));

  const skill: CandidateSkill = {
    skill_id: skillId,
    canonical_name: canonicalName,
    original_term: original,
    kind,
    level,
    evidence_ids: [...new Set(evidenceIds)],
    source: strongest,
    confidence: Number(confidence.toFixed(2)),
  };
  if (taxonomy) skill.synonyms = taxonomy.synonyms;
  if (notes.length) skill.normalization_notes = notes;
  return { skill };
}

function mergeSkills(skills: readonly CandidateSkill[]): CandidateSkill[] {
  return mergeSkillLists(skills);
}

function buildExperience(
  draft: NonNullable<ProfileDraft['experiences']>[number],
  evidence: EvidenceFactory,
  provenance: Provenance,
  roles: ReturnType<typeof resolveTargetRoles>,
): CandidateExperience {
  const evidenceIds = collectEvidence(evidence, draft.evidence, draft.description || draft.title);

  const detected = matchMentions([draft.title, draft.organization ?? '', draft.description].join(' ')).map(
    (match) => match.skill.skill_id,
  );
  const skillIds = [...new Set(detected)].sort();

  const experienceType = draft.experience_type ?? inferExperienceType(draft.description);
  const classification = classifyExperience({
    description: draft.description,
    experienceType,
    roles,
    skillIds,
  });

  const records = evidence.records.filter((record) => evidenceIds.includes(record.id));
  const confidence = draft.confidence ?? Math.max(MIN_CONFIDENCE, classification.score || DEFAULT_EXPERIENCE_CONFIDENCE);

  const experience: CandidateExperience = {
    id: makeId('exp', [experienceType, draft.title, draft.organization ?? '', draft.description].join('|')),
    experience_type: experienceType,
    title: draft.title.trim(),
    description: draft.description.trim(),
    source: strongestProvenance(records),
    relevance: classification.relevance,
    relevance_reason: classification.reason,
    skill_ids: skillIds,
    evidence_ids: [...new Set(evidenceIds)],
    confidence: Number(confidence.toFixed(2)),
  };
  if (draft.organization) experience.organization = draft.organization;
  if (draft.started_at) experience.started_at = draft.started_at;
  if (draft.ended_at) experience.ended_at = draft.ended_at;
  if (draft.ongoing !== undefined) experience.ongoing = draft.ongoing;
  if (draft.location) experience.location = draft.location;
  return experience;
}

function buildEducation(
  draft: NonNullable<ProfileDraft['education']>[number],
  evidence: EvidenceFactory,
): CandidateEducation {
  const claim = `${draft.program} — ${draft.institution}`;
  const evidenceIds = collectEvidence(evidence, draft.evidence, claim);
  const records = evidence.records.filter((record) => evidenceIds.includes(record.id));

  const education: CandidateEducation = {
    id: makeId('edu', [draft.institution, draft.program, draft.level ?? ''].join('|')),
    institution: draft.institution.trim(),
    program: draft.program.trim(),
    source: strongestProvenance(records),
    evidence_ids: [...new Set(evidenceIds)],
    confidence: Number((draft.confidence ?? CONFIDENCE_BY_PROVENANCE[strongestProvenance(records)]).toFixed(2)),
  };
  if (draft.level) education.level = draft.level;
  if (draft.started_at) education.started_at = draft.started_at;
  if (draft.ended_at) education.ended_at = draft.ended_at;
  if (draft.ongoing !== undefined) education.ongoing = draft.ongoing;
  return education;
}

function buildCertification(
  draft: NonNullable<ProfileDraft['certifications']>[number],
  evidence: EvidenceFactory,
): CandidateCertification {
  const evidenceIds = collectEvidence(evidence, draft.evidence, draft.name);
  const records = evidence.records.filter((record) => evidenceIds.includes(record.id));
  const strongest = strongestProvenance(records);

  const certification: CandidateCertification = {
    id: makeId('cert', [draft.name, draft.issuer ?? '', draft.issued_at ?? ''].join('|')),
    name: draft.name.trim(),
    status: strongest === 'verified' ? 'verified' : 'declared',
    source: strongest,
    evidence_ids: [...new Set(evidenceIds)],
    confidence: Number((draft.confidence ?? CONFIDENCE_BY_PROVENANCE[strongest]).toFixed(2)),
  };
  if (draft.issuer) certification.issuer = draft.issuer;
  if (draft.issued_at) certification.issued_at = draft.issued_at;
  if (draft.expires_at) certification.expires_at = draft.expires_at;
  if (draft.credential_url) certification.credential_url = draft.credential_url;
  const skillIds = matchMentions(draft.name).map((match) => match.skill.skill_id);
  if (skillIds.length) certification.skill_ids = [...new Set(skillIds)].sort();
  return certification;
}

/**
 * Apply every deterministic normalization rule and produce a schema-valid
 * `CandidateProfile`. Throws `ContractValidationError` if a rule is missing and
 * the document would be invalid.
 */
export function normalizeProfileDraft(draft: ProfileDraft, options: NormalizeOptions): CandidateProfile {
  const now = options.now ?? (() => new Date());
  const provenance = options.provenance;
  const sourceRef = options.sources[0]?.ref ?? 'intake:unknown';
  const evidence = new EvidenceFactory(provenance, sourceRef, now);
  const roles = resolveTargetRoles(options.targetRoles ?? draft.target_roles);

  const skills = mergeSkills(
    (draft.skills ?? [])
      .map((item) => buildSkill(item, evidence, provenance))
      .filter((value): value is SkillBuildResult => value !== undefined)
      .map((value) => value.skill),
  );

  const experiences = (draft.experiences ?? [])
    .map((item) => buildExperience(item, evidence, provenance, roles))
    .sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? '') || a.id.localeCompare(b.id));

  const education = (draft.education ?? [])
    .map((item) => buildEducation(item, evidence))
    .sort((a, b) => a.id.localeCompare(b.id));

  const certifications = (draft.certifications ?? [])
    .map((item) => buildCertification(item, evidence))
    .sort((a, b) => a.id.localeCompare(b.id));

  const timestamp = now().toISOString();
  const candidateSeed = options.candidateId ?? sourceRef;
  const warnings = [...(options.warnings ?? []), ...(draft.notes ?? [])];

  const profile: CandidateProfile = {
    schema_version: PROFILE_SCHEMA_VERSION,
    candidate_id: makeId('candidate', candidateSeed),
    locale: options.locale ?? draft.locale ?? DEFAULT_LOCALE,
    created_at: timestamp,
    updated_at: timestamp,
    sources: [...options.sources],
    skills,
    experiences,
    education,
    certifications,
    evidence: [...evidence.records].sort((a, b) => a.id.localeCompare(b.id)),
    trace_id: options.traceId,
  };
  const targetRoles = options.targetRoles ?? draft.target_roles;
  if (targetRoles && targetRoles.length) profile.target_roles = [...new Set(targetRoles)];
  if (warnings.length) profile.warnings = [...new Set(warnings)];

  assertCandidateProfile(profile);
  return profile;
}
