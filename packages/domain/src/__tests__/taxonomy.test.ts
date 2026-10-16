import { describe, expect, it } from "vitest";
import {
  PANAMA_SKILL_TAXONOMY,
  matchSkill,
  normalizeText,
} from "@puente/domain";

describe("normalizeText", () => {
  it("lowercases, strips accents, and collapses punctuation", () => {
    expect(normalizeText("  Atención al Cliente — Nivel 2 ")).toBe(
      "atencion al cliente nivel 2",
    );
  });
});

describe("matchSkill", () => {
  it("matches a canonical Spanish label exactly", () => {
    const match = matchSkill("Atención al cliente");
    expect(match.matched).toBe(true);
    expect(match.skillId).toBe("PA-CS-0001");
    expect(match.matchStrategy).toBe("exact");
    expect(match.matchConfidence).toBe(1);
    expect(match.taxonomyVersion).toBe(PANAMA_SKILL_TAXONOMY.version);
  });

  it("matches an alias while ignoring accent and case", () => {
    const match = matchSkill("SOPORTE IT");
    expect(match.matched).toBe(true);
    expect(match.skillId).toBe("PA-IT-0001");
    expect(match.matchStrategy).toBe("alias");
  });

  it("fuzzy-matches wording that embeds a skill phrase", () => {
    const match = matchSkill("Conocimiento de redes y conectividad básica");
    expect(match.matched).toBe(true);
    expect(match.skillId).toBe("PA-IT-0003");
    expect(match.matchStrategy).toBe("fuzzy");
    expect(match.matchConfidence).toBeGreaterThanOrEqual(0.8);
    expect(match.matchConfidence).toBeLessThanOrEqual(1);
  });

  it("does not invent a match for unrelated wording", () => {
    const match = matchSkill("Buena presencia");
    expect(match.matched).toBe(false);
    expect(match.skillId).toBeNull();
    expect(match.matchStrategy).toBe("none");
    expect(match.matchConfidence).toBe(0);
  });

  it("handles empty input without throwing", () => {
    expect(matchSkill("   ").matched).toBe(false);
  });
});
