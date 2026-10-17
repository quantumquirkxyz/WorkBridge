import {
  matchVacancySkill,
  PANAMA_SKILL_TAXONOMY,
  type CandidateProfile,
  type JobRequirements,
  type Location,
  type Provenance,
  type Requirement,
} from "@puente/domain";
import type {
  CandidateAvailability,
  CandidateSkillSignal,
  CandidateTransport,
  EvidenceSource,
  GeoPoint,
  SkillLevel,
  SolverCandidate,
  SolverVacancy,
  VacancyRequirement,
  VacancySchedule,
} from "@puente/solver";
import { getRankableRequirements } from "../vacancy/ranking";

/**
 * Adapters from the domain contracts (candidate profile, normalized vacancy)
 * onto the solver's input contracts (issue #20).
 *
 * The solver deliberately defines its own projection. These adapters are the
 * single place where the profile/vacancy shapes are translated, so the solver
 * stays decoupled from any one implementation. Facts the solver needs but the
 * profile/vacancy documents do not carry (schedule, salary, transport, home
 * location) are supplied explicitly through a `*MatchContext`; nothing is
 * inferred.
 */

export interface VacancyMatchContext {
  schedule: VacancySchedule;
  salaryMinUsd: number;
  salaryMaxUsd: number;
  capacity: number;
  /** Accessibility features the workplace provides (e.g. `wheelchair`). */
  accessibilityRequirements?: string[];
}

export interface CandidateMatchContext {
  /** Declared home location; geocoded to a `GeoPoint` by the matching service. */
  home: Location;
  availability: CandidateAvailability;
  transport: Omit<CandidateTransport, "modes"> & { modes?: CandidateTransport["modes"] };
  expectedSalaryUsd: number;
  minimumSalaryUsd?: number;
}

const EVIDENCE_SOURCE: Record<Provenance, EvidenceSource> = {
  declared: "declared",
  extracted: "extracted",
  verified: "verified",
  inferred: "inferred",
};

function clampLevel(value: number): SkillLevel {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  return Math.max(0, Math.min(4, rounded)) as SkillLevel;
}

/**
 * Overall experience level 0–4 from classified experience records: a relevant
 * record counts one, a partially relevant one half. Education, projects, and
 * volunteering are already classified by the profile layer.
 */
export function deriveExperienceLevel(profile: CandidateProfile): SkillLevel {
  let score = 0;
  for (const experience of profile.experiences) {
    if (experience.relevance === "relevant") score += 1;
    else if (experience.relevance === "partially_relevant") score += 0.5;
  }
  return clampLevel(score);
}

const CANONICAL_SKILL_IDS = new Set(PANAMA_SKILL_TAXONOMY.skills.map((skill) => skill.id));

/**
 * Bridge the two skill-id spaces. The profile layer emits its own curated ids
 * (`plp:*`) while vacancy requirements carry the ESCO-shaped Panamanian ids
 * (`PA-*`); without this step every mandatory skill comparison would fail. A
 * profile skill is re-matched against the vacancy taxonomy by its canonical or
 * original name, and the original id is kept when nothing matches.
 */
export function canonicalSkillId(skill: CandidateProfile["skills"][number]): string {
  if (CANONICAL_SKILL_IDS.has(skill.skill_id)) return skill.skill_id;
  for (const term of [skill.canonical_name, skill.original_term]) {
    const match = matchVacancySkill(term);
    if (match.matched && match.skillId) return match.skillId;
  }
  return skill.skill_id;
}

function toSkillSignal(skill: CandidateProfile["skills"][number]): CandidateSkillSignal {
  return {
    skillId: canonicalSkillId(skill),
    level: clampLevel(skill.level),
    source: EVIDENCE_SOURCE[skill.source],
    evidenceCount: skill.evidence_ids.length,
    confidence: skill.confidence,
  };
}

function toRequirement(requirement: Requirement): VacancyRequirement {
  return {
    requirementId: requirement.id,
    skillId: requirement.canonical.skillId,
    wording: requirement.originalWording,
    // A missing level defaults to 1, matching the solver's `effectiveRequiredLevel`.
    requiredLevel: clampLevel(requirement.level ?? 1),
  };
}

/**
 * Project a validated `JobRequirements` document onto a `SolverVacancy`.
 * Only requirements cleared for ranking are projected: flagged requirements stay
 * out until a human resolves their alert (spec #2 fairness rule), and the
 * original wording is preserved on every requirement.
 */
export function toSolverVacancy(
  document: JobRequirements,
  context: VacancyMatchContext,
  location: GeoPoint,
): SolverVacancy {
  const rankable = getRankableRequirements(document);
  return {
    vacancyId: document.vacancyId,
    location,
    mandatory: rankable.filter((item) => item.category === "mandatory").map(toRequirement),
    desirable: rankable.filter((item) => item.category === "desirable").map(toRequirement),
    schedule: { ...context.schedule, days: [...context.schedule.days] },
    salaryMinUsd: context.salaryMinUsd,
    salaryMaxUsd: context.salaryMaxUsd,
    capacity: context.capacity,
    ...(context.accessibilityRequirements
      ? { accessibilityRequirements: [...context.accessibilityRequirements] }
      : {}),
  };
}

/** Project a `CandidateProfile` plus explicit match facts onto a `SolverCandidate`. */
export function toSolverCandidate(
  profile: CandidateProfile,
  context: CandidateMatchContext,
  home: GeoPoint,
): SolverCandidate {
  return {
    candidateId: profile.candidate_id,
    home,
    skills: profile.skills.map(toSkillSignal),
    experienceLevel: deriveExperienceLevel(profile),
    relevantEvidenceCount: profile.experiences.filter(
      (experience) =>
        experience.relevance === "relevant" || experience.relevance === "partially_relevant",
    ).length,
    availability: {
      days: [...context.availability.days],
      startMinute: context.availability.startMinute,
      endMinute: context.availability.endMinute,
      weeklyHours: context.availability.weeklyHours,
    },
    transport: {
      hasVehicle: context.transport.hasVehicle,
      maxCommuteMinutes: context.transport.maxCommuteMinutes,
      ...(context.transport.accessibilityNeeds
        ? { accessibilityNeeds: [...context.transport.accessibilityNeeds] }
        : {}),
      ...(context.transport.modes ? { modes: [...context.transport.modes] } : {}),
    },
    expectedSalaryUsd: context.expectedSalaryUsd,
    ...(context.minimumSalaryUsd !== undefined
      ? { minimumSalaryUsd: context.minimumSalaryUsd }
      : {}),
  };
}
