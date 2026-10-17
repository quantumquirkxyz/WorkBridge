import type { VacancySource } from "@workbridge/domain";
import { parseVacancyText } from "../text";
import type {
  ExtractedVacancy,
  VacancyExtractionPort,
  VacancyInput,
} from "../types";
import { defaultImageExtractor } from "./image";
import { defaultPdfExtractor } from "./pdf";
import { DEFAULT_LOCATION, extractJson, extractStructured, normalizeLocation } from "./structured";

function extractedFromText(
  text: string,
  source: Extract<VacancySource, "pdf" | "image">,
  extractor: string,
): ExtractedVacancy {
  const parsed = parseVacancyText(text);
  return {
    source,
    extractor,
    vacancyId: null,
    title: parsed.title ?? "Vacante",
    employer: null,
    employerOrgId: undefined,
    locale: "es-PA",
    location: { ...DEFAULT_LOCATION },
    rawText: text,
    mandatory: parsed.mandatory,
    desirable: parsed.desirable,
  };
}

/**
 * Turn any supported vacancy input into the shared extraction shape. PDF and
 * image inputs go through the injected port so tests stay hermetic; the
 * defaults are the real `unpdf` and `tesseract.js` adapters.
 */
export async function extractVacancy(
  input: VacancyInput,
  ports: VacancyExtractionPort = {},
): Promise<ExtractedVacancy> {
  switch (input.kind) {
    case "manual":
      return extractStructured(input.vacancy, "manual");
    case "json":
      return extractJson(input.json);
    case "pdf": {
      const extractor = ports.pdf ?? defaultPdfExtractor;
      const { text, extractor: name } = await extractor(input.data, input.filename);
      return extractedFromText(text, "pdf", name);
    }
    case "image": {
      const extractor = ports.image ?? defaultImageExtractor;
      const { text, extractor: name } = await extractor(
        input.data,
        input.mimeType,
        input.filename,
      );
      return extractedFromText(text, "image", name);
    }
  }
}

export { extractStructured, extractJson, normalizeLocation, DEFAULT_LOCATION };
