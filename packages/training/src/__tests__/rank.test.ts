import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog";
import { rankOpportunities } from "../rank";
import {
  availabilityScore,
  costScore,
  coveredSkillLevel,
  credentialScore,
  durationScore,
  geographyScore,
  modalityScore,
  scheduleCoverage,
  scheduleScore,
  specializationScore,
} from "../scoring";
import { RANKING_DIMENSIONS, TRAINING_WEIGHTS, weightedTrainingScore } from "../weights";
import type { TrainingCatalog, TrainingGap, TrainingOpportunity, TrainingPreferences } from "../types";
import { loadFixture } from "../../test/load-fixture";

const catalog = loadCatalog(loadFixture<TrainingCatalog>("catalog/panama-training-catalog.json"));
const byId = new Map(catalog.opportunities.map((opportunity) => [opportunity.opportunityId, opportunity]));
const now = new Date("2026-10-16T12:00:00.000Z");

function opportunity(id: string): TrainingOpportunity {
  const found = byId.get(id);
  if (!found) throw new Error(`missing fixture opportunity ${id}`);
  return found;
}

const excelGap: TrainingGap = {
  skillId: "PA-OFF-0002",
  label: "Hoja de cálculo Excel",
  kind: "technical",
  requiredLevel: 2,
  currentLevel: 0,
  mandatory: true,
};

async function rankedWith(id: string, gaps: TrainingGap[], preferences: TrainingPreferences) {
  const ranked = await rankOpportunities({ catalog, gaps, preferences, now });
  const match = ranked.find((item) => item.opportunity.opportunityId === id);
  if (!match) throw new Error(`missing ranked ${id}`);
  return match;
}

describe("training weights", async () => {
  it("sums the nine criteria to 1", async () => {
    const total = RANKING_DIMENSIONS.reduce((sum, dimension) => sum + TRAINING_WEIGHTS[dimension], 0);
    expect(RANKING_DIMENSIONS).toHaveLength(9);
    expect(total).toBeCloseTo(1, 10);
  });

  it("clamps and rounds the weighted score", async () => {
    const all = Object.fromEntries(
      RANKING_DIMENSIONS.map((dimension) => [dimension, 100]),
    ) as Record<(typeof RANKING_DIMENSIONS)[number], number>;
    expect(weightedTrainingScore(all)).toBe(100);
    expect(weightedTrainingScore({ ...all, gap_coverage: 0 })).toBe(70);
    expect(weightedTrainingScore({ ...all, gap_coverage: 120 })).toBe(100);
  });
});

describe("dimension scorers", async () => {
  it("reports the covered skill level", async () => {
    expect(coveredSkillLevel(opportunity("TR-007"), "PA-OFF-0002")).toBe(3);
    expect(coveredSkillLevel(opportunity("TR-001"), "PA-OFF-0002")).toBe(0);
  });

  it("scores specialization overlap against the target areas", async () => {
    expect(specializationScore(opportunity("TR-001"), { specializations: ["it_support"] }).rawScore).toBe(100);
    expect(specializationScore(opportunity("TR-006"), { specializations: ["it_support"] }).rawScore).toBe(0);
    expect(
      specializationScore(opportunity("TR-013"), {
        specializations: ["it_support", "customer_service"],
      }).rawScore,
    ).toBe(50);
    expect(specializationScore(opportunity("TR-001"), { specializations: [] }).rawScore).toBe(100);
  });

  it("scores cost against the ceiling", async () => {
    expect(costScore(opportunity("TR-006"), { specializations: [] }).rawScore).toBe(100);
    expect(costScore(opportunity("TR-002"), { specializations: [], maxCostUsd: 100 }).rawScore).toBe(0);
    const within = costScore(opportunity("TR-002"), { specializations: [], maxCostUsd: 200 });
    expect(within.rawScore).toBe(76);
    expect(costScore(opportunity("TR-016"), { specializations: [], maxCostUsd: 0 }).rawScore).toBe(100);
  });

  it("scores duration against the effort ceiling", async () => {
    expect(durationScore(opportunity("TR-016"), { specializations: [], maxTotalHours: 200 }).rawScore).toBe(97);
    expect(durationScore(opportunity("TR-019"), { specializations: [], maxTotalHours: 160 }).rawScore).toBe(50);
    expect(durationScore(opportunity("TR-019"), { specializations: [], maxTotalHours: 0 }).rawScore).toBe(0);
  });

  it("scores modality against the preferred list", async () => {
    expect(modalityScore(opportunity("TR-001"), { specializations: [] }).rawScore).toBe(100);
    expect(modalityScore(opportunity("TR-001"), { specializations: [], preferredModalities: ["online"] }).rawScore).toBe(100);
    expect(modalityScore(opportunity("TR-008"), { specializations: [], preferredModalities: ["online"] }).rawScore).toBe(50);
  });

  it("estimates geography offline and is neutral when unknown", async () => {
    expect((await geographyScore(opportunity("TR-001"), { specializations: [] })).rawScore).toBe(100);
    expect((await geographyScore(opportunity("TR-008"), { specializations: [] })).rawScore).toBe(70);
    const nearby = await geographyScore(opportunity("TR-008"), {
      specializations: [],
      home: { lat: 8.99, lng: -79.51 },
      maxCommuteMinutes: 60,
    });
    expect(nearby.rawScore).toBe(100);
    const far = await geographyScore(opportunity("TR-008"), {
      specializations: [],
      home: { lat: 9.5, lng: -79.9 },
      maxCommuteMinutes: 10,
    });
    expect(far.rawScore).toBeLessThan(50);
  });

  it("excludes an on-site opportunity beyond the commute ceiling", async () => {
    const ranked = await rankOpportunities({
      catalog,
      gaps: [excelGap],
      preferences: {
        specializations: [],
        home: { lat: 9.5, lng: -79.9 },
        maxCommuteMinutes: 1,
      },
      now,
    });
    const distant = ranked.find((item) => item.opportunity.opportunityId === "TR-008");
    expect(distant?.eligible).toBe(false);
    expect(distant?.exclusionReasons.join(" ")).toContain("supera tu límite");
  });

  it("computes schedule coverage and flags unavailable days", async () => {
    const coverage = scheduleCoverage(
      { days: [1, 3], startMinute: 1080, endMinute: 1260, weeklyHours: 6 },
      { days: [1], startMinute: 1080, endMinute: 1260, weeklyHours: 6 },
    );
    expect(coverage.coverage).toBeCloseTo(0.5, 5);
    expect(coverage.missingDays).toEqual([3]);
    expect(scheduleScore(opportunity("TR-001"), { specializations: [] }).rawScore).toBe(100);
    const conflict = scheduleScore(opportunity("TR-001"), {
      specializations: [],
      availabilityWindow: { days: [1, 2, 3], startMinute: 480, endMinute: 1020, weeklyHours: 45 },
    });
    expect(conflict.rawScore).toBe(0);
  });

  it("scores availability from open seats", async () => {
    expect(availabilityScore(opportunity("TR-001")).rawScore).toBe(100);
    expect(availabilityScore(opportunity("TR-021")).rawScore).toBe(0);
  });

  it("scores credential relevance from the probability", async () => {
    expect(credentialScore(opportunity("TR-002")).rawScore).toBe(90);
  });
});

