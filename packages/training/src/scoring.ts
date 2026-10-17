import { clampScore, createRoutingPort, type RoutingPort } from "@puente/solver";
import type {
  GapContribution,
  OpportunitySchedule,
  TrainingGap,
  TrainingOpportunity,
  TrainingPreferences,
} from "./types";
import { gapDeficit, gapLabelForContribution } from "./gaps";

export interface DimensionScore {
  rawScore: number;
  reasons: string[];
  commuteMinutes?: number;
}

export interface GapCoverageScore extends DimensionScore {
  coveredGaps: GapContribution[];
  coveredDeficit: number;
}

/** Neutral score when geography cannot be estimated deterministically. */
export const NEUTRAL_GEOGRAPHY_SCORE = 70;
/** Lowest cost score, reached when the cost equals the candidate's ceiling. */
export const COST_CEILING_SCORE = 60;
/** Reference duration used when no `maxTotalHours` ceiling is set. */
export const DURATION_REFERENCE_HOURS = 200;
/** Seats that saturate the availability dimension. */
export const SEATS_SATURATION = 5;
/** Score for a usable modality outside the candidate's preference. */
export const NON_PREFERRED_MODALITY_SCORE = 50;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** Highest level an opportunity can reach for a skill; 0 when it does not cover it. */
export function coveredSkillLevel(
  opportunity: TrainingOpportunity,
  skillId: string,
): number {
  let best = 0;
  for (const skill of opportunity.coveredSkills) {
    if (skill.skillId === skillId && skill.level > best) best = skill.level;
  }
  return best;
}

/**
 * Gap coverage: the fraction of the candidate's outstanding levels that this
 * opportunity can address. Partial coverage (a level below the requirement)
 * still contributes, so short courses are not discarded outright.
 */
export function gapCoverageScore(
  opportunity: TrainingOpportunity,
  gaps: readonly TrainingGap[],
): GapCoverageScore {
  const totalDeficit = gaps.reduce((sum, gap) => sum + gapDeficit(gap), 0);
  let coveredDeficit = 0;
  const coveredGaps: GapContribution[] = [];

  for (const gap of gaps) {
    const level = coveredSkillLevel(opportunity, gap.skillId);
    const room = gap.requiredLevel - gap.currentLevel;
    const added = Math.max(0, Math.min(level - gap.currentLevel, room));
    if (added > 0) {
      coveredDeficit += added;
      coveredGaps.push({ skillId: gap.skillId, addedLevel: added });
    }
  }

  const reasons: string[] = [];
  if (totalDeficit === 0) {
    reasons.push("No hay brechas pendientes por cubrir.");
  } else if (coveredDeficit > 0) {
    const labels = coveredGaps.map((contribution) =>
      gapLabelForContribution(gaps, contribution),
    );
    reasons.push(
      `Cubre ${coveredDeficit} de ${totalDeficit} niveles pendientes: ${labels.join(", ")}.`,
    );
  } else {
    reasons.push("No cubre ninguna brecha pendiente.");
  }

  return {
    rawScore: totalDeficit > 0 ? clampScore((coveredDeficit / totalDeficit) * 100) : 0,
    reasons,
    coveredGaps,
    coveredDeficit,
  };
}

/** Target specializations this opportunity matches; empty when none match. */
export function specializationOverlap(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
): string[] {
  const targets = preferences.specializations;
  return opportunity.specializations.filter((slug) => targets.includes(slug));
}

/** Specialization fit: share of the candidate's target areas this covers. */
export function specializationScore(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
): DimensionScore {
  const targets = preferences.specializations;
  if (targets.length === 0) {
    return {
      rawScore: 100,
      reasons: ["Sin especialización objetivo: no restringe el ordenamiento."],
    };
  }
  const overlap = specializationOverlap(opportunity, preferences);
  const rawScore = clampScore((overlap.length / targets.length) * 100);
  return {
    rawScore,
    reasons: [
      overlap.length > 0
        ? `Afinidad con tu especialización objetivo (${overlap.join(", ")}).`
        : `No coincide con tu especialización objetivo (${targets.join(", ")}).`,
    ],
  };
}

