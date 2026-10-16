import {
  PANAMA_SKILL_TAXONOMY,
  matchSkill,
  normalizeText,
  validateJobRequirements,
  type Alert,
  type CanonicalSkill,
  type JobRequirements,
  type Requirement,
  type RequirementCategory,
  type ReviewItem,
  type SkillTaxonomy,
  type VacancyStatus,
} from "@puente/domain";
import { InvalidJobRequirementsError, VacancyInputError } from "./errors";
import { extractVacancy } from "./extract";
import { classifyRequirement } from "./fairness";
import { inferKind, parseLevel, slugify } from "./text";
import type {
  ExtractedVacancy,
  NormalizeVacancyOptions,
  RawRequirementInput,
  VacancyInput,
} from "./types";

interface FlatRequirement {
  category: RequirementCategory;
  raw: RawRequirementInput;
}

function buildCanonical(text: string, taxonomy: SkillTaxonomy): CanonicalSkill {
  return matchSkill(text, taxonomy);
}

function buildRequirements(
  extracted: ExtractedVacancy,
  taxonomy: SkillTaxonomy,
): Requirement[] {
  const flat: FlatRequirement[] = [
    ...extracted.mandatory.map((raw) => ({ category: "mandatory" as const, raw })),
    ...extracted.desirable.map((raw) => ({ category: "desirable" as const, raw })),
  ];

  return flat.map((entry, index) => {
    const originalWording = entry.raw.text.trim();
    const normalizedWording = normalizeText(originalWording);
    const requirement: Requirement = {
      id: `req-${index + 1}`,
      kind: entry.raw.kind ?? inferKind(normalizedWording),
      category: entry.category,
      originalWording,
      normalizedWording,
      canonical: buildCanonical(originalWording, taxonomy),
      level: entry.raw.level ?? parseLevel(normalizedWording),
      justification: entry.raw.justification ?? null,
      alertId: null,
      rankingEligible: true,
      excludedFromRanking: false,
    };
    return requirement;
  });
}

interface AppliedFairness {
  alerts: Alert[];
  reviewQueue: ReviewItem[];
  blockingReasons: string[];
}

/**
 * Apply fairness checks to every requirement. Prohibited requirements are
 * blocked; ambiguous and potentially discriminatory requirements are routed to
 * human review. Every flagged requirement is excluded from ranking until a
 * reviewer resolves it (see `resolveReview`).
 */
function applyFairness(requirements: Requirement[]): AppliedFairness {
  const alerts: Alert[] = [];
  const reviewQueue: ReviewItem[] = [];
  const blockingReasons: string[] = [];

  for (const requirement of requirements) {
    const classification = classifyRequirement(
      requirement.originalWording,
      requirement.justification,
    );
    if (classification === null) continue;

    const alertId = `alert-${alerts.length + 1}`;
    const kind = classification.classification;

    alerts.push({
      id: alertId,
      requirementId: requirement.id,
      classification: kind,
      ruleId: classification.ruleId,
      reason: classification.reason,
      matchedText: classification.matchedText,
      disposition: kind === "prohibited" ? "blocked" : "human_review",
      resolved: false,
      resolution: null,
    });

    requirement.alertId = alertId;
    requirement.rankingEligible = false;
    requirement.excludedFromRanking = true;

    if (kind === "prohibited") {
      blockingReasons.push(
        `Prohibited requirement blocked (rule ${classification.ruleId}): "${requirement.originalWording}"`,
      );
    } else {
      reviewQueue.push({
        reviewId: `review-${reviewQueue.length + 1}`,
        requirementId: requirement.id,
        alertId,
        classification: kind,
        status: "pending_human_review",
        reason: classification.reason,
      });
    }
  }

  return { alerts, reviewQueue, blockingReasons };
}

function resolveStatus(
  blockingReasons: string[],
  reviewQueue: ReviewItem[],
): VacancyStatus {
  if (blockingReasons.length > 0) return "blocked";
  if (reviewQueue.length > 0) return "requires_human_review";
  return "accepted";
}

function buildDocument(
  extracted: ExtractedVacancy,
  options: NormalizeVacancyOptions,
): JobRequirements {
  const taxonomy = options.taxonomy ?? PANAMA_SKILL_TAXONOMY;
  const now = options.now ?? (() => new Date());
  const capturedAt = options.capturedAt ?? now().toISOString();

  const vacancyId =
    options.vacancyId?.trim() ||
    extracted.vacancyId?.trim() ||
    slugify(extracted.title);

  if (vacancyId.length === 0) {
    throw new VacancyInputError("Unable to derive a vacancy id from the input.");
  }

  const requirements = buildRequirements(extracted, taxonomy);
  const { alerts, reviewQueue, blockingReasons } = applyFairness(requirements);
  const status = resolveStatus(blockingReasons, reviewQueue);

  return {
    schemaVersion: "1.0.0",
    vacancyId,
    title: extracted.title,
    employer: extracted.employer,
    source: extracted.source,
    capturedAt,
    locale: extracted.locale,
    taxonomyVersion: taxonomy.version,
    status,
    location: extracted.location,
    requirements,
    alerts,
    reviewQueue,
    blockingReasons,
    metadata: {
      inputKind: extracted.source,
      extractor: extracted.extractor,
      extractedAt: capturedAt,
      rawText: extracted.rawText,
      requirementCount: requirements.length,
      mandatoryCount: requirements.filter((r) => r.category === "mandatory").length,
      desirableCount: requirements.filter((r) => r.category === "desirable").length,
      alertCount: alerts.length,
      excludedCount: requirements.filter((r) => r.excludedFromRanking).length,
    },
  };
}

/** Normalize an already-extracted vacancy. Synchronous and easy to unit test. */
export function normalizeExtractedVacancy(
  extracted: ExtractedVacancy,
  options: NormalizeVacancyOptions = {},
): JobRequirements {
  const document = buildDocument(extracted, options);
  if (!validateJobRequirements(document)) {
    throw new InvalidJobRequirementsError(validateJobRequirements.errors);
  }
  return document;
}

/**
 * Accept manual, JSON, PDF, or image vacancy input and produce a validated
 * `JobRequirements` document with fairness alerts, human-review routing, and
 * ranking eligibility.
 */
export async function normalizeVacancy(
  input: VacancyInput,
  options: NormalizeVacancyOptions = {},
): Promise<JobRequirements> {
  const extracted = await extractVacancy(input, options.extraction);
  return normalizeExtractedVacancy(extracted, options);
}
