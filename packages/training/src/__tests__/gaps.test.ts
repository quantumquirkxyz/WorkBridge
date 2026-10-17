import { describe, expect, it } from "vitest";
import type { SolverCandidate, SolverVacancy } from "@puente/solver";
import {
  deriveGaps,
  effectiveRequiredLevel,
  gapDeficit,
  gapKindForSkill,
  gapLabelForSkill,
} from "../gaps";
import type { TrainingGap } from "../types";
import { loadSolverFixture } from "../../test/load-fixture";

const metro = loadSolverFixture<SolverVacancy>("vacancies/metro-support.json");
const desirableOnly = loadSolverFixture<SolverVacancy>("vacancies/desirable-only.json");
const mid = loadSolverFixture<SolverCandidate>("candidates/mid.json");
const weak = loadSolverFixture<SolverCandidate>("candidates/weak.json");
const credentialGap = loadSolverFixture<SolverCandidate>("candidates/credential-gap.json");

describe("gap classification", () => {
  it("maps taxonomy prefixes to gap kinds", () => {
    expect(gapKindForSkill("PA-IT-0001")).toBe("technical");
    expect(gapKindForSkill("PA-SOFT-0004")).toBe("soft");
    expect(gapKindForSkill("PA-LANG-0002")).toBe("language");
  });

  it("resolves Spanish labels from the taxonomy", () => {
    expect(gapLabelForSkill("PA-CS-0001")).toBe("Atención al cliente");
    expect(gapLabelForSkill("PA-UNKNOWN")).toBeNull();
  });

  it("defaults an unset required level to 1 and clamps to 0–4", () => {
    expect(effectiveRequiredLevel(0)).toBe(1);
    expect(effectiveRequiredLevel(3)).toBe(3);
    expect(effectiveRequiredLevel(9)).toBe(4);
  });

  it("derives a non-zero deficit from a gap", () => {
    const gap: TrainingGap = {
      skillId: "PA-IT-0001",
      label: "Soporte técnico",
      kind: "technical",
      requiredLevel: 3,
      currentLevel: 1,
      mandatory: true,
    };
    expect(gapDeficit(gap)).toBe(2);
    expect(gapDeficit({ ...gap, requiredLevel: 1, currentLevel: 1 })).toBe(1);
  });
});

describe("deriveGaps from the deterministic solver output", () => {
  it("keeps only unmet requirements, with the desirable language gap", () => {
    const gaps = deriveGaps({ candidate: mid, vacancy: metro });
    expect(gaps).toEqual([
      {
        skillId: "PA-LANG-0002",
        label: "Idioma inglés",
        kind: "language",
        requiredLevel: 1,
        currentLevel: 0,
        mandatory: false,
      },
    ]);
  });

  it("orders gaps by skill id and marks mandatory ones", () => {
    const gaps = deriveGaps({ candidate: weak, vacancy: metro });
    expect(gaps.map((gap) => gap.skillId)).toEqual([
      "PA-CS-0001",
      "PA-LANG-0002",
      "PA-OFF-0002",
    ]);
    expect(gaps.find((gap) => gap.skillId === "PA-CS-0001")?.mandatory).toBe(true);
    expect(gaps.find((gap) => gap.skillId === "PA-LANG-0002")?.mandatory).toBe(false);
  });

  it("records the current level behind a partial gap", () => {
    const gaps = deriveGaps({ candidate: credentialGap, vacancy: metro });
    const excel = gaps.find((gap) => gap.skillId === "PA-OFF-0002");
    expect(excel?.currentLevel).toBe(1);
    expect(excel?.requiredLevel).toBe(2);
  });

  it("prefers a mandatory requirement over a desirable one for the same skill", () => {
    const vacancy: SolverVacancy = {
      ...metro,
      desirable: [
        {
          requirementId: "req-dup",
          skillId: "PA-CS-0001",
          wording: "Atención al cliente deseable",
          requiredLevel: 4,
        },
      ],
    };
    const gaps = deriveGaps({ candidate: weak, vacancy });
    const gap = gaps.find((item) => item.skillId === "PA-CS-0001");
    expect(gap?.mandatory).toBe(true);
    expect(gap?.requiredLevel).toBe(4);
  });

  it("derives desirable-only gaps when the vacancy has no mandatory requirements", () => {
    const gaps = deriveGaps({ candidate: mid, vacancy: desirableOnly });
    expect(gaps.map((gap) => gap.skillId)).toEqual(["PA-IT-0001", "PA-LANG-0002"]);
    expect(gaps.every((gap) => !gap.mandatory)).toBe(true);
  });
});
