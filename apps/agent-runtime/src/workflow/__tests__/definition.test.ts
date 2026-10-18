import { describe, expect, it } from "vitest";
import { loadWorkflowDefinition } from "../definition";

describe("WorkBridge workflow definition", () => {
  it("loads the YAML state machine with typed ordered transitions", () => {
    const definition = loadWorkflowDefinition();

    expect(definition).toMatchObject({
      id: "workbridge-employability",
      version: 1,
      states: ["exploration", "profile_and_evidence", "market_and_matching", "training"],
      transitions: {
        exploration: "profile_and_evidence",
        profile_and_evidence: "market_and_matching",
        market_and_matching: "training",
      },
    });
  });
});
