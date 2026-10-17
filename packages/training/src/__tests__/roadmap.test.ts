import { describe, expect, it } from "vitest";
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

function build(name: string): Roadmap {
  return buildRoadmap(request(name), catalog, { now });
}

function recommendationIds(roadmap: Roadmap): string[] {
  return roadmap.recommendations.map((item) => item.opportunity.opportunityId);
}

describe("buildRoadmap — missing technical skills", () => {
  const roadmap = build("missing-technical");

  it("emits a valid Roadmap JSON", () => {
    expect(validateRoadmap(roadmap)).toBe(true);
  });

  it("recommends the catalogued courses that close the gaps", () => {
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

  it("explains each recommendation in Spanish with source and freshness", () => {
    for (const item of roadmap.recommendations) {
      expect(item.explanationEs).toContain("Fuente:");
      expect(item.explanationEs).toMatch(/actualizados/);
      expect(item.source).toBe(catalog.opportunities[0]!.source);
      expect(item.retrievedAt).toBeDefined();
      expect(item.scoreBreakdown).toHaveLength(9);
    }
    expect(roadmap.recommendations[0]!.explanationEs).toContain("Cubre:");
  });

  it("recommends only catalogued opportunities, embedded verbatim", () => {
    for (const item of roadmap.recommendations) {
      expect(catalogIds.has(item.opportunity.opportunityId)).toBe(true);
      const catalogEntry = catalog.opportunities.find(
        (opportunity) => opportunity.opportunityId === item.opportunity.opportunityId,
      );
      expect(item.opportunity).toEqual(catalogEntry);
    }
  });

  it("records the constraints and the target vacancy", () => {
    expect(roadmap.targetVacancyId).toBe("vac-metro-support");
    expect(roadmap.constraints).toEqual({
      specializations: ["it_support"],
      maxCostUsd: null,
      maxTotalHours: null,
    });
    expect(roadmap.catalogVersion).toBe(catalog.catalogVersion);
  });

  it("is deterministic for repeated builds", () => {
    expect(build("missing-technical")).toEqual(roadmap);
  });
});

describe("buildRoadmap — soft-skill gaps", () => {
  const roadmap = build("soft-skill-gaps");

  it("produces a valid apt_with_gaps roadmap that closes both soft gaps", () => {
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.aptitude).toBe("apt_with_gaps");
    expect(recommendationIds(roadmap)).toEqual(["TR-016", "TR-017"]);
    expect(roadmap.unresolvedGaps).toEqual([]);
    expect(roadmap.gaps.every((gap) => gap.kind === "soft")).toBe(true);
  });
});

describe("buildRoadmap — cost limit", () => {
  const roadmap = build("cost-limit");

  it("stays within the cost ceiling and reports the excluded option", () => {
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(recommendationIds(roadmap)).toEqual(["TR-006"]);
    expect(roadmap.totals.costUsd).toBeLessThanOrEqual(10);
    expect(roadmap.recommendations.every((item) => item.opportunity.costUsd <= 10)).toBe(true);
    const excluded = roadmap.excludedOpportunities.find((item) => item.opportunityId === "TR-007");
    expect(excluded?.reason).toContain("límite");
  });
});

describe("buildRoadmap — schedule conflict", () => {
  const roadmap = build("schedule-conflict");

  it("leaves the gap unresolved and explains the schedule exclusion", () => {
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.recommendations).toEqual([]);
    expect(roadmap.unresolvedGaps.map((gap) => gap.skillId)).toEqual(["PA-IT-0001"]);
    const excluded = roadmap.excludedOpportunities.find((item) => item.opportunityId === "TR-001");
    expect(excluded?.reason).toContain("horario");
    expect(roadmap.reasons.join(" ")).toContain("Sin opción en el catálogo");
  });
});

describe("buildRoadmap — no catalog option", () => {
  const roadmap = build("no-catalog-option");

  it("returns no recommendations and every opportunity as excluded", () => {
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
  it("returns an empty roadmap when there are no gaps", () => {
    const roadmap = buildRoadmap({ ...request("missing-technical"), gaps: [] }, catalog, { now });
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.recommendations).toEqual([]);
    expect(roadmap.reasons[0]).toContain("No hay brechas");
  });

  it("returns an empty roadmap for an already-apt candidate", () => {
    const roadmap = buildRoadmap(
      { ...request("missing-technical"), aptitude: "apt" },
      catalog,
      { now },
    );
    expect(validateRoadmap(roadmap)).toBe(true);
    expect(roadmap.recommendations).toEqual([]);
    expect(roadmap.reasons[0]).toContain("ya es apto");
  });

  it("rejects a request without a candidate id", () => {
    expect(() => buildRoadmap({ ...request("missing-technical"), candidateId: "" }, catalog, { now })).toThrow(
      TrainingInputError,
    );
  });

  it("rejects a request without preferences", () => {
    const broken = { ...request("missing-technical"), preferences: undefined } as unknown as RoadmapRequest;
    expect(() => buildRoadmap(broken, catalog, { now })).toThrow(TrainingInputError);
  });

  it("rejects an invalid Roadmap and throws through assertRoadmap", () => {
    const roadmap = build("missing-technical");
    expect(validateRoadmap({ ...roadmap, totals: { ...roadmap.totals, costUsd: -1 } })).toBe(false);
    expect(validateRoadmap({ ...roadmap, aptitude: "maybe" })).toBe(false);
    expect(() => assertRoadmap({ schemaVersion: "1.0.0" })).toThrow(InvalidRoadmapError);
  });

  it("keeps the schema dimension enum aligned with the ranking order", () => {
    const schema = roadmapSchema as {
      $defs: { RankingBreakdownItem: { properties: { dimension: { enum: string[] } } } };
    };
    expect(schema.$defs.RankingBreakdownItem.properties.dimension.enum).toEqual([
      ...RANKING_DIMENSIONS,
    ]);
  });
});
