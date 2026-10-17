import { describe, expect, it } from "vitest";
import type { CandidatePreferences, WorkflowRunRequest } from "@workbridge/domain";
import preferencesFixture from "../../../../../packages/catalog/fixtures/preferences.json";
import { createWorkflowRuntime } from "../graph";
import { createSeedTrainingCatalog } from "@workbridge/training";
import {
  candidateProfile,
  CANDIDATE_CONTEXT,
  objectiveDocument,
  VACANCY_CONTEXT,
  now,
} from "../../matching/__tests__/helpers";

const PREFERENCES = preferencesFixture as CandidatePreferences;
const VACANCY_ID = "vac-objective-001";

function request(overrides: Partial<WorkflowRunRequest> = {}): WorkflowRunRequest {
  return {
    trace_id: "trace-bias-order",
    idempotency_key: "idem-bias-order",
    candidateText: "Experiencia en caja y atención al cliente en el negocio familiar.",
    vacancyText: "Se busca cajero con atención al cliente.",
    declaredCredentials: [{ id: "cred-1", name: "María González" }],
    actor: { id: "cand-1", role: "candidate" },
    requestedTools: [],
    preferences: PREFERENCES,
    ...overrides,
  };
}

function runtime() {
  return createWorkflowRuntime({
    clock: () => "2026-10-16T12:00:00.000Z",
    complete: async () => ({ text: "Plan de practica en caja" }),
    matchingEnv: {},
  });
}

async function matchingInput(maxCommuteMinutes: number) {
  return {
    profile: candidateProfile(),
    context: {
      ...CANDIDATE_CONTEXT,
      transport: { ...CANDIDATE_CONTEXT.transport, maxCommuteMinutes },
    },
    vacancies: [{ document: await objectiveDocument(), context: VACANCY_CONTEXT }],
    biasSubject: {
      holderName: "María González",
      genderMarker: "femenino",
      corregimiento: "Panamá",
    },
    now,
  };
}

describe("bias auditor workflow step", () => {
  it("runs bias_auditor immediately after market_and_matching", async () => {
    const engine = runtime();
    const result = await engine.run(request());

    expect(result.status).toBe("success");
    expect(result.mastraSteps).toEqual([
      "exploration",
      "profile_and_evidence",
      "market_and_matching",
      "bias_auditor",
      "training",
    ]);
    const marketIndex = result.mastraSteps.indexOf("market_and_matching");
    expect(result.mastraSteps[marketIndex + 1]).toBe("bias_auditor");
  });

  it("blocks a vacancy whose outcome flips on a protected attribute", async () => {
    const engine = runtime();
    const result = await engine.run(
      request({
        trace_id: "trace-bias-flip",
        idempotency_key: "idem-bias-flip",
        matchingInput: await matchingInput(10),
      }),
    );

    const blocked = result.auditedVacancies.find((vacancy) => vacancy.vacancyId === VACANCY_ID);
    expect(blocked?.status).toBe("blocked");
    expect(result.match?.skippedVacancyIds).toContain(VACANCY_ID);
    expect(result.match?.result.decisions.map((decision) => decision.vacancyId)).not.toContain(VACANCY_ID);
    expect(result.match?.result.assignments.map((decision) => decision.vacancyId)).not.toContain(VACANCY_ID);
    expect(result.biasAlerts).toEqual([
      expect.objectContaining({
        id: `bias-${VACANCY_ID}-corregimiento`,
        vacancyId: VACANCY_ID,
        attribute: "corregimiento",
      }),
    ]);
    expect(result.biasAlerts[0]?.reason).toContain("corregimiento");

    const findingAudits = engine.audit.read().filter((event) => event.action === "bias_finding");
    const findingSpans = engine.traces.tracesFor("trace-bias-flip").spans.filter((span) => span.name === "bias_finding");
    expect(findingAudits).toHaveLength(result.biasAlerts.length);
    expect(findingSpans).toHaveLength(result.biasAlerts.length);
    expect(findingAudits.every((event) => event.agent === "bias_auditor")).toBe(true);
    expect(new Set(findingAudits.map((event) => event.constraint))).toEqual(
      new Set(result.biasAlerts.map((alert) => alert.attribute)),
    );
  });

  it("keeps the vacancy rankable when no counterfactual flips aptitude or score band", async () => {
    const engine = runtime();
    const result = await engine.run(
      request({
        trace_id: "trace-bias-stable",
        idempotency_key: "idem-bias-stable",
        matchingInput: await matchingInput(60),
      }),
    );

    expect(result.biasAlerts).toEqual([]);
    expect(result.auditedVacancies.find((vacancy) => vacancy.vacancyId === VACANCY_ID)?.status).not.toBe("blocked");
    expect(result.match?.skippedVacancyIds).not.toContain(VACANCY_ID);
    expect(result.match?.result.decisions.map((decision) => decision.vacancyId)).toContain(VACANCY_ID);
    expect(engine.audit.read().filter((event) => event.action === "bias_finding")).toHaveLength(0);
    expect(
      engine.traces.tracesFor("trace-bias-stable").spans.filter((span) => span.name === "bias_finding"),
    ).toHaveLength(0);
  });

  it("does not build a training roadmap targeting a vacancy excluded by the auditor", async () => {
    const engine = createWorkflowRuntime({
      clock: () => "2026-10-16T12:00:00.000Z",
      complete: async () => ({ text: "Plan de practica en caja" }),
      matchingEnv: {},
      trainingCatalog: createSeedTrainingCatalog(),
      trainingPreferences: {
        specializations: ["it_support"],
        maxCostUsd: 200,
        maxTotalHours: 100,
      },
    });

    const result = await engine.run(request({ matchingInput: await matchingInput(10) }));

    expect(result.biasAlerts).toHaveLength(1);
    expect(result.match?.result.decisions).toEqual([]);
    expect(result.roadmap).toBeUndefined();
    expect(result.status).toBe("success");
  });
});
