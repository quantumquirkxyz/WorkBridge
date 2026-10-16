import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  evaluateGuardrailFixture,
  findPii,
  screenPermission,
  screenRequestedTool,
  screenToolResult,
  type GuardrailFixture,
} from "../guardrails";

const fixtures = JSON.parse(
  readFileSync(new URL("../../../fixtures/guardrails/cases.json", import.meta.url), "utf8"),
) as GuardrailFixture[];

describe("guardrail fixtures", () => {
  it("covers the ten required cases", () => {
    expect(fixtures).toHaveLength(10);
    const codes = new Set(fixtures.map((fixture) => fixture.expect.code));
    expect(codes).toEqual(
      new Set(["prompt_injection", "pii_leak", "invalid_schema", "invented_credential", "unauthorized_tool", "ok"]),
    );
  });

  it.each(fixtures.map((fixture) => [fixture.id, fixture] as const))(
    "%s",
    (_id, fixture) => {
      const decision = evaluateGuardrailFixture(fixture);
      expect(decision.allowed).toBe(fixture.expect.allowed);
      expect(decision.code).toBe(fixture.expect.code);
      expect(decision.stage).toBe(fixture.stage);
    },
  );

  it("blocks a phone number in model output", () => {
    expect(findPii("Llamar al 6000-1234")).toBe("phone");
  });

  it("blocks an employer from reading the candidate CV", () => {
    const decision = screenPermission({
      tool: "read_cv",
      agent: "profile_and_evidence",
      role: "employer",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("unauthorized_tool");
  });

  it("checks a requested tool against the agent that owns it", () => {
    const decision = screenRequestedTool("read_cv", "employer");
    expect(decision.stage).toBe("permission");
    expect(decision.code).toBe("unauthorized_tool");
  });

  it("keeps a permission denial on the permission stage", () => {
    const decision = screenToolResult({
      tool: "read_cv",
      agent: "profile_and_evidence",
      role: "employer",
      body: "Credencial: AWS Certified Solutions Architect",
      declaredCredentials: [],
    });
    expect(decision.stage).toBe("permission");
    expect(decision.code).toBe("unauthorized_tool");
  });
});
