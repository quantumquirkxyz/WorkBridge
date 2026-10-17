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

function select(gaps: TrainingGap[], preferences: TrainingPreferences) {
  const ranked = rankOpportunities({ catalog, gaps, preferences, now });
  return selectRoadmap(ranked, gaps, preferences, []);
}

function selectedIds(result: ReturnType<typeof select>): string[] {
  return result.selected.map((item) => item.ranked.opportunity.opportunityId);
}

describe("selectRoadmap", () => {
  it("covers several gaps across opportunities in a deterministic order", () => {
    const result = select([gap("PA-IT-0001", 2), gap("PA-IT-0003", 2)], {
      specializations: ["it_support"],
    });
    expect(selectedIds(result)).toEqual(["TR-002", "TR-001"]);
    expect(result.unresolvedGaps).toEqual([]);
  });

  it("respects the cost ceiling", () => {
    const result = select([gap("PA-OFF-0002", 2)], {
      specializations: ["administration"],
      maxCostUsd: 10,
    });
    expect(selectedIds(result)).toEqual(["TR-006"]);
    expect(result.omitted.find((item) => item.ranked.opportunity.opportunityId === "TR-007")?.reason).toContain(
      "límite",
    );
  });

  it("respects the duration ceiling", () => {
    const result = select([gap("PA-OFF-0002", 2)], {
      specializations: ["administration"],
      maxTotalHours: 10,
    });
    expect(selectedIds(result)).toEqual([]);
    expect(result.unresolvedGaps.map((item) => item.skillId)).toEqual(["PA-OFF-0002"]);
  });

  it("unlocks a prerequisite chain only after the prerequisite is covered", () => {
    const result = select([gap("PA-IT-0001", 2), gap("PA-IT-0002", 2)], {
      specializations: ["it_support"],
    });
    expect(selectedIds(result)).toEqual(["TR-001", "TR-003"]);
    expect(result.unresolvedGaps).toEqual([]);
  });

  it("leaves a gap unresolved when its only option needs an unmet prerequisite", () => {
    const result = select([gap("PA-IT-0002", 2)], { specializations: ["it_support"] });
    expect(selectedIds(result)).toEqual([]);
    expect(result.unresolvedGaps.map((item) => item.skillId)).toEqual(["PA-IT-0002"]);
    const omitted = result.omitted.find((item) => item.ranked.opportunity.opportunityId === "TR-003");
    expect(omitted?.reason).toContain("prerrequisitos");
  });

  it("never selects an opportunity that conflicts with the schedule", () => {
    const result = select([gap("PA-IT-0001", 2)], {
      specializations: ["it_support"],
      availabilityWindow: { days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 1020, weeklyHours: 45 },
    });
    expect(selectedIds(result)).toEqual([]);
    const omitted = result.omitted.find((item) => item.ranked.opportunity.opportunityId === "TR-001");
    expect(omitted?.reason).toContain("horario");
  });

  it("is deterministic for repeated selections", () => {
    const gaps = [gap("PA-IT-0001", 2), gap("PA-IT-0003", 2)];
    const preferences: TrainingPreferences = { specializations: ["it_support"] };
    expect(select(gaps, preferences)).toEqual(select(gaps, preferences));
  });
});
