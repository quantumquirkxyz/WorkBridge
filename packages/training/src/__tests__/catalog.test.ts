import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { InvalidTrainingCatalogError } from "../errors";
import { validateTrainingCatalog } from "../validate";
import type { TrainingCatalog } from "../types";
import { loadFixture } from "../../test/load-fixture";

const catalogFixture = loadFixture<TrainingCatalog>("catalog/panama-training-catalog.json");

describe("TrainingCatalog contract", () => {
  it("validates the cached catalog fixture", () => {
    expect(validateTrainingCatalog(catalogFixture)).toBe(true);
  });

  it("loads the validated catalog snapshot", () => {
    const catalog = loadCatalog(catalogFixture);
    expect(catalog).toBe(catalogFixture);
    expect(catalog.opportunities).toHaveLength(21);
  });

  it("rejects a catalog below the 15-entry lower bound", () => {
    const tooSmall = structuredClone(catalogFixture);
    tooSmall.opportunities = tooSmall.opportunities.slice(0, 14);
    expect(validateTrainingCatalog(tooSmall)).toBe(false);
    expect(() => loadCatalog(tooSmall)).toThrow(InvalidTrainingCatalogError);
  });

  it("rejects a catalog above the 30-entry upper bound", () => {
    const tooLarge = structuredClone(catalogFixture);
    while (tooLarge.opportunities.length <= 30) {
      tooLarge.opportunities.push(structuredClone(tooLarge.opportunities[0]!));
    }
    expect(validateTrainingCatalog(tooLarge)).toBe(false);
    expect(() => loadCatalog(tooLarge)).toThrow(InvalidTrainingCatalogError);
  });

  it("rejects a catalog with a malformed opportunity", () => {
    const broken = structuredClone(catalogFixture) as unknown as {
      opportunities: Record<string, unknown>[];
    };
    delete broken.opportunities[0]!.durationHours;
    expect(validateTrainingCatalog(broken)).toBe(false);
    expect(() => loadCatalog(broken)).toThrow(InvalidTrainingCatalogError);
  });

  it("rejects a negative cost and an out-of-range level", () => {
    const badCost = structuredClone(catalogFixture);
    (badCost.opportunities[0] as { costUsd: number }).costUsd = -1;
    expect(validateTrainingCatalog(badCost)).toBe(false);

    const badLevel = structuredClone(catalogFixture);
    (badLevel.opportunities[0]!.coveredSkills[0] as { level: number }).level = 7;
    expect(validateTrainingCatalog(badLevel)).toBe(false);
  });

  it("exposes the schema id", () => {
    expect(validateTrainingCatalog.schema).toBeDefined();
  });
});
