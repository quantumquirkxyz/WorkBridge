import {
  assertCandidatePreferences,
  relevantSkillIds,
  resolveTargetRoles,
  type CandidatePreferences,
} from '@puente/domain';
import type { VacancyCatalog } from './catalog';
import { assertExplorationResult } from './ajv';
import { DEFAULT_MAX_AGE_HOURS, computeFreshness } from './freshness';
import { CONTRACT_LABELS, EXCLUSION_LABELS, EXCLUSION_ORDER, MODALITY_LABELS } from './labels';
import type {
  CachedVacancy,
  ExcludedVacancy,
  ExclusionReason,
  ExplorationQueryOptions,
  ExplorationResult,
  FailedConstraint,
  Freshness,
  NearMatch,
  NoMatchCause,
  VacancyMatch,
} from './types';

/** Default cap on the number of near matches returned. Named, not magic. */
export const DEFAULT_NEAR_MATCH_LIMIT = 5;

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

/**
 * The four normalised fit signals shared by the match score and the near-match
 * proximity score. Computing them once keeps the two scores from drifting into
 * two different formulas.
 */
interface FitSignals {
  covered: string[];
  missing: string[];
  overlapDays: number[];
  skillFit: number;
  salaryFit: number;
  scheduleFit: number;
  freshnessFit: number;
}

function fitSignals(
  vacancy: CachedVacancy,
  preferences: CandidatePreferences,
  freshness: Freshness,
): FitSignals {
  const required = vacancy.skills.filter((skill) => skill.required);
  const { covered, missing } = skillOverlap(preferences, vacancy);
  const skillFit = required.length === 0 ? 0.5 : clampRatio(covered.length / required.length);

  const overlapDays = dayOverlap(preferences.availability.days, vacancy.schedule.days);
  const scheduleFit =
    preferences.availability.days.length === 0
      ? 0
      : clampRatio(overlapDays.length / preferences.availability.days.length);

  const floor = preferences.minimum_salary_usd;
  const salaryFit =
    floor > 0 && vacancy.salary.maxUsd !== null ? clampRatio(vacancy.salary.maxUsd / floor - 1) : 1;

  const freshnessFit = clampRatio(1 - freshness.ageHours / freshness.maxAgeHours);
  return { covered, missing, overlapDays, skillFit, salaryFit, scheduleFit, freshnessFit };
}

interface FilterOutcome {
  /**
   * Every declared constraint the vacancy failed, in priority order, each with
   * its own explanation. Empty means the vacancy is compatible; a single entry
   * means it is a *near* match; two or more mean it is a plain exclusion.
   */
  failed: FailedConstraint[];
  score: number;
  reasons: string[];
}

function evaluate(
  vacancy: CachedVacancy,
  preferences: CandidatePreferences,
  freshness: Freshness,
): FilterOutcome {
  const reasons: string[] = [];
  const failed: FailedConstraint[] = [];

  // Constraints are collected rather than short-circuited so the caller can tell
  // a single-constraint near match from a vacancy that fails several at once, and
  // so the no-match breakdown can name *every* blocking cause. The first failure
  // remains the primary `reason`, preserving the established priority order.
  if (vacancy.modality !== preferences.modality) {
    failed.push({
      reason: 'modality',
      detail: `Modalidad ${lower(MODALITY_LABELS, vacancy.modality)}; buscas ${lower(MODALITY_LABELS, preferences.modality)}.`,
    });
  }

  const max = preferences.max_location;
  if (max.province && vacancy.location.province && max.province !== vacancy.location.province) {
    failed.push({
      reason: 'location',
      detail: `Ubicada en ${vacancy.location.province}; tu ubicación máxima es ${max.province}.`,
    });
  } else if (max.district && vacancy.location.district && max.district !== vacancy.location.district) {
    failed.push({
      reason: 'location',
      detail: `Ubicada en ${vacancy.location.district}; tu ubicación máxima es ${max.district}.`,
    });
  }

  if (vacancy.contractType === 'internship' && !preferences.willing_to_intern) {
    failed.push({
      reason: 'contract',
      detail: 'Es una pasantía y no indicaste disposición a hacer pasantías.',
    });
  } else if (preferences.contract_types.length > 0 && !preferences.contract_types.includes(vacancy.contractType)) {
    failed.push({
      reason: 'contract',
      detail: `Tipo de contrato ${lower(CONTRACT_LABELS, vacancy.contractType)}, que no está en tu lista.`,
    });
  }

  const overlapDays = dayOverlap(preferences.availability.days, vacancy.schedule.days);
  if (overlapDays.length === 0) {
    failed.push({
      reason: 'schedule',
      detail: 'Los días de la vacante no coinciden con tu disponibilidad.',
    });
  }

  const floor = preferences.minimum_salary_usd;
  if (floor > 0 && vacancy.salary.maxUsd !== null && vacancy.salary.maxUsd < floor) {
    failed.push({
      reason: 'salary',
      detail: `Salario máximo USD ${vacancy.salary.maxUsd}; tu mínimo es USD ${floor}.`,
    });
  }

  if (failed.length > 0) {
    return { failed, score: 0, reasons };
  }

  const signals = fitSignals(vacancy, preferences, freshness);
  reasons.push(`Modalidad ${lower(MODALITY_LABELS, vacancy.modality)} y ubicación compatibles.`);
  reasons.push(`Contrato de ${lower(CONTRACT_LABELS, vacancy.contractType)}.`);
  reasons.push(`Coincidencia de horario en ${signals.overlapDays.length} día(s).`);
  if (signals.covered.length > 0) reasons.push(`Habilidades afines: ${signals.covered.join(', ')}.`);
  if (signals.missing.length > 0) {
    reasons.push(`Por revisar (no en tus puestos objetivo): ${signals.missing.join(', ')}.`);
  }
  if (floor > 0 && vacancy.salary.maxUsd !== null) {
    reasons.push(`Salario máximo USD ${vacancy.salary.maxUsd} frente a tu mínimo USD ${floor}.`);
  } else {
    reasons.push('Salario no publicado; se revisa como coincidencia aproximada.');
  }
  reasons.push(freshness.label + '.');

  const score = Math.round(
    (signals.skillFit * 0.4 +
      signals.salaryFit * 0.2 +
      signals.scheduleFit * 0.2 +
      signals.freshnessFit * 0.2) *
      100,
  );
  return { failed: [], score, reasons };
}

