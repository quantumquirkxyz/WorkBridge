import { describe, expect, it } from "vitest";
import {
  CATALOG_MAX_SIZE,
  CATALOG_MIN_SIZE,
  catalogIndex,
  catalogSizeWithinBounds,
  loadCatalog,
} from "../catalog";
import { InvalidTrainingCatalogError } from "../errors";
import { validateTrainingCatalog } from "../validate";
import type { TrainingCatalog } from "../types";
import { loadFixture } from "../../test/load-fixture";

const catalogFixture = loadFixture<TrainingCatalog>("catalog/panama-training-catalog.json");

describe("TrainingCatalog contract", () => {
  it("validates the cached catalog fixture", () => {
    expect(validateTrainingCatalog(catalogFixture)).toBe(true);
  });

  it("holds between 15 and 30 opportunities", () => {
    expect(catalogFixture.opportunities.length).toBeGreaterThanOrEqual(CATALOG_MIN_SIZE);
    expect(catalogFixture.opportunities.length).toBeLessThanOrEqual(CATALOG_MAX_SIZE);
    expect(catalogSizeWithinBounds(catalogFixture)).toBe(true);
  });

  it("loads and indexes the catalog by opportunity id", () => {
    const catalog = loadCatalog(catalogFixture);
    const index = catalogIndex(catalog);
    expect(index.size).toBe(catalog.opportunities.length);
    expect(index.get("TR-001")?.title).toBe("Fundamentos de soporte técnico");
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
