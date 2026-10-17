import { normalizeText } from "@puente/domain";
import type { RequirementKind } from "@puente/domain";
import type { RawRequirementInput } from "./types";

const BULLET = /^\s*(?:[-*•·‣▪►]|\d{1,3}[.)]|[a-z][.)])\s+/i;
const DESIRABLE_HEADING =
  /(deseable|deseados|preferible|valorables?|plus|nice to have|preferred|no excluyente|no obligatorio)/i;
const MANDATORY_HEADING =
  /(requisitos?|requerimientos?|imprescindible|obligatorios?|exigidos?|indispensable|debe cumplir|cualificaciones|mandatory|required|requirements|must have|qualifications|el candidato debe)/i;
const IGNORED_HEADING =
  /^(funciones|responsabilidades|tareas|responsibilities|duties|beneficios|benefits|ofrecemos|about|descripcion|descripción|sobre|acerca)/i;

const KIND_PATTERNS: ReadonlyArray<readonly [RequirementKind, RegExp]> = [
  ["language", /\b(ingles|english|idioma|language|bilingue|bilingual|espanol|spanish)\b/],
  [
    "certification",
    /\b(certificacion|certificado|certificate|certification|licencia|license|acreditacion|accreditation)\b/,
  ],
  [
    "education",
    /\b(licenciatura|bachiller|secundaria|universidad|universitario|titulo|degree|graduado|graduate|diploma|educacion|education)\b/,
  ],
  ["experience", /\b(experiencia|experience|anos|years|trayectoria|background)\b/],
  [
    "physical",
    /\b(presencia|apariencia|aspecto fisico|estatura|altura|peso|talla|fisico|physical|appearance|levantar)\b/,
  ],
];

const CEFR_LEVELS: Record<string, number> = {
  a1: 1,
  a2: 1,
  b1: 2,
  b2: 3,
  c1: 4,
  c2: 4,
};

/** Infer the requirement kind from already-normalized wording. */
export function inferKind(normalizedWording: string): RequirementKind {
  for (const [kind, pattern] of KIND_PATTERNS) {
    if (pattern.test(normalizedWording)) return kind;
  }
  return "skill";
}

/** Best-effort proficiency level (0–4) from wording; `null` when unspecified. */
export function parseLevel(normalizedWording: string): number | null {
  const explicit = /\bnivel\s*([0-4])\b/.exec(normalizedWording);
  if (explicit?.[1]) return Number(explicit[1]);

  const cefr = /\b(a1|a2|b1|b2|c1|c2)\b/.exec(normalizedWording);
  if (cefr?.[1]) {
    const mapped = CEFR_LEVELS[cefr[1]];
    if (mapped !== undefined) return mapped;
  }

  if (/\b(experto|experta|nativo|nativa)\b/.test(normalizedWording)) return 4;
  if (/\b(avanzado|avanzada)\b/.test(normalizedWording)) return 3;
  if (/\b(intermedio|intermedia)\b/.test(normalizedWording)) return 2;
  if (/\b(principiante|basico|basica)\b/.test(normalizedWording)) return 1;
  return null;
}

/** Turn a title or employer string into a stable, filesystem-safe id fragment. */
export function slugify(value: string): string {
  const slug = normalizeText(value).replace(/\s+/g, "-");
  return slug.length > 0 ? slug : "vacancy";
}

function toRequirementInput(line: string): RawRequirementInput {
  const text = line.replace(BULLET, "").trim();
  const normalized = normalizeText(text);
  return { text, kind: inferKind(normalized), level: parseLevel(normalized) };
}

/**
 * Restore line breaks that extractors can drop. PDF and OCR output is often a
 * single run of text containing inline bullets ("… - Manejo de caja - Buena
 * presencia") or section headings ("… Deseables: …").
 */
function preprocess(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(
      /\s+(?=(?:requisitos?|requerimientos?|deseables?|deseados?|preferibles?|requirements?|mandatory|required|preferred|nice to have)\s*:)/gi,
      "\n",
    )
    .replace(/\s+(?=(?:[-*•·‣▪►]|\d{1,3}[.)])\s)/g, "\n");
}

export interface ParsedVacancyText {
  title: string | null;
  mandatory: RawRequirementInput[];
  desirable: RawRequirementInput[];
}

/**
 * Heuristic parser for free text coming from PDF, OCR, or a JSON `description`
 * field. Recognizes mandatory/desirable section headings and bullet items. It
 * is deliberately conservative: prose is ignored unless a section is open, so
 * a job ad's responsibilities section does not become requirements.
 */
export function parseVacancyText(text: string): ParsedVacancyText {
  const lines = preprocess(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let title: string | null = null;
  let mode: "mandatory" | "desirable" | "closed" | null = null;
  let sawHeading = false;
  const mandatory: RawRequirementInput[] = [];
  const desirable: RawRequirementInput[] = [];

  const HEADING_START =
    /^(requisitos?|requerimientos?|mandatory|required|requirements|deseables?|preferred|must have|nice to have|imprescindible|obligatorios?|exigidos?|valorables?)/i;

  for (const line of lines) {
    const isBullet = BULLET.test(line);
    const content = line.replace(BULLET, "").trim();
    const looksLikeHeading =
      !isBullet &&
      content.length <= 80 &&
      (line.endsWith(":") || HEADING_START.test(content));

    if (looksLikeHeading && DESIRABLE_HEADING.test(line)) {
      mode = "desirable";
      sawHeading = true;
      continue;
    }
    if (looksLikeHeading && MANDATORY_HEADING.test(line)) {
      mode = "mandatory";
      sawHeading = true;
      continue;
    }
    if (IGNORED_HEADING.test(content)) {
      mode = "closed";
      sawHeading = true;
      continue;
    }

    if (title === null && !isBullet && content.length > 3 && !looksLikeHeading) {
      title = content;
      continue;
    }

    if (mode === "closed") continue;

    if (mode === null) {
      if (isBullet) {
        mandatory.push(toRequirementInput(line));
      }
      continue;
    }

    if (content.length < 2) continue;
    if (mode === "mandatory") mandatory.push(toRequirementInput(line));
    else desirable.push(toRequirementInput(line));
  }

  // Fallback: long bullet-free text with no recognizable sections at all.
  if (!sawHeading && mandatory.length === 0 && desirable.length === 0) {
    for (const line of lines) {
      const content = line.replace(BULLET, "").trim();
      if (content.length >= 15 && content !== title) {
        mandatory.push(toRequirementInput(line));
      }
    }
  }

  return { title, mandatory, desirable };
}
