import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { buildRoadmap } from "../roadmap";
import { InvalidRoadmapError, TrainingInputError } from "../errors";
import { assertRoadmap, validateRoadmap } from "../validate";
import { RANKING_DIMENSIONS } from "../weights";
import type { Roadmap, RoadmapRequest, TrainingCatalog } from "../types";
import roadmapSchema from "../schemas/roadmap.schema.json";
import { loadFixture } from "../../test/load-fixture";

const catalog = loadCatalog(loadFixture<TrainingCatalog>("catalog/panama-training-catalog.json"));
const catalogIds = new Set(catalog.opportunities.map((opportunity) => opportunity.opportunityId));
const now = () => new Date("2026-10-16T12:00:00.000Z");

function request(name: string): RoadmapRequest {
  return loadFixture<RoadmapRequest>(`requests/${name}.json`);
}

function build(name: string): Promise<Roadmap> {
  return buildRoadmap(request(name), catalog, { now });
}

function recommendationIds(roadmap: Roadmap): string[] {
  return roadmap.recommendations.map((item) => item.opportunity.opportunityId);
}

describe("buildRoadmap — missing technical skills", () => {
  let roadmap: Roadmap;
  beforeAll(async () => { roadmap = await build("missing-technical"); });

  it("emits a valid Roadmap JSON", async () => {
    expect(validateRoadmap(roadmap)).toBe(true);
  });

  it("recommends the catalogued courses that close the gaps", async () => {
    expect(recommendationIds(roadmap)).toEqual(["TR-002", "TR-001"]);
    expect(roadmap.unresolvedGaps).toEqual([]);
    expect(roadmap.totals).toEqual({
      costUsd: 120,
      durationHours: 110,
      recommendationCount: 2,
      coveredGapCount: 2,
      unresolvedGapCount: 0,
    });
  });

  it("explains each recommendation in Spanish with source and freshness", async () => {
    for (const item of roadmap.recommendations) {
      expect(item.explanationEs).toContain("Fuente:");
      expect(item.explanationEs).toMatch(/actualizados/);
      expect(item.source).toBe(catalog.opportunities[0]!.source);
      expect(item.retrievedAt).toBeDefined();
      expect(item.scoreBreakdown).toHaveLength(9);
    }
    expect(roadmap.recommendations[0]!.explanationEs).toContain("Cubre:");
  });

  it("recommends only catalogued opportunities, embedded verbatim", async () => {
    for (const item of roadmap.recommendations) {
      expect(catalogIds.has(item.opportunity.opportunityId)).toBe(true);
      const catalogEntry = catalog.opportunities.find(
        (opportunity) => opportunity.opportunityId === item.opportunity.opportunityId,
      );
      expect(item.opportunity).toEqual(catalogEntry);
    }
  });

  it("records the constraints and the target vacancy", async () => {
    expect(roadmap.targetVacancyId).toBe("vac-metro-support");
    expect(roadmap.constraints).toEqual({
      specializations: ["it_support"],
      maxCostUsd: null,
      maxTotalHours: null,
    });
    expect(roadmap.catalogVersion).toBe(catalog.catalogVersion);
  });

  it("is deterministic for repeated builds", async () => {
    await expect(build("missing-technical")).resolves.toEqual(roadmap);
  });
});

describe("buildRoadmap — soft-skill gaps", () => {
  let roadmap: Roadmap;
  beforeAll(async () => { roadmap = await build("soft-skill-gaps"); });

  it("produces a valid apt_with_gaps roadmap that closes both soft gaps", async () => {
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.aptitude).toBe("apt_with_gaps");
    expect(recommendationIds(roadmap)).toEqual(["TR-016", "TR-017"]);
    expect(roadmap.unresolvedGaps).toEqual([]);
    expect(roadmap.gaps.every((gap) => gap.kind === "soft")).toBe(true);
  });
});

