import loadHighs from "highs";
import type { Highs } from "highs";
import type { MilpModel, MilpSolution, MilpSolverPort, MilpStatus } from "./model";

type HighsSolveResult = ReturnType<Highs["solve"]>;

let instancePromise: Promise<Highs> | null = null;

/** Load and cache the HiGHS Wasm runtime. */
function loadInstance(): Promise<Highs> {
  if (instancePromise === null) {
    instancePromise = loadHighs();
  }
  return instancePromise;
}

/** Test seam: forget the cached instance. */
export function resetHiGHSInstance(): void {
  instancePromise = null;
}

function linearExpression(coefficients: Record<string, number>): string {
  const terms: string[] = [];
  for (const [name, coefficient] of Object.entries(coefficients)) {
    if (coefficient === 0) continue;
    terms.push(coefficient === 1 ? name : `${coefficient} ${name}`);
  }
  return terms.length > 0 ? terms.join(" + ") : "0";
}

/** Serialize a model to the CPLEX LP format accepted by `highs.solve`. */
export function serializeMilpToLp(model: MilpModel): string {
  const lines: string[] = [];
  lines.push(model.sense === "maximize" ? "Maximize" : "Minimize");

  const objective = model.variables
    .map((variable) => `${variable.cost} ${variable.name}`)
    .join(" + ");
  lines.push(` obj: ${objective.length > 0 ? objective : "0"}`);

  lines.push("Subject To");
  if (model.constraints.length === 0) {
    lines.push(" trivial: 0 <= 1");
  }
  for (const constraint of model.constraints) {
    const expression = linearExpression(constraint.coefficients);
    const hasLower = constraint.lower !== undefined && constraint.lower > 0;
    const hasUpper = constraint.upper !== undefined;
    if (hasLower && hasUpper) {
      lines.push(
        ` ${constraint.name}: ${constraint.lower!} <= ${expression} <= ${constraint.upper!}`,
      );
    } else if (hasUpper) {
      lines.push(` ${constraint.name}: ${expression} <= ${constraint.upper!}`);
    } else if (hasLower) {
      lines.push(` ${constraint.name}: ${expression} >= ${constraint.lower!}`);
    }
  }

  lines.push("Bounds");
  for (const variable of model.variables) {
    if (variable.lower > 0) {
      lines.push(` ${variable.name} >= ${variable.lower}`);
    }
    if (Number.isFinite(variable.upper)) {
      lines.push(` ${variable.name} <= ${variable.upper}`);
    }
  }

  const integers = model.variables.filter((variable) => variable.integer).map((v) => v.name);
  if (integers.length > 0) {
    lines.push("General");
    lines.push(` ${integers.join(" ")}`);
  }

  lines.push("End");
  return lines.join("\n");
}

function mapStatus(status: string): MilpStatus {
  switch (status) {
    case "Optimal":
      return "optimal";
    case "Infeasible":
    case "Primal infeasible or unbounded":
      return "infeasible";
    case "Unbounded":
      return "unbounded";
    default:
      return "error";
  }
}

function readSolution(model: MilpModel, result: HighsSolveResult): MilpSolution {
  const status = mapStatus(result.Status);
  if (status !== "optimal") {
    return { status, objectiveValue: null, values: {} };
  }
  const columns = result.Columns as Record<string, { Primal?: number }>;
  const values: Record<string, number> = {};
  for (const variable of model.variables) {
    values[variable.name] = columns[variable.name]?.Primal ?? 0;
  }
  return {
    status: "optimal",
    objectiveValue: result.ObjectiveValue ?? null,
    values,
  };
}

/**
 * HiGHS MILP adapter. `random_seed` and `output_flag` are pinned so repeated
 * solves return the same assignment for the same model.
 */
export const highsMilpSolver: MilpSolverPort = {
  name: "highs",
  async solve(model: MilpModel): Promise<MilpSolution> {
    if (model.variables.length === 0) {
      return { status: "optimal", objectiveValue: 0, values: {} };
    }
    const highs = await loadInstance();
    const result = highs.solve(serializeMilpToLp(model), {
      output_flag: false,
      presolve: "on",
      random_seed: 0,
    });
    return readSolution(model, result);
  },
};
