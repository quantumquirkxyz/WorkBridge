import { buildBaseDecision } from "./match";
import { solveAssignment } from "./milp/assignment";
import { highsMilpSolver } from "./milp/highs";
import type { MilpSolverPort } from "./milp/model";
import { applyPromotion } from "./promotion";
import type {
  HumanApprovalDecision,
  MatchDecision,
  RoutingPort,
  SolverCandidate,
  SolverVacancy,
} from "./types";

export interface NominationProblem {
  candidates: readonly SolverCandidate[];
  vacancies: readonly SolverVacancy[];
  now?: () => Date;
  routing?: RoutingPort;
  /** Explicit human approvals for one-point promotions. */
  approvals?: readonly HumanApprovalDecision[];
  /** Override the MILP solver; tests inject a deterministic fake. */
  solver?: MilpSolverPort;
}

export interface NominationResult {
  /** `"highs"` when the MILP solved, `"greedy_fallback"` otherwise. */
  solver: string;
  /** Every candidate/vacancy pair decision, promotion finalized. */
  decisions: MatchDecision[];
  /** The selected assignments under capacity. */
  assignments: MatchDecision[];
  fallbackReason?: string;
  solvedAt: string;
}

function pairKey(candidateId: string, vacancyId: string): string {
  return `${candidateId}__${vacancyId}`;
}

/**
 * Nominate candidates to vacancies. Scoring is deterministic per pair; the
 * selection across pairs is a capacity-constrained assignment solved with a
 * HiGHS MILP and a deterministic greedy fallback. Promotion always carries peer
 * evidence from the same vacancy, so "no better eligible candidate exists" is
 * evaluated against the real cohort.
 */
export async function nominate(problem: NominationProblem): Promise<NominationResult> {
  const now = problem.now ?? (() => new Date());
  const solver = problem.solver ?? highsMilpSolver;
  const matchOptions = { now, routing: problem.routing };

  const baseDecisions: MatchDecision[] = [];
  for (const candidate of problem.candidates) {
    for (const vacancy of problem.vacancies) {
      baseDecisions.push(await buildBaseDecision(candidate, vacancy, matchOptions));
    }
  }

  const byVacancy = new Map<string, MatchDecision[]>();
  for (const decision of baseDecisions) {
    const group = byVacancy.get(decision.vacancyId);
    if (group) group.push(decision);
    else byVacancy.set(decision.vacancyId, [decision]);
  }

  const decisions = baseDecisions.map((decision) => {
    const peerScores = (byVacancy.get(decision.vacancyId) ?? [])
      .filter(
        (peer) =>
          peer.candidateId !== decision.candidateId && peer.failedConstraints.length === 0,
      )
      .map((peer) => peer.score);

    const approval: HumanApprovalDecision | undefined = problem.approvals?.find(
      (item) =>
        item.candidateId === decision.candidateId &&
        item.vacancyId === decision.vacancyId,
    );

    return applyPromotion(decision, {
      peerScores,
      approved: approval?.approved === true,
    });
  });

  const capacities = new Map<string, number>();
  for (const vacancy of problem.vacancies) {
    capacities.set(vacancy.vacancyId, vacancy.capacity);
  }

  const pairs = decisions
    .filter((decision) => decision.failedConstraints.length === 0)
    .map((decision) => ({
      candidateId: decision.candidateId,
      vacancyId: decision.vacancyId,
      score: decision.score,
    }));

  const solved = await solveAssignment(pairs, capacities, solver);

  const decisionIndex = new Map(
    decisions.map((decision) => [
      pairKey(decision.candidateId, decision.vacancyId),
      decision,
    ]),
  );

  const assignments: MatchDecision[] = [];
  for (const pair of solved.selected) {
    const decision = decisionIndex.get(pairKey(pair.candidateId, pair.vacancyId));
    if (decision) assignments.push(decision);
  }

  return {
    solver: solved.solver,
    decisions,
    assignments,
    ...(solved.fallbackReason !== undefined
      ? { fallbackReason: solved.fallbackReason }
      : {}),
    solvedAt: now().toISOString(),
  };
}
