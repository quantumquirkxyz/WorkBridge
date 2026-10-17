import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { rankOpportunities } from "../rank";
import { selectRoadmap } from "../select";
import type { TrainingCatalog, TrainingGap, TrainingPreferences } from "../types";
import { loadFixture } from "../../test/load-fixture";

const catalog = loadCatalog(loadFixture<TrainingCatalog>("catalog/panama-training-catalog.json"));
const now = new Date("2026-10-16T12:00:00.000Z");

function gap(
  skillId: string,
  requiredLevel: TrainingGap["requiredLevel"],
  currentLevel: TrainingGap["currentLevel"] = 0,
): TrainingGap {
  return { skillId, label: null, kind: "technical", requiredLevel, currentLevel, mandatory: true };
}

async function select(gaps: TrainingGap[], preferences: TrainingPreferences) {
  const ranked = await rankOpportunities({ catalog, gaps, preferences, now });
  return selectRoadmap(ranked, gaps, preferences, []);
}

async function selectedIds(result: Awaited<ReturnType<typeof select>>): Promise<string[]> {
  return result.selected.map((item) => item.ranked.opportunity.opportunityId);
}

describe("selectRoadmap", () => {
  it("covers several gaps across opportunities in a deterministic order", async () => {
    const result = await select([gap("PA-IT-0001", 2), gap("PA-IT-0003", 2)], {
      specializations: ["it_support"],
    });
    expect(await selectedIds(result)).toEqual(["TR-002", "TR-001"]);
    expect(result.unresolvedGaps).toEqual([]);
  });

  it("respects the cost ceiling", async () => {
    const result = await select([gap("PA-OFF-0002", 2)], {
      specializations: ["administration"],
      maxCostUsd: 10,
    });
    expect(await selectedIds(result)).toEqual(["TR-006"]);
    expect(result.omitted.find((item) => item.ranked.opportunity.opportunityId === "TR-007")?.reason).toContain(
      "límite",
    );
  });

  it("respects the duration ceiling", async () => {
    const result = await select([gap("PA-OFF-0002", 2)], {
      specializations: ["administration"],
      maxTotalHours: 10,
    });
    expect(await selectedIds(result)).toEqual([]);
    expect(result.unresolvedGaps.map((item) => item.skillId)).toEqual(["PA-OFF-0002"]);
  });

  it("unlocks a prerequisite chain only after the prerequisite is covered", async () => {
    const result = await select([gap("PA-IT-0001", 2), gap("PA-IT-0002", 2)], {
      specializations: ["it_support"],
    });
    expect(await selectedIds(result)).toEqual(["TR-001", "TR-003"]);
    expect(result.unresolvedGaps).toEqual([]);
  });

  it("selects a prerequisite-only course to unlock a dependent option", async () => {
    const result = await select([gap("PA-IT-0002", 2)], { specializations: ["it_support"] });
    expect(await selectedIds(result)).toEqual(["TR-003", "TR-001"]);
    expect(result.unresolvedGaps).toEqual([]);
  });

  it("never selects an opportunity that conflicts with the schedule", async () => {
    const result = await select([gap("PA-IT-0001", 2)], {
      specializations: ["it_support"],
      availabilityWindow: { days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 1020, weeklyHours: 45 },
    });
    expect(await selectedIds(result)).toEqual([]);
    const omitted = result.omitted.find((item) => item.ranked.opportunity.opportunityId === "TR-001");
    expect(omitted?.reason).toContain("horario");
  });

  it("is deterministic for repeated selections", async () => {
    const gaps = [gap("PA-IT-0001", 2), gap("PA-IT-0003", 2)];
    const preferences: TrainingPreferences = { specializations: ["it_support"] };
    await expect(select(gaps, preferences)).resolves.toEqual(await select(gaps, preferences));
  });

  it("rejects a cyclic prerequisite chain", async () => {
    const cycleCatalog: TrainingCatalog = {
      ...catalog,
      opportunities: [
        {
          ...catalog.opportunities[0]!,
          opportunityId: "CYCLE-A",
          coveredSkills: [{ skillId: "CYCLE-A-SKILL", level: 1 }],
          prerequisites: ["CYCLE-B-SKILL"],
        },
        {
          ...catalog.opportunities[0]!,
          opportunityId: "CYCLE-B",
          coveredSkills: [{ skillId: "CYCLE-B-SKILL", level: 1 }],
          prerequisites: ["CYCLE-A-SKILL"],
        },
      ],
    };
    const gaps = [gap("CYCLE-A-SKILL", 1), gap("CYCLE-B-SKILL", 1)];
    const ranked = await rankOpportunities({ catalog: cycleCatalog, gaps, preferences: { specializations: [] }, now });
    const result = await selectRoadmap(ranked, gaps, { specializations: [] }, []);
    expect(result.selected).toEqual([]);
    expect(result.unresolvedGaps).toEqual(gaps);
  });

  it("preserves prerequisite skills when the deterministic fallback is used", async () => {
    const provider = {
      ...catalog.opportunities[0]!,
      opportunityId: "FALLBACK-PROVIDER",
      coveredSkills: [
        { skillId: "FALLBACK-GAP-ONE", level: 1 as const },
        { skillId: "FALLBACK-PREREQUISITE", level: 1 as const },
      ],
      prerequisites: [],
    };
    const dependent = {
      ...catalog.opportunities[1]!,
      opportunityId: "FALLBACK-DEPENDENT",
      coveredSkills: [{ skillId: "FALLBACK-GAP-TWO", level: 1 as const }],
      prerequisites: ["FALLBACK-PREREQUISITE"],
    };
    const fallbackCatalog: TrainingCatalog = { ...catalog, opportunities: [provider, dependent] };
    const gaps = [gap("FALLBACK-GAP-ONE", 1), gap("FALLBACK-GAP-TWO", 1)];
    const ranked = await rankOpportunities({ catalog: fallbackCatalog, gaps, preferences: { specializations: [] }, now });
    const result = await selectRoadmap(ranked, gaps, { specializations: [] }, [], {
      name: "forced-fallback",
      solve: async () => ({ status: "infeasible", objectiveValue: null, values: {} }),
    });
    expect(result.selected.map((item) => item.ranked.opportunity.opportunityId)).toEqual([
      "FALLBACK-PROVIDER",
      "FALLBACK-DEPENDENT",
    ]);
  });
});
