import { afterEach, describe, expect, it, vi } from "vitest";
import { ExtractionUnavailableError, VacancyInputError } from "../errors";
import { extractJson, extractStructured, normalizeLocation } from "../extract";
import { defaultImageExtractor, defaultPdfExtractor } from "../extract/adapters";

const { recognize } = vi.hoisted(() => ({ recognize: vi.fn() }));
vi.mock("tesseract.js", () => ({ recognize }));

describe("extractStructured", () => {
  it("coerces string requirements and infers kind and level", () => {
    const extracted = extractStructured(
      {
        title: "Soporte Técnico",
        mandatory: ["Inglés B2"],
        desirable: ["Excel avanzado"],
      },
      "manual",
    );

    expect(extracted.mandatory[0]?.text).toBe("Inglés B2");
    expect(extracted.mandatory[0]?.kind).toBe("language");
    expect(extracted.mandatory[0]?.level).toBe(3);
    expect(extracted.desirable[0]?.level).toBe(3);
  });

  it("parses a rawText payload when no buckets are provided", () => {
    const extracted = extractStructured(
      {
        title: "Vendedor",
        rawText: "Requisitos:\n- Manejo de caja\nDeseables:\n- Inglés B1",
      },
      "manual",
    );

    expect(extracted.mandatory.map((r) => r.text)).toEqual(["Manejo de caja"]);
    expect(extracted.desirable.map((r) => r.text)).toEqual(["Inglés B1"]);
  });

  it("requires a title", () => {
    expect(() =>
      extractStructured({ title: "" } as never, "manual"),
    ).toThrow(VacancyInputError);
  });
});

describe("extractJson", () => {
  it("accepts a title/description payload", () => {
    const extracted = extractJson({
      title: "Cajero",
      description: "Requisitos:\n- Manejo de caja",
    });
    expect(extracted.source).toBe("json");
    expect(extracted.mandatory.map((r) => r.text)).toEqual(["Manejo de caja"]);
  });

  it("rejects arrays", () => {
    expect(() => extractJson([] as unknown as object)).toThrow(VacancyInputError);
  });

  it("rejects entries without a title or description", () => {
    expect(() => extractJson({ employer: "X" })).toThrow(VacancyInputError);
  });
});

describe("normalizeLocation", () => {
  it("defaults to Panama with null detail", () => {
    expect(normalizeLocation(undefined)).toEqual({
      country: "PA",
      province: null,
      district: null,
      raw: null,
    });
  });

  it("keeps a raw string location", () => {
    expect(normalizeLocation("Ciudad de Panamá").raw).toBe("Ciudad de Panamá");
  });

  it("merges a partial location", () => {
    expect(normalizeLocation({ province: "Panamá Oeste" })).toEqual({
      country: "PA",
      province: "Panamá Oeste",
      district: null,
      raw: null,
    });
  });
});

describe("default adapters", () => {
  it("expose PDF and image extraction functions", () => {
    expect(typeof defaultPdfExtractor).toBe("function");
    expect(typeof defaultImageExtractor).toBe("function");
  });

  it("wrap an unreadable PDF as an ExtractionUnavailableError", async () => {
    await expect(
      defaultPdfExtractor(new Uint8Array([1, 2, 3, 4])),
    ).rejects.toBeInstanceOf(ExtractionUnavailableError);
  });
});

describe("defaultImageExtractor", () => {
  afterEach(() => {
    recognize.mockReset();
  });

  it("runs OCR and returns the recognized text", async () => {
    recognize.mockResolvedValue({
      data: { text: "Recepcionista\nRequisitos:\n- Atención al cliente" },
    });

    const result = await defaultImageExtractor(
      new Uint8Array([1, 2, 3]),
      "image/png",
      "cv.png",
    );

    expect(recognize).toHaveBeenCalledOnce();
    expect(result.extractor).toBe("tesseract.js");
    expect(result.text).toContain("Atención al cliente");
  });

  it("wraps an OCR failure as an ExtractionUnavailableError", async () => {
    recognize.mockRejectedValue(new Error("tesseract unavailable"));

    await expect(
      defaultImageExtractor(new Uint8Array([9])),
    ).rejects.toBeInstanceOf(ExtractionUnavailableError);
  });
});
