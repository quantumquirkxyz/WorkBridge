/**
 * TypeScript mirror of the JSON Schema 2020-12 contracts in `./schemas`.
 *
 * The JSON Schemas remain the single source of truth; these types exist so
 * application code gets compile-time safety. `tests/contracts.test.ts`
 * guards the two against drift.
 */

export type Provenance = 'declared' | 'extracted' | 'verified' | 'inferred';
export type SkillKind = 'technical' | 'soft';
export type SkillLevel = 0 | 1 | 2 | 3 | 4;
export type ExperienceType =
  | 'formal_employment'
  | 'informal_work'
  | 'family_business'
  | 'volunteering'
  | 'project'
  | 'academic'
  | 'internship';
export type Relevance =
  | 'relevant'
  | 'partially_relevant'
  | 'not_relevant'
  | 'requires_additional_evidence';
export type CredentialStatus =
  | 'declared'
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'rejected';
export type IntakeSourceKind = 'pdf' | 'image' | 'text' | 'audio_transcript';
export type EducationLevel =
  | 'primary'
  | 'secondary'
  | 'technical'
  | 'undergraduate'
  | 'postgraduate'
  | 'course'
  | 'other';

export interface Evidence {
  id: string;
  claim: string;
  source: Provenance;
  source_ref?: string;
  excerpt?: string;
  confidence: number;
  captured_at?: string;
}

export interface CandidateSkill {
  skill_id: string;
  canonical_name: string;
  original_term: string;
  kind: SkillKind;
  level: SkillLevel;
  evidence_ids: string[];
  source: Provenance;
  confidence: number;
  synonyms?: string[];
  esco_reference?: string;
  normalization_notes?: string[];
}

export interface CandidateExperience {
  id: string;
  experience_type: ExperienceType;
  title: string;
  organization?: string;
  description: string;
  started_at?: string;
  ended_at?: string;
  ongoing?: boolean;
  location?: string;
  source: Provenance;
  relevance: Relevance;
  relevance_reason: string;
  skill_ids: string[];
  evidence_ids: string[];
  confidence: number;
}

export interface CandidateEducation {
  id: string;
  institution: string;
  program: string;
  level?: EducationLevel;
  started_at?: string;
  ended_at?: string;
  ongoing?: boolean;
  source: Provenance;
  evidence_ids: string[];
  confidence: number;
}

export interface CandidateCertification {
  id: string;
  name: string;
  issuer?: string;
  issued_at?: string;
  expires_at?: string;
  credential_url?: string;
  status: CredentialStatus;
  source: Provenance;
  evidence_ids: string[];
  skill_ids?: string[];
  confidence: number;
}

export interface IntakeSource {
  kind: IntakeSourceKind;
  ref: string;
  mime_type?: string;
  byte_length?: number;
  page_count?: number;
  extracted_char_count?: number;
  extraction_method: string;
  extraction_confidence?: number;
  warnings?: string[];
  extracted_at: string;
}

export interface CandidateProfile {
  schema_version: '1.0.0';
  candidate_id: string;
  locale: string;
  created_at: string;
  updated_at: string;
  target_roles?: string[];
  sources: IntakeSource[];
  skills: CandidateSkill[];
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
  evidence: Evidence[];
  warnings?: string[];
  trace_id: string;
}

export interface DraftEvidence {
  claim: string;
  source: Provenance;
  source_ref?: string;
  excerpt?: string;
  confidence?: number;
}

export interface DraftSkill {
  original_term: string;
  canonical_hint?: string;
  kind_hint?: SkillKind;
  level_hint?: SkillLevel;
  confidence?: number;
  evidence?: DraftEvidence[];
}

export interface DraftExperience {
  experience_type: ExperienceType;
  title: string;
  organization?: string;
  description: string;
  started_at?: string;
  ended_at?: string;
  ongoing?: boolean;
  location?: string;
  confidence?: number;
  evidence?: DraftEvidence[];
}

export interface DraftEducation {
  institution: string;
  program: string;
  level?: EducationLevel;
  started_at?: string;
  ended_at?: string;
  ongoing?: boolean;
  confidence?: number;
  evidence?: DraftEvidence[];
}

export interface DraftCertification {
  name: string;
  issuer?: string;
  issued_at?: string;
  expires_at?: string;
  credential_url?: string;
  confidence?: number;
  evidence?: DraftEvidence[];
}

export interface ProfileDraft {
  full_name?: string;
  locale?: string;
  target_roles?: string[];
  skills?: DraftSkill[];
  experiences?: DraftExperience[];
  education?: DraftEducation[];
  certifications?: DraftCertification[];
  notes?: string[];
}

export interface IntakeRequest {
  kind: IntakeSourceKind;
  text?: string;
  fileName?: string;
  mimeType?: string;
  contentBase64?: string;
  altText?: string;
  candidateId?: string;
  targetRoles?: string[];
  locale?: string;
  traceId?: string;
}

export type ExtractorKind = 'heuristic' | 'llm' | 'heuristic-fallback';

export interface IntakeResult {
  trace_id: string;
  profile: CandidateProfile;
  extraction: {
    extractor: ExtractorKind;
    needs_review: boolean;
    warnings: string[];
  };
}
