import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import auditEventSchema from "../schemas/audit-event.schema.json";
import matchDecisionSchema from "../schemas/match-decision.schema.json";
import workflowEnvelopeSchema from "../schemas/workflow-envelope.schema.json";
import {
  APTITUDE_THRESHOLDS,
  MATCH_WEIGHTS,
  aptitudeForWeightedTotal,
  assertAuditEvent,
  assertMatchDecision,
  assertWorkflowEnvelope,
  type MatchDecision,
} from "@puente/domain";

function match(total: number, aptitude: MatchDecision["aptitude"]): MatchDecision {
  return {
    schemaVersion: "1.0.0",
    decisionId: "dec-1",
    traceId: "trace-1",
    candidateId: "cand-1",
    vacancyId: "vac-1",
    strategy: "highs_milp",
    aptitude,
    score: {
      technicalRequirements: total,
      experienceEvidence: total,
      availability: total,
      transportAccessibility: total,
      salaryConditions: total,
      weightedTotal: total,
    },
    hardConstraints: {
      mandatorySkills: "pass",
      schedule: "pass",
      salary: "pass",
      capacity: "pass",
      geographic: "pass",
    },
    transport: { feasible: true, source: "local_matrix" },
    gaps: [],
    biasAlerts: [],
    promotion: null,
    tieBreak: {
      deterministic: true,
      usedProtectedAttributes: false,
      usedRandomness: false,
    },
    reasons: [{ code: "score", message: "weighted total recorded" }],
  };
}

describe("assumed #8 and #9 signatures", () => {
  it("keeps the published match weights at 100%", () => {
    const sum = Object.values(MATCH_WEIGHTS).reduce((total, weight) => total + weight, 0);
    expect(sum).toBeCloseTo(1);
    expect(APTITUDE_THRESHOLDS).toEqual({ apt: 75, aptWithGaps: 50 });
  });

  it("maps weighted totals onto the three aptitude bands", () => {
    expect(aptitudeForWeightedTotal(75)).toBe("apt");
    expect(aptitudeForWeightedTotal(100)).toBe("apt");
    expect(aptitudeForWeightedTotal(74)).toBe("apt_with_gaps");
    expect(aptitudeForWeightedTotal(50)).toBe("apt_with_gaps");
    expect(aptitudeForWeightedTotal(49)).toBe("not_currently_apt");
  });

  it("accepts a MatchDecision whose aptitude matches the band", () => {
    expect(() => assertMatchDecision(match(80, "apt"))).not.toThrow();
  });

  it("rejects a MatchDecision whose aptitude disagrees with the band", () => {
    expect(() => assertMatchDecision(match(80, "not_currently_apt"))).toThrow(/apt/);
  });

  it("rejects a tie break that uses randomness", () => {
    const invalid = match(80, "apt") as Omit<MatchDecision, "tieBreak"> & {
      tieBreak: { deterministic: boolean; usedProtectedAttributes: boolean; usedRandomness: boolean };
    };
    invalid.tieBreak = {
      deterministic: true,
      usedProtectedAttributes: false,
      usedRandomness: true,
    };
    expect(() => assertMatchDecision(invalid)).toThrow();
  });

  it("requires traceId and idempotencyKey on the workflow envelope", () => {
    expect(() =>
      assertWorkflowEnvelope({
        traceId: "trace-1",
        idempotencyKey: "idem-1",
        agent: "market_and_matching",
        schemaId: "https://puentelaboral.pa/schemas/assumed-match-decision.schema.json",
        guardrails: [{ stage: "output", allowed: true, code: "ok" }],
        dqlState: "validated",
      }),
    ).not.toThrow();
    expect(() =>
      assertWorkflowEnvelope({
        agent: "training",
        schemaId: "x",
        guardrails: [],
        dqlState: "received",
      }),
    ).toThrow(/traceId|idempotencyKey/);
  });

  it("requires actor, role, timestamp, reason, and traceId on an audit event", () => {
    expect(() =>
      assertAuditEvent({
        eventId: "evt-1",
        traceId: "trace-1",
        idempotencyKey: "idem-1",
        actor: "cand-1",
        role: "candidate",
        action: "submission",
        reason: "el candidato confirmó el envío",
        timestamp: "2026-10-16T18:00:00.000Z",
      }),
    ).not.toThrow();
    expect(() =>
      assertAuditEvent({
        eventId: "evt-1",
        idempotencyKey: "idem-1",
        actor: "cand-1",
        role: "candidate",
        action: "submission",
        reason: "falta la traza",
        timestamp: "2026-10-16T18:00:00.000Z",
      }),
    ).toThrow(/traceId/);
  });

  it("reads the reference page and checks it against the schema required fields", () => {
    const pagePath = fileURLToPath(new URL("../../../../docs/reference/assumed-contracts.md", import.meta.url));
    const page = readFileSync(pagePath, "utf8");
    const required = [
      ...matchDecisionSchema.required,
      ...auditEventSchema.required,
      ...workflowEnvelopeSchema.required,
    ];
    for (const name of required) {
      expect(page).toContain(name);
    }
    const session = page.slice(page.indexOf("## Better Auth session"));
    const signedAt = session.indexOf("export interface SignedBetterAuthSession");
    expect(signedAt).toBeGreaterThan(0);
    expect(session.slice(0, signedAt)).not.toContain("signature:");
    expect(session.slice(signedAt)).toContain("signature: string");
  });
});