/**
 * Closeness of a near match, independent of the constraint it failed. It reuses
 * the shared fit signals (skill overlap, schedule overlap, freshness) so
 * "closest first" is deterministic and explainable.
 */
function proximityScore(
  vacancy: CachedVacancy,
  preferences: CandidatePreferences,
  freshness: Freshness,
): number {
  const signals = fitSignals(vacancy, preferences, freshness);
  return Math.round((signals.skillFit * 0.5 + signals.scheduleFit * 0.3 + signals.freshnessFit * 0.2) * 100);
}

function buildNearMatch(
  vacancy: CachedVacancy,
  preferences: CandidatePreferences,
  freshness: Freshness,
  blockedBy: FailedConstraint,
): NearMatch {
  return {
    vacancy,
    freshness,
    provenance: vacancy.provenance,
    blockedBy: blockedBy.reason,
    warnings: [`Bloqueada por ${EXCLUSION_LABELS[blockedBy.reason]}: ${blockedBy.detail}`],
    proximity: proximityScore(vacancy, preferences, freshness),
  };
}

/**
 * One cause entry per declared constraint that blocked at least one vacancy, in
 * canonical priority order. A vacancy that failed several constraints contributes
 * to every one of them, so no blocking cause is hidden behind another.
 */
function causesOf(excluded: readonly ExcludedVacancy[]): NoMatchCause[] {
  const byReason = new Map<ExclusionReason, NoMatchCause>();
  for (const entry of excluded) {
    for (const failure of entry.failedConstraints) {
      const existing = byReason.get(failure.reason);
      if (existing) existing.count += 1;
      else byReason.set(failure.reason, { reason: failure.reason, count: 1, detail: failure.detail });
    }
  }
  return EXCLUSION_ORDER.filter((reason) => byReason.has(reason)).map((reason) => byReason.get(reason)!);
}

function explainNoMatch(causes: readonly NoMatchCause[]): string {
  if (causes.length === 0) {
    return 'No hay vacantes en el catálogo para evaluar.';
  }
  const named = causes.map((cause) => `${EXCLUSION_LABELS[cause.reason]} (${cause.count})`).join(', ');
  const onlyStale = causes.length === 1 && causes[0]!.reason === 'stale';
  const closing = onlyStale
    ? 'El catálogo está desactualizado: actualízalo para volver a evaluar.'
    : 'Las restricciones declaradas no se relajan automáticamente.';
  return `Ninguna vacante resultó viable. Causas: ${named}. ${closing}`;
}

/**
 * Deterministic preference-driven exploration over the cached catalogue.
 *
 * Vacancies older than `maxAgeHours` (72 by default) are excluded before any
 * compatibility check, so they can never be recommended automatically. Every
 * returned match carries its provenance and freshness; every exclusion carries
 * a Spanish reason and the full list of constraints it failed. When nothing is
 * viable, the result explains every blocking cause and lists near matches
 * (vacancies blocked by exactly one declared constraint). The result is
 * Ajv-validated before it leaves the seam.
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
      excluded.push({
        jobId: vacancy.jobId,
        reason: 'stale',
        detail: freshness.label,
        failedConstraints: [{ reason: 'stale', detail: freshness.label }],
        freshness,
      });
      continue;
    }

    const outcome = evaluate(vacancy, preferences, freshness);
    const primary = outcome.failed[0];
    if (primary) {
      excluded.push({
        jobId: vacancy.jobId,
        reason: primary.reason,
        detail: primary.detail,
        failedConstraints: outcome.failed,
        freshness,
      });
      if (outcome.failed.length === 1) {
        nearMatchCandidates.push(buildNearMatch(vacancy, preferences, freshness, primary));
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

  // Gate on the *unsliced* match count so `limit: 0` cannot fabricate a no-match,
  // and never emit `noMatch` when a real match exists.
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
