import { describe, expect, it } from "vitest";
import { AjvValidationError } from "@workbridge/domain";
import { assertCarrier, carrierSchema, type Carrier } from "../carrier";

const valid: Carrier = {
  traceId: "trace-0001",
  idempotencyKey: "idem-0001",
  candidateText: "Experiencia en caja.",
  vacancyText: "Se busca cajero.",
  declaredCredentials: [{ id: "cred-1", name: "Manipulación de alimentos" }],
  actorId: "cand-1",
  actorRole: "candidate",
  requestedTools: [],
  halted: false,
  status: "running",
  findings: [],
  summaries: [],
  modelFallbacks: [],
};

describe("workflow carrier", () => {
  it("accepts state that matches the JSON Schema", () => {
    expect(() => assertCarrier(valid)).not.toThrow();
    expect(carrierSchema["~standard"].validate(valid)).toEqual({ value: valid });
  });

  it("rejects state that breaks the JSON Schema", () => {
    const invalid = { ...valid, status: "pending" };
    expect(() => assertCarrier(invalid)).toThrow(AjvValidationError);
    const result = carrierSchema["~standard"].validate(invalid);
    expect("issues" in result ? result.issues.length : 0).toBeGreaterThan(0);
  });
});