describe("rankOpportunities", () => {
  it("ranks every catalogued opportunity with a nine-item breakdown", async () => {
    const ranked = await rankOpportunities({
      catalog,
      gaps: [excelGap],
      preferences: { specializations: ["administration"] },
      now,
    });
    expect(ranked).toHaveLength(catalog.opportunities.length);
    expect(ranked.map((item) => item.rank)).toEqual(
      Array.from({ length: ranked.length }, (_, index) => index + 1),
    );
    const top = ranked[0]!;
    expect(top.breakdown).toHaveLength(9);
    for (const item of top.breakdown) {
      expect(item.weight).toBe(TRAINING_WEIGHTS[item.dimension]);
      expect(item.weightedScore).toBeCloseTo(item.weight * item.rawScore, 2);
      expect(item.reasons.length).toBeGreaterThan(0);
    }
  });

  it("rewards opportunities that cover the gaps", async () => {
    const covered = await rankedWith("TR-006", [excelGap], { specializations: ["administration"] });
    const uncovered = await rankedWith("TR-001", [excelGap], { specializations: ["administration"] });
    expect(covered.coveredGaps).toEqual([{ skillId: "PA-OFF-0002", addedLevel: 2 }]);
    expect(uncovered.coveredGaps).toEqual([]);
    expect(covered.score).toBeGreaterThan(uncovered.score);
  });

  it("is deterministic and breaks score ties by opportunity id", async () => {
    const options = { catalog, gaps: [excelGap], preferences: { specializations: ["administration"] }, now };
    const first = await rankOpportunities(options);
    const second = await rankOpportunities(options);
    expect(second).toEqual(first);
    for (let index = 1; index < first.length; index += 1) {
      const previous = first[index - 1]!;
      const current = first[index]!;
      if (previous.score === current.score) {
        expect(previous.opportunity.opportunityId < current.opportunity.opportunityId).toBe(true);
      }
    }
  });

  it("marks expired, full, and over-budget opportunities ineligible", async () => {
    const ranked = await rankOpportunities({
      catalog,
      gaps: [excelGap],
      preferences: { specializations: ["customer_service"], maxCostUsd: 50 },
      now,
    });
    const expired = ranked.find((item) => item.opportunity.opportunityId === "TR-020")!;
    expect(expired.freshness).toBe("expired");
    expect(expired.eligible).toBe(false);
    expect(expired.exclusionReasons.join(" ")).toContain("vencidos");

    const full = ranked.find((item) => item.opportunity.opportunityId === "TR-021")!;
    expect(full.eligible).toBe(false);
    expect(full.exclusionReasons.join(" ")).toContain("Sin cupos");

    const pricey = ranked.find((item) => item.opportunity.opportunityId === "TR-002")!;
    expect(pricey.eligible).toBe(false);
    expect(pricey.exclusionReasons.join(" ")).toContain("límite");

    const stale = (await rankOpportunities({
      catalog,
      gaps: [excelGap],
      preferences: { specializations: ["it_support"] },
      now,
    })).find((item) => item.opportunity.opportunityId === "TR-018")!;
    expect(stale.freshness).toBe("stale");
    expect(stale.eligible).toBe(true);
  });

  it("excludes opportunities outside the target specializations", async () => {
    const ranked = await rankOpportunities({
      catalog,
      gaps: [excelGap],
      preferences: { specializations: ["administration"] },
      now,
    });
    const offTarget = ranked.find((item) => item.opportunity.opportunityId === "TR-001")!;
    expect(offTarget.eligible).toBe(false);
    expect(offTarget.exclusionReasons.join(" ")).toContain("especialización");

    const onTarget = ranked.find((item) => item.opportunity.opportunityId === "TR-006")!;
    expect(onTarget.eligible).toBe(true);
  });
});
