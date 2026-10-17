import {
  assertCandidatePreferences,
  relevantSkillIds,
  resolveTargetRoles,
  type CandidatePreferences,
} from '@puente/domain';
import type { VacancyCatalog } from './catalog';
import { assertExplorationResult } from './ajv';
import { DEFAULT_MAX_AGE_HOURS, computeFreshness } from './freshness';
import { CONTRACT_LABELS, MODALITY_LABELS } from './labels';
import type {
  CachedVacancy,
  ExcludedVacancy,
  ExclusionReason,
  ExplorationQueryOptions,
  ExplorationResult,
  Freshness,
  VacancyMatch,
} from './types';

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

interface FilterOutcome {
  reason?: ExclusionReason;
  detail?: string;
  score: number;
  reasons: string[];
}

function evaluate(vacancy: CachedVacancy, preferences: CandidatePreferences, freshness: Freshness): FilterOutcome {
  const reasons: string[] = [];

  if (vacancy.modality !== preferences.modality) {
    return {
      reason: 'modality',
      detail: `Modalidad ${lower(MODALITY_LABELS, vacancy.modality)}; buscas ${lower(MODALITY_LABELS, preferences.modality)}.`,
      score: 0,
      reasons,
    };
  }

  const max = preferences.max_location;
  if (max.province && vacancy.location.province && max.province !== vacancy.location.province) {
    return {
      reason: 'location',
      detail: `Ubicada en ${vacancy.location.province}; tu ubicación máxima es ${max.province}.`,
      score: 0,
      reasons,
    };
  }
  if (max.district && vacancy.location.district && max.district !== vacancy.location.district) {
    return {
      reason: 'location',
      detail: `Ubicada en ${vacancy.location.district}; tu ubicación máxima es ${max.district}.`,
      score: 0,
      reasons,
    };
  }

  const floor = preferences.minimum_salary_usd;

  if (vacancy.contractType === 'internship' && !preferences.willing_to_intern) {
    return {
      reason: 'contract',
      detail: 'Es una pasantía y no indicaste disposición a hacer pasantías.',
      score: 0,
      reasons,
    };
  }
  if (preferences.contract_types.length > 0 && !preferences.contract_types.includes(vacancy.contractType)) {
    return {
      reason: 'contract',
      detail: `Tipo de contrato ${lower(CONTRACT_LABELS, vacancy.contractType)}, que no está en tu lista.`,
      score: 0,
      reasons,
    };
  }

  const overlapDays = dayOverlap(preferences.availability.days, vacancy.schedule.days);
  if (overlapDays.length === 0) {
    return {
      reason: 'schedule',
      detail: 'Los días de la vacante no coinciden con tu disponibilidad.',
      score: 0,
      reasons,
    };
  }

  if (floor > 0 && vacancy.salary.maxUsd !== null && vacancy.salary.maxUsd < floor) {
    return {
      reason: 'salary',
      detail: `Salario máximo USD ${vacancy.salary.maxUsd}; tu mínimo es USD ${floor}.`,
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

  return { score, reasons };
}

/**
 * Deterministic preference-driven exploration over the cached catalogue.
 *
 * Vacancies older than `maxAgeHours` (72 by default) are excluded before any
 * compatibility check, so they can never be recommended automatically. Every
 * returned match carries its provenance and freshness; every exclusion carries
 * a Spanish reason. The result is Ajv-validated before it leaves the seam.
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

  const matches: VacancyMatch[] = [];
  const excluded: ExcludedVacancy[] = [];
  let stale = 0;

  for (const vacancy of catalog.all()) {
    const freshness = computeFreshness(vacancy, { now, maxAgeHours });
    if (freshness.stale) {
      stale += 1;
      excluded.push({ jobId: vacancy.jobId, reason: 'stale', detail: freshness.label, freshness });
      continue;
    }

    const outcome = evaluate(vacancy, preferences, freshness);
    if (outcome.reason) {
      excluded.push({
        jobId: vacancy.jobId,
        reason: outcome.reason,
        detail: outcome.detail ?? 'No compatible.',
        freshness,
      });
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

  assertExplorationResult(result);
  return result;
}
