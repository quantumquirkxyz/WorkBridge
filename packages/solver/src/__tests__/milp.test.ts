import { describe, expect, it } from "vitest";
import { solveAssignment } from "../milp/assignment";
import { greedyAssignment } from "../milp/greedy";
import { highsMilpSolver, resetHiGHSInstance, serializeMilpToLp } from "../milp/highs";
import {
  buildAssignmentModel,
  type AssignmentPair,
  type MilpModel,
  type MilpSolverPort,
} from "../milp/model";

const pairs: AssignmentPair[] = [
  { candidateId: "c1", vacancyId: "v1", score: 90 },
  { candidateId: "c1", vacancyId: "v2", score: 80 },
  { candidateId: "c2", vacancyId: "v1", score: 70 },
];

const capacities = new Map<string, number>([
  ["v1", 1],
  ["v2", 1],
]);

describe("buildAssignmentModel", () => {
  it("creates one binary variable per pair", () => {
    const { model, variables } = buildAssignmentModel(pairs, capacities);
    expect(model.sense).toBe("maximize");
    expect(model.variables).toHaveLength(3);
    expect(model.variables.every((variable) => variable.integer)).toBe(true);
    expect(variables.map((variable) => variable.name)).toEqual(["x0", "x1", "x2"]);
  });

  it("caps candidates at one and vacancies at capacity", () => {
    const { model } = buildAssignmentModel(pairs, capacities);
    expect(model.constraints).toHaveLength(4);
    const candidateRow = model.constraints.find((constraint) =>
      constraint.name.startsWith("cand"),
    );
    const vacancyRows = model.constraints.filter((constraint) =>
      constraint.name.startsWith("vac"),
    );
    expect(candidateRow?.upper).toBe(1);
    expect(vacancyRows.map((row) => row.upper).sort()).toEqual([1, 1]);
  });

  it("orders equal-score pairs by vacancy id then candidate id", () => {
    const tied: AssignmentPair[] = [
      { candidateId: "c2", vacancyId: "v1", score: 50 },
      { candidateId: "c1", vacancyId: "v1", score: 50 },
      { candidateId: "c1", vacancyId: "v0", score: 50 },
    ];
    const { variables } = buildAssignmentModel(tied, capacities);
    expect(
      variables.map((variable) => `${variable.pair.vacancyId}:${variable.pair.candidateId}`),
    ).toEqual(["v0:c1", "v1:c1", "v1:c2"]);
  });
});

describe("serializeMilpToLp", () => {
  it("emits an LP model HiGHS can parse", () => {
    const { model } = buildAssignmentModel(pairs, capacities);
    const lp = serializeMilpToLp(model);
    expect(lp).toContain("Maximize");
    expect(lp).toContain("Subject To");
    expect(lp).toContain("General");
    expect(lp).toContain("End");
    expect(lp).toContain("90 x0");
  });

  it("emits an equality row when a constraint is fixed", () => {
    const { model } = buildAssignmentModel(pairs, capacities);
    const fixed: MilpModel = {
      ...model,
      constraints: [
        ...model.constraints,
        {
          name: "score_target",
          coefficients: { x0: 90, x1: 80, x2: 70 },
          lower: 150,
          upper: 150,
        },
      ],
    };
    expect(serializeMilpToLp(fixed)).toContain(
      "score_target: 90 x0 + 80 x1 + 70 x2 = 150",
    );
  });
});

describe("greedyAssignment", () => {
  it("is deterministic and respects capacities", () => {
    const first = greedyAssignment(pairs, capacities);
    const second = greedyAssignment(pairs, capacities);
    expect(first).toEqual(second);
    expect(first.selected).toEqual([
      { candidateId: "c1", vacancyId: "v1", score: 90 },
    ]);
    expect(first.objectiveValue).toBe(90);
  });

  it("prefers the documented pair order on equal scores", () => {
    const tied: AssignmentPair[] = [
      { candidateId: "c2", vacancyId: "v1", score: 50 },
      { candidateId: "c1", vacancyId: "v1", score: 50 },
    ];
    const result = greedyAssignment(tied, new Map([["v1", 1]]));
    expect(result.selected.map((pair) => pair.candidateId)).toEqual(["c1"]);
  });
});

describe("solveAssignment", () => {
  it("selects the variables the MILP marks as chosen", async () => {
    const fakeSolver: MilpSolverPort = {
      name: "fake",
      async solve(): Promise<{ status: "optimal"; objectiveValue: number; values: Record<string, number> }> {
        return { status: "optimal", objectiveValue: 150, values: { x0: 0, x1: 1, x2: 1 } };
      },
    };
    const result = await solveAssignment(pairs, capacities, fakeSolver);
    expect(result.solver).toBe("fake");
    expect(result.selected.map((pair) => `${pair.candidateId}-${pair.vacancyId}`)).toEqual([
      "c1-v2",
      "c2-v1",
    ]);
  });

  it("falls back to greedy on a non-optimal status", async () => {
    const infeasible: MilpSolverPort = {
      name: "fake",
      async solve() {
        return { status: "infeasible", objectiveValue: null, values: {} };
      },
    };
    const result = await solveAssignment(pairs, capacities, infeasible);
    expect(result.solver).toBe("greedy_fallback");
    expect(result.fallbackReason).toContain("infeasible");
    expect(result.selected).toHaveLength(1);
  });

  it("falls back to greedy when the solver throws", async () => {
    const broken: MilpSolverPort = {
      name: "fake",
      async solve() {
        throw new Error("wasm blew up");
      },
    };
    const result = await solveAssignment(pairs, capacities, broken);
    expect(result.solver).toBe("greedy_fallback");
    expect(result.fallbackReason).toBe("wasm blew up");
  });

  it("solves the real assignment with HiGHS better than greedy", async () => {
    resetHiGHSInstance();
    const result = await solveAssignment(pairs, capacities, highsMilpSolver);
    expect(result.solver).toBe("highs");
    expect(result.objectiveValue).toBe(150);
    expect(
      result.selected
        .map((pair) => `${pair.candidateId}-${pair.vacancyId}`)
        .sort(),
    ).toEqual(["c1-v2", "c2-v1"]);
  });

  it("returns an empty optimum for an empty problem", async () => {
    resetHiGHSInstance();
    const model: MilpModel = { sense: "maximize", variables: [], constraints: [] };
    const solution = await highsMilpSolver.solve(model);
    expect(solution).toEqual({ status: "optimal", objectiveValue: 0, values: {} });
  });
});
