import { describe, expect, it } from "vitest";
import { inferKind, parseLevel, parseVacancyText, slugify } from "../text";

describe("inferKind", () => {
  it("classifies languages, experience, education, and skills", () => {
    expect(inferKind("ingles b2")).toBe("language");
    expect(inferKind("experiencia minima de 6 meses")).toBe("experience");
    expect(inferKind("licenciatura en administracion")).toBe("education");
    expect(inferKind("atencion al cliente")).toBe("skill");
    expect(inferKind("buena presencia")).toBe("physical");
  });
});

describe("parseLevel", () => {
  it("reads an explicit numeric level", () => {
    expect(parseLevel("excel nivel 3")).toBe(3);
  });

  it("maps CEFR and descriptive proficiency", () => {
    expect(parseLevel("ingles b2")).toBe(3);
    expect(parseLevel("excel intermedio")).toBe(2);
    expect(parseLevel("excel avanzado")).toBe(3);
    expect(parseLevel("ingles nativo")).toBe(4);
  });

  it("returns null when unspecified", () => {
    expect(parseLevel("atencion al cliente")).toBeNull();
  });
});

describe("slugify", () => {
  it("produces a stable ascii slug", () => {
    expect(slugify("Soporte Técnico Junior")).toBe("soporte-tecnico-junior");
  });

  it("falls back for empty input", () => {
    expect(slugify("   ")).toBe("vacancy");
  });
});

describe("parseVacancyText", () => {
  it("separates mandatory and desirable sections from bullet lines", () => {
    const parsed = parseVacancyText(
      [
        "Vendedor de Mostrador",
        "Requisitos:",
        "- Experiencia en ventas",
        "- Manejo de caja",
        "Deseables:",
        "- Inglés B1",
      ].join("\n"),
    );

    expect(parsed.title).toBe("Vendedor de Mostrador");
    expect(parsed.mandatory.map((item) => item.text)).toEqual([
      "Experiencia en ventas",
      "Manejo de caja",
    ]);
    expect(parsed.desirable.map((item) => item.text)).toEqual(["Inglés B1"]);
  });

  it("recovers sections from single-line extractor output", () => {
    const parsed = parseVacancyText(
      "Vendedor de Mostrador Requisitos: - Experiencia en ventas - Manejo de caja - Buena presencia Deseables: - Ingles B1",
    );

    expect(parsed.title).toBe("Vendedor de Mostrador");
    expect(parsed.mandatory.map((item) => item.text)).toEqual([
      "Experiencia en ventas",
      "Manejo de caja",
      "Buena presencia",
    ]);
    expect(parsed.desirable.map((item) => item.text)).toEqual(["Ingles B1"]);
  });

  it("ignores responsibilities prose while a section is open elsewhere", () => {
    const parsed = parseVacancyText(
      [
        "Funciones:",
        "- Atender a los clientes en el salón",
        "Requisitos:",
        "- Atención al cliente",
      ].join("\n"),
    );

    expect(parsed.mandatory.map((item) => item.text)).toEqual(["Atención al cliente"]);
  });
});
