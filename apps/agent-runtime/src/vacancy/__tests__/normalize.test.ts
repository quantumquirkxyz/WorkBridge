import { describe, expect, it } from "vitest";
import { validateJobRequirements } from "@puente/domain";
import { ExtractionUnavailableError, VacancyInputError } from "../errors";
import { normalizeVacancy } from "../normalize";
import type { RawVacancy } from "../types";
import { loadBinaryFixture, loadVacancyFixture } from "../../../test/load-fixture";

const now = () => new Date("2026-10-16T12:00:00.000Z");
const options = { now } as const;

const objective = loadVacancyFixture<RawVacancy>("objective.json");
const goodAppearance = loadVacancyFixture<RawVacancy>("good-appearance.json");
const ageLimit = loadVacancyFixture<RawVacancy>("age-limit.json");
const mixed = loadVacancyFixture<RawVacancy>("mixed.json");
const freeText = loadVacancyFixture<Record<string, unknown>>("free-text.json");

describe("normalizeVacancy — objective requirements", () => {
  it("produces a valid accepted document with no alerts", async () => {
    const result = await normalizeVacancy({ kind: "manual", vacancy: objective }, options);

    expect(result.status).toBe("accepted");
    expect(result.alerts).toEqual([]);
    expect(result.blockingReasons).toEqual([]);
    expect(result.reviewQueue).toEqual([]);
    expect(result.capturedAt).toBe("2026-10-16T12:00:00.000Z");
    expect(validateJobRequirements(result)).toBe(true);
  });

  it("separates mandatory and desirable requirements", async () => {
    const result = await normalizeVacancy({ kind: "manual", vacancy: objective }, options);

    expect(result.metadata.mandatoryCount).toBe(3);
    expect(result.metadata.desirableCount).toBe(2);
    expect(result.requirements.map((r) => r.category)).toEqual([
      "mandatory",
      "mandatory",
      "mandatory",
      "desirable",
      "desirable",
    ]);
  });

  it("maps requirements to the taxonomy while preserving original wording", async () => {
    const result = await normalizeVacancy({ kind: "manual", vacancy: objective }, options);

    const excel = result.requirements.find(
      (r) => r.originalWording === "Manejo de Excel a nivel intermedio",
    );
    expect(excel?.originalWording).toBe("Manejo de Excel a nivel intermedio");
    expect(excel?.canonical.matched).toBe(true);
    expect(excel?.canonical.skillId).toBe("PA-OFF-0002");
    expect(excel?.level).toBe(2);
  });

  it("keeps an explicit level from the structured input", async () => {
    const result = await normalizeVacancy({ kind: "manual", vacancy: objective }, options);
    const english = result.requirements.find((r) => r.originalWording === "Inglés B2");
    expect(english?.kind).toBe("language");
    expect(english?.level).toBe(3);
  });
});

describe("normalizeVacancy — prohibited requirements", () => {
  it("blocks a vacancy with a prohibited requirement", async () => {
    const result = await normalizeVacancy(
      { kind: "manual", vacancy: goodAppearance },
      options,
    );

    expect(result.status).toBe("blocked");
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0]).toContain("fairness.appearance");
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]?.classification).toBe("prohibited");
    expect(result.alerts[0]?.disposition).toBe("blocked");
  });

  it("excludes the flagged requirement from ranking", async () => {
    const result = await normalizeVacancy(
      { kind: "manual", vacancy: goodAppearance },
      options,
    );
    const appearance = result.requirements.find((r) => r.originalWording === "Buena presencia");

    expect(appearance?.alertId).toBe("alert-1");
    expect(appearance?.rankingEligible).toBe(false);
    expect(appearance?.excludedFromRanking).toBe(true);
    expect(result.metadata.excludedCount).toBe(1);
  });
});

describe("normalizeVacancy — potentially discriminatory requirements", () => {
  it("routes an unjustified age limit to human review", async () => {
    const result = await normalizeVacancy({ kind: "manual", vacancy: ageLimit }, options);

    expect(result.status).toBe("requires_human_review");
    expect(result.reviewQueue).toHaveLength(1);
    expect(result.reviewQueue[0]?.classification).toBe("potentially_discriminatory");
    expect(result.reviewQueue[0]?.status).toBe("pending_human_review");
    expect(result.blockingReasons).toEqual([]);
  });

  it("excludes the flagged requirement until the review resolves", async () => {
    const result = await normalizeVacancy({ kind: "manual", vacancy: ageLimit }, options);
    const age = result.requirements.find((r) => r.originalWording === "Edad: entre 20 y 25 años");
    expect(age?.excludedFromRanking).toBe(true);
  });
});

