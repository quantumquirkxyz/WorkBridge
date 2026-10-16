import { normalizeText } from "@puente/domain";
import type { AlertClassification } from "@puente/domain";

export interface FairnessRule {
  id: string;
  classification: AlertClassification;
  /** Regex sources applied to accent-free, lowercase wording. */
  patterns: readonly string[];
  reason: string;
  /** When true, a documented justification suppresses the alert. */
  requiresJustification?: boolean;
}

export const FAIRNESS_RULES_VERSION = "2026.10.0";

const APPEARANCE: FairnessRule = {
  id: "fairness.appearance",
  classification: "prohibited",
  patterns: [
    "\\bbuena presencia\\b",
    "\\bbuena apariencia\\b",
    "\\bexcelente presencia\\b",
    "\\bagradable presencia\\b",
    "\\bbuen aspecto\\b",
    "\\bbuena imagen\\b",
    "\\baspecto fisico\\b",
    "\\bapariencia fisica\\b",
    "\\bpresentacion personal\\b",
    "\\bbuena presentacion\\b",
    "\\bexcelente presentacion\\b",
    "\\bagradable presentacion\\b",
    "\\bgood appearance\\b",
    "\\bgood looking\\b",
    "\\bpleasant appearance\\b",
    "\\bprofessional appearance\\b",
    "\\bphysical appearance\\b",
  ],
  reason:
    "Physical appearance or 'presence' is a personal characteristic and cannot justify a hiring requirement for these roles.",
};

const PROTECTED_TRAITS: FairnessRule = {
  id: "fairness.protected_traits",
  classification: "prohibited",
  patterns: [
    "\\bsexo\\s+(masculino|femenino)\\b",
    "\\bsolo\\s+(hombres|mujeres)\\b",
    "\\bde preferencia\\s+(hombre|mujer)\\b",
    "\\b(male|female)\\s+only\\b",
    "\\bestado civil\\b",
    "\\bsolter[oa]\\b",
    "\\bcasad[oa]\\b",
    "\\bsin hijos\\b",
    "\\bno tener hijos\\b",
    "\\breligion\\b",
    "\\bcatolic[oa]\\b",
    "\\bcristian[oa]\\b",
    "\\braza\\b",
    "\\betnia\\b",
    "\\bembaraz\\w*\\b",
    "\\bafiliacion politica\\b",
    "\\bpartido politico\\b",
    "\\bsin discapacidad\\b",
    "\\bno tener discapacidad\\b",
  ],
  reason:
    "References a protected personal trait (sex, marital status, religion, race, ethnicity, pregnancy, political opinion, or disability).",
};

const AGE: FairnessRule = {
  id: "fairness.age",
  classification: "potentially_discriminatory",
  patterns: [
    "\\bentre\\s+\\d{1,2}\\s*(a|y|-|\\.\\.\\.)\\s*\\d{1,2}\\s*anos\\b",
    "\\bmenor(es)?\\s+de\\s+\\d{1,2}\\s*anos\\b",
    "\\bmayor(es)?\\s+de\\s+\\d{1,2}\\s*anos\\b",
    "\\bedad\\b",
    "\\b\\d{2}\\s*anos\\b(?!\\s*de\\s+(experiencia|servicio|trabajo))",
    "\\bage\\s*\\d{1,2}\\b",
    "\\bbetween\\s+\\d{1,2}\\s+and\\s+\\d{1,2}\\b",
    "\\bunder\\s+\\d{1,2}\\b",
    "\\bover\\s+\\d{1,2}\\b",
    "\\byears?\\s+old\\b",
    "\\bjoven(es)?\\b",
    "\\byoung\\b",
  ],
  reason:
    "An age limit is potentially discriminatory unless a specific legal or job-safety justification is documented.",
  requiresJustification: true,
};

const PHYSICAL_MEASUREMENTS: FairnessRule = {
  id: "fairness.physical_measurements",
  classification: "potentially_discriminatory",
  patterns: [
    "\\bestatura\\b",
    "\\baltura\\b",
    "\\bpeso\\b",
    "\\btalla\\b",
    "\\bcomplexion\\b",
    "\\bheight\\b",
    "\\bweight\\b",
  ],
  reason:
    "A physical measurement is potentially discriminatory unless a documented job-safety justification exists.",
  requiresJustification: true,
};

const PHOTO: FairnessRule = {
  id: "fairness.photo",
  classification: "potentially_discriminatory",
  patterns: [
    "\\bfoto\\b",
    "\\bfotografia\\b",
    "\\bfotografias?\\b",
    "\\bphoto\\b",
    "\\bphotograph\\b",
    "\\bpassport size\\b",
  ],
  reason:
    "Requiring a photo can expose candidates to bias unless it has a documented, job-related justification.",
  requiresJustification: true,
};

const SUBJECTIVE_TRAITS: FairnessRule = {
  id: "fairness.subjective_traits",
  classification: "ambiguous",
  patterns: [
    "\\bdinamic[oa]\\b",
    "\\bproactiv[oa]\\b",
    "\\bbuena actitud\\b",
    "\\bexcelente actitud\\b",
    "\\balta energia\\b",
    "\\bdon de gente\\b",
    "\\bcarisma\\b",
    "\\benergia positiva\\b",
    "\\bmuchas ganas\\b",
    "\\bself starter\\b",
    "\\bself-starter\\b",
    "\\bgo getter\\b",
    "\\bgo-getter\\b",
    "\\bpeople person\\b",
    "\\bpositive attitude\\b",
    "\\bdynamic\\b",
    "\\bproactive\\b",
  ],
  reason:
    "Subjective trait that cannot be objectively verified and must be reviewed before it affects ranking.",
};

/** Ordered from highest to lowest severity; the first match wins. */
export const FAIRNESS_RULES: readonly FairnessRule[] = [
  APPEARANCE,
  PROTECTED_TRAITS,
  AGE,
  PHYSICAL_MEASUREMENTS,
  PHOTO,
  SUBJECTIVE_TRAITS,
];

export interface FairnessClassification {
  classification: AlertClassification;
  ruleId: string;
  reason: string;
  matchedText: string;
}

/**
 * Classify a requirement's wording. Returns `null` when the wording is
 * objective and carries no fairness concern.
 */
export function classifyRequirement(
  wording: string,
  justification?: string | null,
): FairnessClassification | null {
  const normalized = normalizeText(wording);
  if (!normalized) return null;
  const hasJustification =
    typeof justification === "string" && justification.trim().length > 0;

  for (const rule of FAIRNESS_RULES) {
    if (rule.requiresJustification && hasJustification) continue;
    for (const pattern of rule.patterns) {
      const match = new RegExp(pattern).exec(normalized);
      if (match?.[0]) {
        return {
          classification: rule.classification,
          ruleId: rule.id,
          reason: rule.reason,
          matchedText: match[0],
        };
      }
    }
  }
  return null;
}
