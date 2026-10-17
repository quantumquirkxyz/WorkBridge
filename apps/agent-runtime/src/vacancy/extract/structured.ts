import { normalizeText } from "@puente/domain";
import type { Location } from "@puente/domain";
import { VacancyInputError } from "../errors";
import { inferKind, parseLevel, parseVacancyText } from "../text";
import type {
  ExtractedVacancy,
  RawRequirement,
  RawRequirementInput,
  RawVacancy,
} from "../types";

export const DEFAULT_LOCATION: Location = {
  country: "PA",
  province: null,
  district: null,
  raw: null,
};

function coerceRequirement(raw: RawRequirement): RawRequirementInput | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    if (text.length === 0) return null;
    const normalized = normalizeText(text);
    return { text, kind: inferKind(normalized), level: parseLevel(normalized) };
  }
  if (raw === null || typeof raw !== "object" || typeof raw.text !== "string") {
    return null;
  }
  const text = raw.text.trim();
  if (text.length === 0) return null;
  const normalized = normalizeText(text);
  return {
    text,
    kind: raw.kind ?? inferKind(normalized),
    level: raw.level ?? parseLevel(normalized),
    justification: raw.justification ?? null,
  };
}

function coerceRequirements(raw: RawRequirement[] | undefined): RawRequirementInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(coerceRequirement)
    .filter((requirement): requirement is RawRequirementInput => requirement !== null);
}

export function normalizeLocation(
  location: Partial<Location> | string | null | undefined,
): Location {
  if (location === null || location === undefined) return { ...DEFAULT_LOCATION };
  if (typeof location === "string") {
    return { ...DEFAULT_LOCATION, raw: location };
  }
  return {
    country: location.country ?? DEFAULT_LOCATION.country,
    province: location.province ?? null,
    district: location.district ?? null,
    raw: location.raw ?? null,
  };
}

/**
 * Normalize an already-structured vacancy (manual entry or parsed JSON) into
 * the extraction shape shared with the PDF/image path.
 */
export function extractStructured(
  vacancy: RawVacancy,
  source: "manual" | "json",
): ExtractedVacancy {
  if (
    vacancy === null ||
    typeof vacancy !== "object" ||
    typeof vacancy.title !== "string" ||
    vacancy.title.trim().length === 0
  ) {
    throw new VacancyInputError("A structured vacancy requires a non-empty title.");
  }

  let mandatory = coerceRequirements(vacancy.mandatory);
  let desirable = coerceRequirements(vacancy.desirable);
  const rawText = typeof vacancy.rawText === "string" ? vacancy.rawText : null;

  if (mandatory.length === 0 && desirable.length === 0 && rawText !== null) {
    const parsed = parseVacancyText(rawText);
    mandatory = parsed.mandatory;
    desirable = parsed.desirable;
  }

  return {
    source,
    extractor: "structured",
    vacancyId: vacancy.vacancyId ?? null,
    title: vacancy.title.trim(),
    employer: vacancy.employer ?? null,
    locale: vacancy.locale ?? "es-PA",
    location: normalizeLocation(vacancy.location),
    rawText,
    mandatory,
    desirable,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new VacancyInputError("Vacancy JSON must be an object.");
  }
  return value as Record<string, unknown>;
}

/**
 * Accept either a structured payload (matching `RawVacancy`) or a descriptive
 * payload (`{ title, description }`) whose description is parsed as free text.
 */
export function extractJson(json: string | object): ExtractedVacancy {
  let value: unknown = json;
  if (typeof json === "string") {
    try {
      value = JSON.parse(json);
    } catch (error) {
      throw new VacancyInputError(
        `Vacancy JSON could not be parsed: ${(error as Error).message}`,
      );
    }
  }

  const record = asRecord(value);
  const hasExplicitBuckets =
    Array.isArray(record.mandatory) || Array.isArray(record.desirable);

  if (typeof record.title === "string" && hasExplicitBuckets) {
    return extractStructured(record as unknown as RawVacancy, "json");
  }

  const title = typeof record.title === "string" ? record.title.trim() : "";
  const description =
    typeof record.description === "string"
      ? record.description
      : typeof record.rawText === "string"
        ? record.rawText
        : null;

  if (title.length === 0 && description === null) {
    throw new VacancyInputError(
      "Vacancy JSON must contain a title and requirement buckets, or a title/description pair.",
    );
  }

  return extractStructured(
    {
      vacancyId: typeof record.vacancyId === "string" ? record.vacancyId : undefined,
      title: title.length > 0 ? title : "Vacante",
      employer: typeof record.employer === "string" ? record.employer : null,
      locale: typeof record.locale === "string" ? record.locale : undefined,
      location:
        record.location === undefined
          ? undefined
          : (record.location as Partial<Location> | string | null),
      rawText: description ?? undefined,
    },
    "json",
  );
}