describe("buildRoadmap — cost limit", () => {
  let roadmap: Roadmap;
  beforeAll(async () => { roadmap = await build("cost-limit"); });

  it("stays within the cost ceiling and reports the excluded option", async () => {
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(recommendationIds(roadmap)).toEqual(["TR-006"]);
    expect(roadmap.totals.costUsd).toBeLessThanOrEqual(10);
    expect(roadmap.recommendations.every((item) => item.opportunity.costUsd <= 10)).toBe(true);
    const excluded = roadmap.excludedOpportunities.find((item) => item.opportunityId === "TR-007");
    expect(excluded?.reason).toContain("límite");
  });
});

describe("buildRoadmap — schedule conflict", () => {
  let roadmap: Roadmap;
  beforeAll(async () => { roadmap = await build("schedule-conflict"); });

  it("leaves the gap unresolved and explains the schedule exclusion", async () => {
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.recommendations).toEqual([]);
    expect(roadmap.unresolvedGaps.map((gap) => gap.skillId)).toEqual(["PA-IT-0001"]);
    const excluded = roadmap.excludedOpportunities.find((item) => item.opportunityId === "TR-001");
    expect(excluded?.reason).toContain("horario");
    expect(roadmap.reasons.join(" ")).toContain("Sin opción en el catálogo");
  });
});

describe("buildRoadmap — no catalog option", () => {
  let roadmap: Roadmap;
  beforeAll(async () => { roadmap = await build("no-catalog-option"); });

  it("returns no recommendations and every opportunity as excluded", async () => {
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.recommendations).toEqual([]);
    expect(roadmap.unresolvedGaps.map((gap) => gap.skillId)).toEqual([
      "PA-CS-0007",
      "PA-LANG-0002",
    ]);
    expect(roadmap.excludedOpportunities).toHaveLength(catalog.opportunities.length);
    expect(roadmap.totals.unresolvedGapCount).toBe(2);
  });
});

describe("buildRoadmap — edge cases", () => {
  it("returns an empty roadmap when there are no gaps", async () => {
    const roadmap = await buildRoadmap({ ...request("missing-technical"), gaps: [] }, catalog, { now });
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.recommendations).toEqual([]);
    expect(roadmap.reasons[0]).toContain("No hay brechas");
  });

  it("returns an empty roadmap for an already-apt candidate", async () => {
    const roadmap = await buildRoadmap(
      { ...request("missing-technical"), aptitude: "apt" },
      catalog,
      { now },
    );
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.recommendations).toEqual([]);
    expect(roadmap.reasons[0]).toContain("ya es apto");
  });

  it("rejects a request without a candidate id", async () => {
    await expect(buildRoadmap({ ...request("missing-technical"), candidateId: "" }, catalog, { now })).rejects.toThrow(TrainingInputError);
  });

  it("rejects a request without preferences", async () => {
    const broken = { ...request("missing-technical"), preferences: undefined } as unknown as RoadmapRequest;
    await expect(buildRoadmap(broken, catalog, { now })).rejects.toThrow(TrainingInputError);
  });

  it("rejects an invalid Roadmap and throws through assertRoadmap", async () => {
    const roadmap = await build("missing-technical");
    expect(validateRoadmap({ ...roadmap, totals: { ...roadmap.totals, costUsd: -1 } })).toBe(false);
    expect(validateRoadmap({ ...roadmap, aptitude: "maybe" })).toBe(false);
    expect(() => assertRoadmap({ schemaVersion: "1.0.0" })).toThrow(InvalidRoadmapError);
  });

  it("keeps the schema dimension enum aligned with the ranking order", async () => {
    const schema = roadmapSchema as {
      $defs: { RankingBreakdownItem: { properties: { dimension: { enum: string[] } } } };
    };
    expect(schema.$defs.RankingBreakdownItem.properties.dimension.enum).toEqual([
      ...RANKING_DIMENSIONS,
    ]);
  });
});
