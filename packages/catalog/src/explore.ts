import {
  assertCandidatePreferences,
  relevantSkillIds,
  resolveTargetRoles,
  type CandidatePreferences,
} from '@puente/domain';
import type { VacancyCatalog } from './catalog';
import { assertExplorationResult } from './ajv';
import { DEFAULT_MAX_AGE_HOURS, computeFreshness } from './freshness';
import { CONTRACT_LABELS, EXCLUSION_LABELS, MODALITY_LABELS } from './labels';
import type {
  CachedVacancy,
  ExcludedVacancy,
  ExclusionReason,
  ExplorationQueryOptions,
  ExplorationResult,
  Freshness,
  NearMatch,
  NoMatchCause,
  VacancyMatch,
} from './types';

/** Default cap on the number of near matches returned. Named, not magic (ADR-0004 spirit). */
export const DEFAULT_NEAR_MATCH_LIMIT = 5;

/** Deterministic priority order for exclusion reasons, reused by the cause breakdown. */
const EXCLUSION_ORDER: readonly ExclusionReason[] = [
  'stale',
  'modality',
  'location',
  'contract',
  'schedule',
  'salary',
];

/** Lower-case a shared display label for use inside a Spanish sentence. */
function lower(labels: Record<string, string>, key: string): string {
  return (labels[key] ?? key).toLowerCase();
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function dayOverlap(a: readonly number[], b: readonly number[]): number[] {
  const set = new Set(b);
  return a.filter((day) => set.has(day));
}

function skillOverlap(preferences: CandidatePreferences, vacancy: CachedVacancy) {
  const required = vacancy.skills.filter((skill) => skill.required);
  if (required.length === 0) return { covered: [] as string[], missing: [] as string[] };
  const roleSkillIds = relevantSkillIds(resolveTargetRoles(preferences.target_roles));
  const targetText = preferences.target_roles.join(' ').toLowerCase();
  const covered: string[] = [];
  const missing: string[] = [];
  for (const skill of required) {
    // Exploration is a *pre*-match filter: it checks whether a vacancy skill is
    // one the candidate's target roles treat as relevant. The solver re-derives
    // actual candidate skill levels later.
    const byId = skill.skillId !== null && roleSkillIds.has(skill.skillId);
    const byLabel = targetText.includes(skill.labelEs.toLowerCase());
    if (byId || byLabel) covered.push(skill.labelEs);
    else missing.push(skill.labelEs);
  }
  return { covered, missing };
}

interface FailedConstraint {
  reason: ExclusionReason;
  detail: string;
}

interface FilterOutcome {
  /** The highest-priority failed constraint, when the vacancy is excluded. */
  reason?: ExclusionReason;
  detail?: string;
  /**
   * Every declared constraint the vacancy failed, in priority order. An empty
   * array means the vacancy is compatible. A single entry means it is a *near*
   * match; two or more mean it is a plain exclusion.
   */
  failed: ExclusionReason[];
  score: number;
  reasons: string[];
}

function evaluate(vacancy: CachedVacancy, preferences: CandidatePreferences, freshness: Freshness): FilterOutcome {
  const reasons: string[] = [];
  const failures: FailedConstraint[] = [];

  // Constraints are collected rather than short-circuited so the caller can tell
  // a single-constraint near match from a vacancy that fails several at once.
  // The first failure remains the primary `reason`, preserving the established
  // priority order.
  if (vacancy.modality !== preferences.modality) {
    failures.push({
      reason: 'modality',
      detail: `Modalidad ${lower(MODALITY_LABELS, vacancy.modality)}; buscas ${lower(MODALITY_LABELS, preferences.modality)}.`,
    });
  }

  const max = preferences.max_location;
  if (max.province && vacancy.location.province && max.province !== vacancy.location.province) {
    failures.push({
      reason: 'location',
      detail: `Ubicada en ${vacancy.location.province}; tu ubicación máxima es ${max.province}.`,
    });
  } else if (max.district && vacancy.location.district && max.district !== vacancy.location.district) {
    failures.push({
      reason: 'location',
      detail: `Ubicada en ${vacancy.location.district}; tu ubicación máxima es ${max.district}.`,
    });
  }

  if (vacancy.contractType === 'internship' && !preferences.willing_to_intern) {
    failures.push({
      reason: 'contract',
      detail: 'Es una pasantía y no indicaste disposición a hacer pasantías.',
    });
  } else if (preferences.contract_types.length > 0 && !preferences.contract_types.includes(vacancy.contractType)) {
    failures.push({
      reason: 'contract',
      detail: `Tipo de contrato ${lower(CONTRACT_LABELS, vacancy.contractType)}, que no está en tu lista.`,
    });
  }

  const overlapDays = dayOverlap(preferences.availability.days, vacancy.schedule.days);
  if (overlapDays.length === 0) {
    failures.push({
      reason: 'schedule',
      detail: 'Los días de la vacante no coinciden con tu disponibilidad.',
    });
  }

  const floor = preferences.minimum_salary_usd;
  if (floor > 0 && vacancy.salary.maxUsd !== null && vacancy.salary.maxUsd < floor) {
    failures.push({
      reason: 'salary',
      detail: `Salario máximo USD ${vacancy.salary.maxUsd}; tu mínimo es USD ${floor}.`,
    });
  }

  if (failures.length > 0) {
    const primary = failures[0]!;
    return {
      reason: primary.reason,
      detail: primary.detail,
      failed: failures.map((failure) => failure.reason),
      score: 0,
      reasons,
    };
  }

  reasons.push(`Modalidad ${lower(MODALITY_LABELS, vacancy.modality)} y ubicación compatibles.`);
  reasons.push(`Contrato de ${lower(CONTRACT_LABELS, vacancy.contractType)}.`);
  reasons.push(`Coincidencia de horario en ${overlapDays.length} día(s).`);

  const { covered, missing } = skillOverlap(preferences, vacancy);
  const skillFit = vacancy.skills.filter((skill) => skill.required).length === 0
    ? 0.5
    : clampRatio(covered.length / vacancy.skills.filter((skill) => skill.required).length);
  if (covered.length > 0) reasons.push(`Habilidades afines: ${covered.join(', ')}.`);
  if (missing.length > 0) reasons.push(`Por revisar (no en tus puestos objetivo): ${missing.join(', ')}.`);

  let salaryFit = 1;
  if (floor > 0 && vacancy.salary.maxUsd !== null) {
    salaryFit = clampRatio(vacancy.salary.maxUsd / floor - 1);
    reasons.push(`Salario máximo USD ${vacancy.salary.maxUsd} frente a tu mínimo USD ${floor}.`);
  } else {
    reasons.push('Salario no publicado; se revisa como coincidencia aproximada.');
  }

  const scheduleFit = clampRatio(overlapDays.length / preferences.availability.days.length);
  const freshnessFit = clampRatio(1 - freshness.ageHours / freshness.maxAgeHours);
  reasons.push(freshness.label + '.');

  const score = Math.round(
    (skillFit * 0.4 + salaryFit * 0.2 + scheduleFit * 0.2 + freshnessFit * 0.2) * 100,
  );

  return { failed: [], score, reasons };
}

/**
 * Closeness of a near match, independent of the constraint it failed. It reuses
 * the same signals the scoring path uses (skill overlap, schedule overlap,
 * freshness) so "closest first" is deterministic and explainable.
 */
function proximityScore(vacancy: CachedVacancy, preferences: CandidatePreferences, freshness: Freshness): number {
  const required = vacancy.skills.filter((skill) => skill.required);
  const { covered } = skillOverlap(preferences, vacancy);
  const skillFit = required.length === 0 ? 0.5 : clampRatio(covered.length / required.length);
  const overlapDays = dayOverlap(preferences.availability.days, vacancy.schedule.days);
  const scheduleFit = preferences.availability.days.length === 0
    ? 0
    : clampRatio(overlapDays.length / preferences.availability.days.length);
  const freshnessFit = clampRatio(1 - freshness.ageHours / freshness.maxAgeHours);
  return Math.round((skillFit * 0.5 + scheduleFit * 0.3 + freshnessFit * 0.2) * 100);
}

function buildNearMatch(
  vacancy: CachedVacancy,
  preferences: CandidatePreferences,
  freshness: Freshness,
  blockedBy: ExclusionReason,
  detail: string,
): NearMatch {
  return {
    vacancy,
    freshness,
    provenance: vacancy.provenance,
    blockedBy,
    warnings: [`Bloqueada por ${EXCLUSION_LABELS[blockedBy]}: ${detail}`],
    proximity: proximityScore(vacancy, preferences, freshness),
  };
}

/** One cause entry per exclusion reason present, in the canonical priority order. */
function causesOf(excluded: readonly ExcludedVacancy[]): NoMatchCause[] {
  const byReason = new Map<ExclusionReason, NoMatchCause>();
  for (const entry of excluded) {
    const existing = byReason.get(entry.reason);
    if (existing) existing.count += 1;
    else byReason.set(entry.reason, { reason: entry.reason, count: 1, detail: entry.detail });
  }
  return EXCLUSION_ORDER.filter((reason) => byReason.has(reason)).map((reason) => byReason.get(reason)!);
}

function explainNoMatch(causes: readonly NoMatchCause[]): string {
  if (causes.length === 0) {
    return 'No hay vacantes en el catálogo para evaluar.';
  }
  const named = causes.map((cause) => `${EXCLUSION_LABELS[cause.reason]} (${cause.count})`).join(', ');
  return `Ninguna vacante resultó viable. Causas: ${named}. Las restricciones declaradas no se relajan automáticamente.`;
}

/**
 * Deterministic preference-driven exploration over the cached catalogue.
 *
 * Vacancies older than `maxAgeHours` (72 by default) are excluded before any
 * compatibility check, so they can never be recommended automatically. Every
 * returned match carries its provenance and freshness; every exclusion carries
 * a Spanish reason and the full list of constraints it failed. When nothing is
 * viable, the result explains each cause and lists near matches (vacancies
 * blocked by exactly one declared constraint). The result is Ajv-validated
 * before it leaves the seam.
 */
export function exploreVacancies(
  preferences: CandidatePreferences,
  catalog: VacancyCatalog,
  options: ExplorationQueryOptions = {},
): ExplorationResult {
  assertCandidatePreferences(preferences);
  const nowFn = options.now ?? (() => new Date());
  const now = nowFn();
  const maxAgeHours = options.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
  const nearMatchLimit = options.nearMatchLimit ?? DEFAULT_NEAR_MATCH_LIMIT;

  const matches: VacancyMatch[] = [];
  const excluded: ExcludedVacancy[] = [];
  const nearMatchCandidates: NearMatch[] = [];
  let stale = 0;

  for (const vacancy of catalog.all()) {
    const freshness = computeFreshness(vacancy, { now, maxAgeHours });
    if (freshness.stale) {
      stale += 1;
      excluded.push({ jobId: vacancy.jobId, reason: 'stale', detail: freshness.label, failedConstraints: ['stale'], freshness });
      continue;
    }

    const outcome = evaluate(vacancy, preferences, freshness);
    if (outcome.reason) {
      excluded.push({
        jobId: vacancy.jobId,
        reason: outcome.reason,
        detail: outcome.detail ?? 'No compatible.',
        failedConstraints: outcome.failed,
        freshness,
      });
      if (outcome.failed.length === 1) {
        nearMatchCandidates.push(
          buildNearMatch(vacancy, preferences, freshness, outcome.reason, outcome.detail ?? 'No compatible.'),
        );
      }
      continue;
    }

    matches.push({
      vacancy,
      freshness,
      provenance: vacancy.provenance,
      matchScore: outcome.score,
      matchReasons: outcome.reasons,
    });
  }

  matches.sort((a, b) => {
    if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
    if (a.freshness.ageHours !== b.freshness.ageHours) return a.freshness.ageHours - b.freshness.ageHours;
    return a.vacancy.jobId < b.vacancy.jobId ? -1 : a.vacancy.jobId > b.vacancy.jobId ? 1 : 0;
  });
  excluded.sort((a, b) => (a.jobId < b.jobId ? -1 : a.jobId > b.jobId ? 1 : 0));

  nearMatchCandidates.sort((a, b) => {
    if (a.proximity !== b.proximity) return b.proximity - a.proximity;
    return a.vacancy.jobId < b.vacancy.jobId ? -1 : a.vacancy.jobId > b.vacancy.jobId ? 1 : 0;
  });

  const limited = options.limit !== undefined ? matches.slice(0, options.limit) : matches;

  const result: ExplorationResult = {
    schemaVersion: '1.0.0',
    candidateId: preferences.candidate_id,
    generatedAt: now.toISOString(),
    preferences,
    matches: limited,
    excluded,
    summary: {
      considered: catalog.size(),
      matched: limited.length,
      excluded: excluded.length,
      stale,
    },
  };

  // T-E: gate on the *unsliced* match count so `limit: 0` cannot fabricate a no-match.
  if (matches.length === 0) {
    const causes = causesOf(excluded);
    result.noMatch = {
      explanation: explainNoMatch(causes),
      causes,
      nearMatches: nearMatchCandidates.slice(0, nearMatchLimit),
      roadmapRequested: preferences.willing_to_train,
    };
  }

  assertExplorationResult(result);
  return result;
}
