import { assertJobRequirements, normalizeText, type JobRequirements } from "@workbridge/domain";
import { classifyAptitude, type Aptitude, type MatchDecision } from "@workbridge/solver";
import type {
  CandidateNominationInput,
  CandidateNominationResult,
  MatchingService,
} from "../matching";

/** Protected attributes the bias auditor substitutes before re-running the solver. */
export const COUNTERFACTUAL_ATTRIBUTES = ["holder_name", "gender_marker", "corregimiento"] as const;

export type CounterfactualAttribute = (typeof COUNTERFACTUAL_ATTRIBUTES)[number];

export interface BiasAlert {
  id: string;
  reason: string;
  vacancyId: string;
  attribute: CounterfactualAttribute;
}

export interface BiasSubject {
  holderName: string;
  genderMarker: string;
  corregimiento: string;
}

const ATTRIBUTE_LABEL: Record<CounterfactualAttribute, string> = {
  holder_name: "holder name",
  gender_marker: "gender marker",
  corregimiento: "corregimiento",
};

const HOLDER_NAME_ALTERNATE = "Alexis Quintero";
const HOLDER_NAME_ALTERNATE_OTHER = "Valeria Solís";
const CORREGIMIENTO_PROBE = "San Miguelito";
const CORREGIMIENTO_PROBE_OTHER = "Panamá";

const GENDER_ALTERNATE: Record<string, string> = {
  f: "M",
  m: "F",
  femenino: "masculino",
  masculino: "femenino",
  mujer: "hombre",
  hombre: "mujer",
  female: "male",
  male: "female",
  x: "F",
};

export interface BiasAuditResult {
  alerts: BiasAlert[];
  blockedVacancyIds: string[];
  vacancies: JobRequirements[];
  match: CandidateNominationResult | undefined;
}

function cloneNominationInput(input: CandidateNominationInput): CandidateNominationInput {
  return {
    profile: structuredClone(input.profile),
    context: structuredClone(input.context),
    vacancies: input.vacancies.map((vacancy) => ({
      document: structuredClone(vacancy.document),
      context: structuredClone(vacancy.context),
    })),
    ...(input.approvals ? { approvals: structuredClone(input.approvals) } : {}),
  };
}

function replaceLiteral(value: string, from: string, to: string): string {
  if (from.length === 0 || from === to) return value;
  return value.split(from).join(to);
}

