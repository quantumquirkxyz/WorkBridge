import { compareCodeUnits, pairKey } from "../ties";

export interface MilpVariable {
  name: string;
  cost: number;
  lower: number;
  upper: number;
  integer: boolean;
}

export interface MilpConstraint {
  name: string;
  coefficients: Record<string, number>;
  lower?: number;
  upper?: number;
}

export interface MilpModel {
  sense: "maximize" | "minimize";
  variables: MilpVariable[];
  constraints: MilpConstraint[];
}

export type MilpStatus = "optimal" | "infeasible" | "unbounded" | "error";

export interface MilpSolution {
  status: MilpStatus;
  objectiveValue: number | null;
  values: Record<string, number>;
}

/** Pluggable MILP boundary so the assignment can be tested without HiGHS. */
export interface MilpSolverPort {
  readonly name: string;
  solve(model: MilpModel): Promise<MilpSolution>;
}

export interface AssignmentPair {
  candidateId: string;
  vacancyId: string;
  score: number;
}

export interface AssignmentModel {
  model: MilpModel;
  variables: { name: string; pair: AssignmentPair }[];
}

function coefficientsOf(names: readonly string[]): Record<string, number> {
  const coefficients: Record<string, number> = {};
  for (const name of names) coefficients[name] = 1;
  return coefficients;
}

/**
 * The documented deterministic pair order: higher score first, then vacancy id,
 * then candidate id. Both the MILP cost and the greedy fallback use it.
 */
function comparePairs(a: AssignmentPair, b: AssignmentPair): number {
  if (b.score !== a.score) return b.score - a.score;
  return compareCodeUnits(
    pairKey(a.vacancyId, a.candidateId),
    pairKey(b.vacancyId, b.candidateId),
  );
}

/**
 * Build the assignment MILP: one binary variable per eligible pair, at most one
 * vacancy per candidate, and at most `capacity` candidates per vacancy.
 *
 * Variables are emitted in the documented deterministic pair order (score desc,
 * then vacancy id, then candidate id); `solveAssignment` uses that order to break
 * residual solver ties lexicographically.
 */
export function buildAssignmentModel(
  pairs: readonly AssignmentPair[],
  capacities: ReadonlyMap<string, number>,
): AssignmentModel {
  const ordered = [...pairs].sort(comparePairs);
  const variables = ordered.map((pair, index) => ({ name: `x${index}`, pair }));
  const milpVariables: MilpVariable[] = variables.map((variable) => ({
    name: variable.name,
    cost: variable.pair.score,
    lower: 0,
    upper: 1,
    integer: true,
  }));

  const byCandidate = new Map<string, string[]>();
  const byVacancy = new Map<string, string[]>();
  for (const variable of variables) {
    const candidateRow = byCandidate.get(variable.pair.candidateId);
    if (candidateRow) candidateRow.push(variable.name);
    else byCandidate.set(variable.pair.candidateId, [variable.name]);

    const vacancyRow = byVacancy.get(variable.pair.vacancyId);
    if (vacancyRow) vacancyRow.push(variable.name);
    else byVacancy.set(variable.pair.vacancyId, [variable.name]);
  }

  const constraints: MilpConstraint[] = [];
  let rowIndex = 0;
  for (const names of byCandidate.values()) {
    constraints.push({
      name: `cand${rowIndex++}`,
      coefficients: coefficientsOf(names),
      lower: 0,
      upper: 1,
    });
  }
  for (const [vacancyId, names] of byVacancy.entries()) {
    constraints.push({
      name: `vac${rowIndex++}`,
      coefficients: coefficientsOf(names),
      lower: 0,
      upper: capacities.get(vacancyId) ?? 0,
    });
  }

  return {
    model: { sense: "maximize", variables: milpVariables, constraints },
    variables,
  };
}
