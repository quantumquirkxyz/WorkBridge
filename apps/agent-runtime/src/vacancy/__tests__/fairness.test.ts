import { describe, expect, it } from "vitest";
import { FAIRNESS_RULES, classifyRequirement } from "../fairness";

describe("classifyRequirement", () => {
  it("flags appearance/presence wording as prohibited", () => {
    const result = classifyRequirement("Buena presencia");
    expect(result?.classification).toBe("prohibited");
    expect(result?.ruleId).toBe("fairness.appearance");
    expect(result?.matchedText).toBe("buena presencia");
  });

  it("flags the English equivalent 'good appearance'", () => {
    expect(classifyRequirement("Good appearance required")?.classification).toBe(
      "prohibited",
    );
  });

  it("flags an unjustified age range as potentially discriminatory", () => {
    const result = classifyRequirement("Edad: entre 20 y 25 años");
    expect(result?.classification).toBe("potentially_discriminatory");
    expect(result?.ruleId).toBe("fairness.age");
  });

  it("flags an unjustified maximum age", () => {
    expect(classifyRequirement("Edad máxima 30 años")?.classification).toBe(
      "potentially_discriminatory",
    );
  });

  it("still flags a justified requirement so a reviewer can verify it", () => {
    const result = classifyRequirement(
      "Mayor de 18 años",
      "Requisito legal para venta de alcohol",
    );
    expect(result?.classification).toBe("potentially_discriminatory");
    expect(result?.ruleId).toBe("fairness.age");
    expect(result?.justified).toBe(true);
  });

  it("marks a classification justified only for rules that require one", () => {
    expect(classifyRequirement("Buena presencia")?.justified).toBe(false);
    expect(classifyRequirement("Persona dinámica")?.justified).toBe(false);
  });

  it("flags vague subjective traits as ambiguous", () => {
    const result = classifyRequirement("Persona dinámica y proactiva");
    expect(result?.classification).toBe("ambiguous");
    expect(result?.ruleId).toBe("fairness.subjective_traits");
  });

  it("does not flag objective requirements", () => {
    const objective = [
      "Experiencia mínima de 6 meses en soporte técnico",
      "Manejo de Excel a nivel intermedio",
      "Inglés B2",
      "Atención al cliente",
      "Licencia de conducir vigente",
      "Disponibilidad de lunes a viernes",
    ];
    for (const wording of objective) {
      expect(classifyRequirement(wording), wording).toBeNull();
    }
  });

  it("orders rules from most to least severe", () => {
    expect(FAIRNESS_RULES[0]?.classification).toBe("prohibited");
    expect(FAIRNESS_RULES[FAIRNESS_RULES.length - 1]?.classification).toBe(
      "ambiguous",
    );
  });

  it("returns null for empty wording", () => {
    expect(classifyRequirement("   ")).toBeNull();
  });

  it("is idempotent for the same wording", () => {
    const first = classifyRequirement("Edad: entre 20 y 25 años");
    const second = classifyRequirement("Edad: entre 20 y 25 años");
    expect(second).toEqual(first);
  });

  it("applies the most severe rule when several rules match", () => {
    expect(classifyRequirement("Persona joven y dinámica")?.classification).toBe(
      "potentially_discriminatory",
    );
    expect(
      classifyRequirement("Buena presencia y buena actitud")?.classification,
    ).toBe("prohibited");
  });

  it("classifies each wording independently of its neighbours", () => {
    const wordings = [
      "Buena presencia",
      "Manejo de Excel a nivel intermedio",
      "Persona proactiva",
    ];
    const forward = wordings.map((w) => classifyRequirement(w)?.ruleId ?? null);
    const reversed = [...wordings]
      .reverse()
      .map((w) => classifyRequirement(w)?.ruleId ?? null)
      .reverse();
    expect(reversed).toEqual(forward);
  });
});
