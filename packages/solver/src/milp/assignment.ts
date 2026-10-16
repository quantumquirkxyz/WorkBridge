import { greedyAssignment } from "./greedy";
import {
  buildAssignmentModel,
  type AssignmentPair,
  type MilpSolverPort,
} from "./model";

export interface AssignmentSolveResult {
  /** `solver.name` when the MILP solved; `"greedy_fallback"` otherwise. */
  solver: string;
  selected: AssignmentPair[];
  objectiveValue: number;
  fallbackReason?: string;
}

/**
 * Solve the capacity-constrained assignment with the MILP solver. Any non-
 * optimal status or solver error falls back to the deterministic greedy
 * assignment, recording why. The fallback is a pure function of the sorted
 * eligible pairs, so it is always reproducible.
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
      const selected: AssignmentPair[] = [];
      for (const variable of variables) {
        if ((solution.values[variable.name] ?? 0) > 0.5) selected.push(variable.pair);
      }
      return { solver: solver.name, selected, objectiveValue: solution.objectiveValue ?? 0 };
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