/** Cost fit: free is best; the ceiling scores `COST_CEILING_SCORE`; over is 0. */
export function costScore(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
): DimensionScore {
  const maxCost = preferences.maxCostUsd;
  if (maxCost === undefined) {
    return { rawScore: 100, reasons: ["Sin límite de costo definido."] };
  }
  if (opportunity.costUsd <= 0) {
    return { rawScore: 100, reasons: ["La oportunidad es gratuita."] };
  }
  if (maxCost <= 0 || opportunity.costUsd > maxCost) {
    return {
      rawScore: 0,
      reasons: [`Cuesta USD ${opportunity.costUsd}, por encima de tu límite de USD ${maxCost}.`],
    };
  }
  const ratio = opportunity.costUsd / maxCost;
  const rawScore = clampScore(100 - (100 - COST_CEILING_SCORE) * ratio);
  return {
    rawScore,
    reasons: [`Cuesta USD ${opportunity.costUsd}, dentro de tu límite de USD ${maxCost}.`],
  };
}

/** Duration fit: shorter is better relative to the effort ceiling. */
export function durationScore(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
): DimensionScore {
  const ceiling = preferences.maxTotalHours;
  if (ceiling === undefined) {
    return {
      rawScore: clampScore(100 - 50 * (opportunity.durationHours / DURATION_REFERENCE_HOURS)),
      reasons: [`Duración de ${opportunity.durationHours} h.`],
    };
  }
  if (ceiling <= 0) {
    // A zero ceiling means a zero budget, consistently with `selectRoadmap`.
    return {
      rawScore: opportunity.durationHours > 0 ? 0 : 100,
      reasons: ["Tu límite de duración es cero; solo caben oportunidades de 0 h."],
    };
  }
  const ratio = opportunity.durationHours / ceiling;
  const rawScore = clampScore(100 - 50 * ratio);
  return {
    rawScore,
    reasons: [`Duración de ${opportunity.durationHours} h.`],
  };
}

/** Modality fit: preferred modalities score 100, other usable ones 50. */
export function modalityScore(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
): DimensionScore {
  const preferred = preferences.preferredModalities;
  const label = modalityLabelEs(opportunity.modality);
  if (!preferred || preferred.length === 0) {
    return { rawScore: 100, reasons: [`Modalidad ${label}.`] };
  }
  if (preferred.includes(opportunity.modality)) {
    return { rawScore: 100, reasons: [`Modalidad ${label}, entre tus preferidas.`] };
  }
  return {
    rawScore: NON_PREFERRED_MODALITY_SCORE,
    reasons: [`Modalidad ${label}, fuera de tus preferidas.`],
  };
}

/** Geography: online is free; on-site uses the shared routing port. */
export async function geographyScore(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
  routing: RoutingPort = createRoutingPort(),
): Promise<DimensionScore> {
  if (opportunity.modality === "online") {
    return { rawScore: 100, reasons: ["La oportunidad es en línea; sin traslado."] };
  }
  const home = preferences.home;
  const maxCommute = preferences.maxCommuteMinutes;
  if (!opportunity.location || !home || maxCommute === undefined) {
    return {
      rawScore: NEUTRAL_GEOGRAPHY_SCORE,
      reasons: ["No se pudo estimar el traslado; se aplica un puntaje neutral."],
    };
  }
  if (maxCommute <= 0) {
    return { rawScore: 0, reasons: ["Sin presupuesto de traslado."] };
  }
  const estimate = await routing.route({
    origin: home,
    destination: opportunity.location,
    mode: "driving",
  });
  const ratio = estimate.commuteMinutes / maxCommute;
  const rawScore = clampScore(100 - 55 * ratio);
  return {
    rawScore,
    commuteMinutes: estimate.commuteMinutes,
    reasons: [
      `A unos ${estimate.distanceKm.toFixed(1)} km y ${estimate.commuteMinutes} min de tu ubicación (límite ${maxCommute} min; fuente ${estimate.source}).`,
    ],
  };
}

