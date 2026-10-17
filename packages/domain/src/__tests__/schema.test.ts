import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  assertJobRequirements,
  validateJobRequirements,
  type JobRequirements,
} from "@puente/domain";

function minimalDocument(): JobRequirements {
  return {
    schemaVersion: SCHEMA_VERSION,
    vacancyId: "vac-1",
    title: "Vacante de prueba",
    employer: null,
    source: "manual",
    capturedAt: "2026-10-16T12:00:00.000Z",
    locale: "es-PA",
    taxonomyVersion: "2026.10.0-pa-seed",
    status: "accepted",
    location: { country: "PA", province: null, district: null, raw: null },
    requirements: [],
    alerts: [],
    reviewQueue: [],
    blockingReasons: [],
    metadata: {
      inputKind: "manual",
      extractor: "structured",
      extractedAt: "2026-10-16T12:00:00.000Z",
      rawText: null,
      requirementCount: 0,
      mandatoryCount: 0,
      desirableCount: 0,
      alertCount: 0,
      excludedCount: 0,
    },
  };
}

describe("JobRequirements schema", () => {
  it("accepts a minimal valid document", () => {
    expect(validateJobRequirements(minimalDocument())).toBe(true);
    expect(() => assertJobRequirements(minimalDocument())).not.toThrow();
  });

  it("rejects an unknown status", () => {
    const invalid = { ...minimalDocument(), status: "maybe" };
    expect(validateJobRequirements(invalid)).toBe(false);
    expect(() => assertJobRequirements(invalid)).toThrow();
  });

  it("rejects unexpected top-level properties", () => {
    const invalid = { ...minimalDocument(), unexpected: true };
    expect(validateJobRequirements(invalid)).toBe(false);
  });

  it("rejects a non ISO-8601 capturedAt", () => {
    const invalid = { ...minimalDocument(), capturedAt: "yesterday" };
    expect(validateJobRequirements(invalid)).toBe(false);
  });
});