describe("normalizeVacancy — mixed severities", () => {
  it("blocks the vacancy and still queues the reviewable alerts", async () => {
    const result = await normalizeVacancy({ kind: "manual", vacancy: mixed }, options);

    expect(result.status).toBe("blocked");
    expect(result.alerts).toHaveLength(3);
    expect(result.reviewQueue).toHaveLength(2);
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.metadata.excludedCount).toBe(3);
  });
});

describe("normalizeVacancy — input kinds", () => {
  it("accepts a JSON object and reports its source", async () => {
    const result = await normalizeVacancy({ kind: "json", json: objective }, options);
    expect(result.source).toBe("json");
    expect(result.metadata.inputKind).toBe("json");
  });

  it("accepts a JSON string", async () => {
    const result = await normalizeVacancy(
      { kind: "json", json: JSON.stringify(objective) },
      options,
    );
    expect(result.status).toBe("accepted");
  });

  it("parses a description field into requirements", async () => {
    const result = await normalizeVacancy({ kind: "json", json: freeText }, options);

    expect(result.title).toBe("Vendedor de Mostrador");
    expect(result.metadata.mandatoryCount).toBe(3);
    expect(result.metadata.desirableCount).toBe(2);
    expect(result.status).toBe("blocked");
    expect(
      result.requirements.some((r) => r.originalWording === "Buena presencia"),
    ).toBe(true);
  });

  it("accepts PDF input through an injected extraction port", async () => {
    const result = await normalizeVacancy(
      { kind: "pdf", data: new Uint8Array([1, 2, 3]) },
      {
        ...options,
        extraction: {
          pdf: async () => ({
            text: "Analista de Datos\nRequisitos:\n- Excel avanzado\nDeseables:\n- Inglés B2",
            extractor: "fake-pdf",
          }),
        },
      },
    );

    expect(result.metadata.inputKind).toBe("pdf");
    expect(result.metadata.extractor).toBe("fake-pdf");
    expect(result.metadata.mandatoryCount).toBe(1);
    expect(result.metadata.desirableCount).toBe(1);
  });

  it("accepts image input through an injected extraction port", async () => {
    const result = await normalizeVacancy(
      { kind: "image", data: new Uint8Array([9]), mimeType: "image/png" },
      {
        ...options,
        extraction: {
          image: async () => ({
            text: "Recepcionista\nRequisitos:\n- Atención al cliente",
            extractor: "fake-ocr",
          }),
        },
      },
    );

    expect(result.metadata.inputKind).toBe("image");
    expect(result.metadata.extractor).toBe("fake-ocr");
    expect(result.status).toBe("accepted");
  });

  it("extracts and blocks a real PDF fixture through the default adapter", async () => {
    const data = loadBinaryFixture("vendor-counter.pdf");
    const result = await normalizeVacancy({ kind: "pdf", data }, options);

    expect(result.title).toBe("Vendedor de Mostrador");
    expect(result.metadata.extractor).toBe("unpdf");
    expect(result.metadata.mandatoryCount).toBe(3);
    expect(result.status).toBe("blocked");
    expect(
      result.requirements.some((r) => r.originalWording === "Buena presencia"),
    ).toBe(true);
  });
});

describe("normalizeVacancy — input errors", () => {
  it("rejects a structured vacancy without a title", async () => {
    await expect(
      normalizeVacancy({ kind: "manual", vacancy: { title: "  " } }, options),
    ).rejects.toBeInstanceOf(VacancyInputError);
  });

  it("rejects malformed JSON", async () => {
    await expect(
      normalizeVacancy({ kind: "json", json: "{not json" }, options),
    ).rejects.toBeInstanceOf(VacancyInputError);
  });

  it("surfaces an extraction failure as an ExtractionUnavailableError", async () => {
    await expect(
      normalizeVacancy(
        { kind: "image", data: new Uint8Array([0]) },
        {
          ...options,
          extraction: {
            image: async () => {
              throw new ExtractionUnavailableError("image");
            },
          },
        },
      ),
    ).rejects.toBeInstanceOf(ExtractionUnavailableError);
  });
});
