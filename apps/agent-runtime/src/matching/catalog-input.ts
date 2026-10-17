import {
  matchVacancySkill,
  PANAMA_SKILL_TAXONOMY,
  type CandidatePreferences,
  type JobRequirements,
  type Requirement,
} from '@workbridge/domain';
import type { CachedVacancy } from '@workbridge/catalog';
import type { CandidateMatchContext } from './adapt';
import type { VacancyMatchInput } from './service';

function canonicalSkill(skill: CachedVacancy['skills'][number]) {
  if (skill.skillId?.startsWith('PA-')) {
    const taxonomySkill = PANAMA_SKILL_TAXONOMY.skills.find((item) => item.id === skill.skillId);
    if (taxonomySkill) return matchVacancySkill(taxonomySkill.labelEs);
  }
  return matchVacancySkill(skill.skillId ?? skill.labelEs);
}

export function vacancyInput(vacancy: CachedVacancy): VacancyMatchInput {
  const requirements: Requirement[] = vacancy.skills.map((skill, index) => ({
    id: `${vacancy.jobId}-requirement-${index + 1}`,
    kind: 'skill',
    category: skill.required ? 'mandatory' : 'desirable',
    originalWording: skill.labelEs,
    normalizedWording: skill.labelEs,
    canonical: canonicalSkill(skill),
    level: 1,
    justification: null,
    alertId: null,
    rankingEligible: true,
    excludedFromRanking: false,
  }));
  const document: JobRequirements = {
    schemaVersion: '1.0.0',
    vacancyId: vacancy.jobId,
    title: vacancy.title,
    employer: vacancy.company,
    source: 'json',
    capturedAt: vacancy.queriedAt,
    locale: 'es-PA',
    taxonomyVersion: 'panama-v1',
    status: 'accepted',
    location: vacancy.location,
    requirements,
    alerts: [],
    reviewQueue: [],
    blockingReasons: [],
    metadata: {
      inputKind: 'json', extractor: 'catalog', extractedAt: vacancy.queriedAt,
      rawText: null, requirementCount: requirements.length,
      mandatoryCount: requirements.filter((item) => item.category === 'mandatory').length,
      desirableCount: requirements.filter((item) => item.category === 'desirable').length,
      alertCount: 0, excludedCount: 0,
    },
  };
  return {
    document,
    context: {
      schedule: { days: vacancy.schedule.days, startMinute: vacancy.schedule.startMinute, endMinute: vacancy.schedule.endMinute, weeklyHours: vacancy.schedule.weeklyHours },
      salaryMinUsd: vacancy.salary.minUsd ?? 0,
      salaryMaxUsd: vacancy.salary.maxUsd ?? vacancy.salary.minUsd ?? 0,
      capacity: 1,
    },
  };
}

export function candidateContext(preferences: CandidatePreferences): CandidateMatchContext {
  return {
    home: preferences.max_location,
    availability: {
      days: preferences.availability.days,
      startMinute: preferences.availability.start_minute,
      endMinute: preferences.availability.end_minute,
      weeklyHours: preferences.availability.weekly_hours,
    },
    transport: {
      hasVehicle: preferences.transport_modes.includes('driving'),
      maxCommuteMinutes: preferences.max_travel_minutes,
      modes: preferences.transport_modes,
    },
    expectedSalaryUsd: preferences.minimum_salary_usd,
    minimumSalaryUsd: preferences.minimum_salary_usd,
  };
}
