import { greedyAssignment } from "./greedy";
import {
  buildAssignmentModel,
  type AssignmentPair,
  type MilpModel,
  type MilpSolverPort,
  type MilpVariable,
} from "./model";

export interface AssignmentSolveResult {
  /** `solver.name` when the MILP solved; `"greedy_fallback"` otherwise. */
  solver: string;
  selected: AssignmentPair[];
  objectiveValue: number;
  fallbackReason?: string;
}

interface NamedPair {
  name: string;
  pair: AssignmentPair;
}

function cloneForFixation(
  variables: readonly MilpVariable[],
  targetName: string,
  fixed: ReadonlyMap<string, number>,
): MilpVariable[] {
  return variables.map((variable) => {
    const pinned = fixed.get(variable.name);
    return {
      name: variable.name,
      cost: variable.name === targetName ? 1 : 0,
      lower: pinned ?? 0,
      upper: pinned ?? 1,
      integer: true,
    };
  });
}

/**
 * Make a maximum-score solution a pure function of the pairs. Walking the pairs
 * in the documented order, each pair is included exactly when a completion that
 * still reaches `targetScore` exists. This resolves the residual ties the MILP
 * objective is indifferent to, so the result never depends on which optimum the
 * solver internals happened to return.
 *
 * Returns `null` if a refinement solve fails, so the caller keeps the base solve.
 */
async function canonicalSelection(
  variables: readonly NamedPair[],
  targetScore: number,
  baseModel: MilpModel,
  solver: MilpSolverPort,
): Promise<AssignmentPair[] | null> {
  const scoreCoefficients: Record<string, number> = {};
  for (const variable of variables) scoreCoefficients[variable.name] = variable.pair.score;

  const fixed = new Map<string, number>();
  for (const variable of variables) {
    const model: MilpModel = {
      sense: "maximize",
      variables: cloneForFixation(baseModel.variables, variable.name, fixed),
      constraints: [
        ...baseModel.constraints,
        {
          name: "score_target",
          coefficients: scoreCoefficients,
          lower: targetScore,
          upper: targetScore,
        },
      ],
    };
    try {
      const result = await solver.solve(model);
      if (result.status !== "optimal") return null;
      fixed.set(variable.name, (result.values[variable.name] ?? 0) > 0.5 ? 1 : 0);
    } catch {
      return null;
    }
  }

  return variables
    .filter((variable) => fixed.get(variable.name) === 1)
    .map((variable) => variable.pair);
}

function sumScores(pairs: readonly AssignmentPair[]): number {
  return pairs.reduce((sum, pair) => sum + pair.score, 0);
}

/**
 * Solve the capacity-constrained assignment with the MILP solver. Any non-
 * optimal status or solver error falls back to the deterministic greedy
 * assignment, recording why. An optimal MILP solution is then canonicalized to
 * the documented deterministic order, so the result is reproducible.
 */
export async function solveAssignment(
  pairs: readonly AssignmentPair[],
  capacities: ReadonlyMap<string, number>,
  solver: MilpSolverPort,
): Promise<AssignmentSolveResult> {
  const { model, variables } = buildAssignmentModel(pairs, capacities);

  try {
    const solution = await solver.solve(model);
    if (solution.status === "optimal") {
      const baseSelected: AssignmentPair[] = [];
      for (const variable of variables) {
        if ((solution.values[variable.name] ?? 0) > 0.5) baseSelected.push(variable.pair);
      }
      // The reported objective stays the sum of selected scores, so the MILP and
      // greedy paths agree and stay human-meaningful.
      const objectiveValue = sumScores(baseSelected);
      const canonical = await canonicalSelection(
        variables,
        objectiveValue,
        model,
        solver,
      );
      if (canonical === null) {
        return {
          solver: solver.name,
          selected: baseSelected,
          objectiveValue,
          fallbackReason:
            "Deterministic tie-break canonicalization failed; used the MILP optimum.",
        };
      }
      return { solver: solver.name, selected: canonical, objectiveValue: sumScores(canonical) };
    }

    const greedy = greedyAssignment(pairs, capacities);
    return {
      solver: "greedy_fallback",
      ...greedy,
      fallbackReason: `MILP solver returned "${solution.status}".`,
    };
  } catch (error) {
    const greedy = greedyAssignment(pairs, capacities);
    return {
      solver: "greedy_fallback",
      ...greedy,
      fallbackReason:
        error instanceof Error ? error.message : "The MILP solver failed unexpectedly.",
    };
  }
}
