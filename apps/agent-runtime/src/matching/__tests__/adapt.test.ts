import { describe, expect, it } from "vitest";
import { canonicalSkillId, toSolverCandidate, toSolverVacancy } from "../adapt";
import { flaggedDocument, objectiveDocument, candidateProfile, CANDIDATE_CONTEXT } from "./helpers";

const HOME = { lat: 8.9833, lng: -79.5167 };

describe("canonicalSkillId", () => {
  it("bridges a plp:* profile skill id onto the vacancy taxonomy", () => {
    const excel = candidateProfile().skills.find((skill) => skill.skill_id === "plp:excel");
    expect(excel).toBeDefined();
    expect(canonicalSkillId(excel!)).toBe("PA-OFF-0002");
  });

  it("keeps an id that is already canonical", () => {
    const skill = { ...candidateProfile().skills[0]!, skill_id: "PA-OFF-0002" };
    expect(canonicalSkillId(skill)).toBe("PA-OFF-0002");
  });
});

describe("toSolverVacancy", () => {
  it("separates mandatory from desirable and preserves original wording", async () => {
    const document = await objectiveDocument();
    const vacancy = toSolverVacancy(document, {
      schedule: { days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 1020, weeklyHours: 45 },
      salaryMinUsd: 500,
      salaryMaxUsd: 800,
      capacity: 2,
    }, HOME);

    expect(vacancy.vacancyId).toBe("vac-objective-001");
    expect(vacancy.location).toEqual(HOME);
    expect(vacancy.mandatory).toHaveLength(3);
    expect(vacancy.desirable).toHaveLength(2);
    expect(vacancy.mandatory.map((r) => r.wording)).toContain(
      "Manejo de Excel a nivel intermedio",
    );
    const excel = vacancy.mandatory.find((r) => r.skillId === "PA-OFF-0002");
    expect(excel?.requiredLevel).toBe(2);
  });

  it("excludes flagged requirements from ranking until a human resolves them", async () => {
    const document = await flaggedDocument();
    expect(document.status).not.toBe("blocked");
    expect(document.reviewQueue.length).toBeGreaterThan(0);

    const vacancy = toSolverVacancy(document, {
      schedule: { days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 1020, weeklyHours: 45 },
      salaryMinUsd: 400,
      salaryMaxUsd: 700,
      capacity: 1,
    }, HOME);

    const wordings = [...vacancy.mandatory, ...vacancy.desirable].map((r) => r.wording);
    expect(wordings).not.toContain("Edad: entre 20 y 25 años");
    expect(wordings).toContain("Manejo de Excel");
  });
});

describe("toSolverCandidate", () => {
  it("projects the profile onto the solver contract", () => {
    const profile = candidateProfile();
    const candidate = toSolverCandidate(profile, CANDIDATE_CONTEXT, HOME);

    expect(candidate.candidateId).toBe(profile.candidate_id);
    expect(candidate.home).toEqual(HOME);
    expect(candidate.expectedSalaryUsd).toBe(700);
    expect(candidate.minimumSalaryUsd).toBe(600);
    expect(candidate.availability.weeklyHours).toBe(50);
    expect(candidate.transport).toEqual({
      hasVehicle: true,
      maxCommuteMinutes: 60,
      modes: ["driving"],
    });
    expect(candidate.skills.some((skill) => skill.skillId === "PA-OFF-0002")).toBe(true);
    expect(candidate.experienceLevel).toBeGreaterThanOrEqual(1);
    expect(candidate.relevantEvidenceCount).toBeGreaterThanOrEqual(1);
  });

  it("copies arrays so the solver cannot mutate the caller's context", () => {
    const profile = candidateProfile();
    const candidate = toSolverCandidate(profile, CANDIDATE_CONTEXT, HOME);
    candidate.availability.days.push(6);
    expect(CANDIDATE_CONTEXT.availability.days).not.toContain(6);
  });
});