export interface ScheduleCoverage {
  /** Fraction of the opportunity's weekly window the candidate covers, 0–1. */
  coverage: number;
  missingDays: number[];
}

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

/** Weekly window coverage shared by the schedule dimension and its constraint. */
export function scheduleCoverage(
  schedule: OpportunitySchedule,
  availabilityWindow: OpportunitySchedule,
): ScheduleCoverage {
  const perDayMinutes = Math.max(0, schedule.endMinute - schedule.startMinute);
  const totalMinutes = schedule.days.length * perDayMinutes;
  let covered = 0;
  const missingDays: number[] = [];
  for (const day of schedule.days) {
    if (!availabilityWindow.days.includes(day)) {
      missingDays.push(day);
      continue;
    }
    covered += overlapMinutes(
      availabilityWindow.startMinute,
      availabilityWindow.endMinute,
      schedule.startMinute,
      schedule.endMinute,
    );
  }
  const coverage = totalMinutes > 0 ? clamp01(covered / totalMinutes) : 1;
  return { coverage, missingDays };
}

/** Schedule fit: full coverage is best; self-paced or unknown is non-restrictive. */
export function scheduleScore(
  opportunity: TrainingOpportunity,
  preferences: TrainingPreferences,
): DimensionScore {
  const availabilityWindow = preferences.availabilityWindow;
  if (!opportunity.schedule || !availabilityWindow) {
    return {
      rawScore: 100,
      reasons: ["Horario flexible o no especificado."],
    };
  }
  const { coverage, missingDays } = scheduleCoverage(opportunity.schedule, availabilityWindow);
  const reasons: string[] = [
    coverage >= 1
      ? "Tu disponibilidad cubre el horario completo."
      : `Tu disponibilidad cubre el ${Math.round(coverage * 100)}% del horario.`,
  ];
  if (missingDays.length > 0) {
    reasons.push(`Días no disponibles: ${missingDays.join(", ")}.`);
  }
  return { rawScore: clampScore(coverage * 100), reasons };
}

/** Availability fit: more open seats is better; zero seats is unusable. */
export function availabilityScore(opportunity: TrainingOpportunity): DimensionScore {
  if (opportunity.seatsAvailable < 1) {
    return { rawScore: 0, reasons: ["Sin cupos disponibles."] };
  }
  const ratio = Math.min(1, opportunity.seatsAvailable / SEATS_SATURATION);
  return {
    rawScore: clampScore(ratio * 100),
    reasons: [`${opportunity.seatsAvailable} cupo(s) disponible(s).`],
  };
}

/** Credential relevance: the employability value of the resulting credential. */
export function credentialScore(opportunity: TrainingOpportunity): DimensionScore {
  const percent = Math.round(opportunity.credentialRelevance * 100);
  return {
    rawScore: clampScore(percent),
    reasons: [`Relevancia de la credencial: ${percent}%.`],
  };
}

const MODALITY_LABEL_ES: Readonly<Record<TrainingOpportunity["modality"], string>> = {
  online: "en línea",
  onsite: "presencial",
  hybrid: "híbrida",
};

const TYPE_LABEL_ES: Readonly<Record<TrainingOpportunity["type"], string>> = {
  course: "Curso",
  certification: "Certificación",
  project: "Proyecto",
  internship: "Pasantía",
};

export function modalityLabelEs(modality: TrainingOpportunity["modality"]): string {
  return MODALITY_LABEL_ES[modality];
}

export function typeLabelEs(type: TrainingOpportunity["type"]): string {
  return TYPE_LABEL_ES[type];
}