/** Rewrite free text the solver does not score. Skill ids stay untouched. */
function rewriteProfileText(
  profile: CandidateNominationInput["profile"],
  visit: (text: string) => string,
): CandidateNominationInput["profile"] {
  return {
    ...profile,
    experiences: profile.experiences.map((experience) => ({
      ...experience,
      title: visit(experience.title),
      description: visit(experience.description),
      ...(experience.organization ? { organization: visit(experience.organization) } : {}),
    })),
    evidence: profile.evidence.map((item) => ({
      ...item,
      claim: visit(item.claim),
    })),
    education: profile.education.map((item) => ({
      ...item,
      institution: visit(item.institution),
      program: visit(item.program),
    })),
    certifications: profile.certifications.map((item) => ({
      ...item,
      name: visit(item.name),
      ...(item.issuer ? { issuer: visit(item.issuer) } : {}),
    })),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function biasSubjectFor(
  input: CandidateNominationInput,
  declaredHolderName?: string,
): BiasSubject {
  const supplied = input.biasSubject;
  return {
    holderName: supplied?.holderName ?? declaredHolderName ?? "titular",
    genderMarker: supplied?.genderMarker ?? "F",
    corregimiento: supplied?.corregimiento ?? input.context.home.district ?? "Panamá",
  };
}

function alternateHolderName(current: string): string {
  return current === HOLDER_NAME_ALTERNATE ? HOLDER_NAME_ALTERNATE_OTHER : HOLDER_NAME_ALTERNATE;
}

function alternateGenderMarker(current: string): string {
  const mapped = GENDER_ALTERNATE[current.trim().toLowerCase()];
  return mapped ?? "X";
}

function alternateCorregimiento(current: string): string {
  return normalizeText(current) === normalizeText(CORREGIMIENTO_PROBE)
    ? CORREGIMIENTO_PROBE_OTHER
    : CORREGIMIENTO_PROBE;
}

/**
 * Build one counterfactual nomination. Holder name and gender marker are
 * substituted in free text; the corregimiento counterfactual changes the
 * candidate's home district, which the solver observes through geocoding.
 */
export function applyCounterfactual(
  input: CandidateNominationInput,
  attribute: CounterfactualAttribute,
  subject: BiasSubject,
): CandidateNominationInput {
  const next = cloneNominationInput(input);
  if (attribute === "holder_name") {
    const alternate = alternateHolderName(subject.holderName);
    next.profile = rewriteProfileText(next.profile, (text) => replaceLiteral(text, subject.holderName, alternate));
    return next;
  }
  if (attribute === "gender_marker") {
    const alternate = alternateGenderMarker(subject.genderMarker);
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(subject.genderMarker)}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    next.profile = rewriteProfileText(next.profile, (text) => text.replace(pattern, alternate));
    return next;
  }
  const district = alternateCorregimiento(subject.corregimiento);
  next.context = {
    ...next.context,
    home: { ...next.context.home, district, raw: district },
  };
  return next;
}

function outcomeOf(decision: MatchDecision): { aptitude: Aptitude; band: Aptitude } {
  return {
    aptitude: decision.aptitude,
    band: classifyAptitude(decision.score),
  };
}

function alertFor(
  vacancyId: string,
  attribute: CounterfactualAttribute,
  before: { aptitude: Aptitude; band: Aptitude },
  after: { aptitude: Aptitude; band: Aptitude },
): BiasAlert {
  return {
    id: `bias-${vacancyId}-${attribute}`,
    vacancyId,
    attribute,
    reason: `Counterfactual ${ATTRIBUTE_LABEL[attribute]} changed aptitude or score band for vacancy ${vacancyId}: aptitude ${before.aptitude} to ${after.aptitude}, score band ${before.band} to ${after.band}.`,
  };
}

export async function auditCounterfactuals(options: {
  input: CandidateNominationInput;
  baseline: CandidateNominationResult;
  matching: MatchingService;
  now: () => Date;
  subject: BiasSubject;
}): Promise<BiasAuditResult> {
  const alerts: BiasAlert[] = [];
  const blocked = new Set<string>();

  for (const attribute of COUNTERFACTUAL_ATTRIBUTES) {
    const mutated = applyCounterfactual(options.input, attribute, options.subject);
    const rerun = await options.matching.nominateForCandidate({
      ...mutated,
      now: options.now,
    });
    for (const baselineDecision of options.baseline.result.decisions) {
      const counterfactual = rerun.result.decisions.find(
        (decision) => decision.vacancyId === baselineDecision.vacancyId,
      );
      if (!counterfactual) continue;
      const before = outcomeOf(baselineDecision);
      const after = outcomeOf(counterfactual);
      if (before.aptitude === after.aptitude && before.band === after.band) continue;
      blocked.add(baselineDecision.vacancyId);
      alerts.push(alertFor(baselineDecision.vacancyId, attribute, before, after));
    }
  }

  const blockedVacancyIds = [...blocked];
  const documents = options.input.vacancies.map((vacancy) => vacancy.document);
  const vacancies = documents.map((document) => {
    if (!blocked.has(document.vacancyId)) return document;
    const reasons = alerts
      .filter((alert) => alert.vacancyId === document.vacancyId)
      .map((alert) => ATTRIBUTE_LABEL[alert.attribute]);
    const next: JobRequirements = {
      ...document,
      status: "blocked",
      blockingReasons: [
        ...document.blockingReasons,
        `Outcome flipped on protected attribute: ${reasons.join(", ")}.`,
      ],
    };
    assertJobRequirements(next);
    return next;
  });

  const match: CandidateNominationResult = {
    ...options.baseline,
    skippedVacancyIds: [
      ...options.baseline.skippedVacancyIds,
      ...blockedVacancyIds.filter((id) => !options.baseline.skippedVacancyIds.includes(id)),
    ],
    result: {
      ...options.baseline.result,
      decisions: options.baseline.result.decisions.filter((decision) => !blocked.has(decision.vacancyId)),
      assignments: options.baseline.result.assignments.filter((decision) => !blocked.has(decision.vacancyId)),
    },
  };

  return { alerts, blockedVacancyIds, vacancies, match };
}
