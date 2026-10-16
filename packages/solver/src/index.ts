export type {
  Aptitude,
  CandidateAvailability,
  CandidateSkillSignal,
  CandidateTransport,
  EvidenceSource,
  GeoPoint,
  HardConstraintId,
  HardConstraintResult,
  HumanApprovalDecision,
  MatchDecision,
  MatchOptions,
  PromotionRecord,
  RouteEstimate,
  RouteRequest,
  RoutingPort,
  ScoreBreakdownItem,
  ScoreDimension,
  SkillLevel,
  SolverCandidate,
  SolverVacancy,
  TransportMode,
  VacancyRequirement,
  VacancySchedule,
} from "./types";

export {
  APT_THRESHOLD,
  APT_WITH_GAPS_THRESHOLD,
  MATCH_WEIGHTS,
  PROMOTION_BAND,
  PROMOTION_POINTS,
  clampScore,
  classifyAptitude,
  weightedScore,
} from "./weights";

export {
  DESIRABLE_FACTOR,
  EVIDENCE_SATURATION,
  availabilityScore,
  bestSkillSignal,
  experienceScore,
  salaryScore,
  scheduleCoverage,
  technicalScore,
  transportScore,
  type DimensionScore,
  type ScheduleCoverage,
} from "./scoring";

export {
  evaluateHardConstraints,
  failedConstraintIds,
  salaryFloor,
  type ConstraintInput,
} from "./constraints";

export {
  createGoogleMapsRouter,
  createRoutingPort,
  haversineKm,
  localMatrixRouter,
  type GoogleMapsRouterOptions,
  type RoutingPortOptions,
} from "./routing";

export { buildTieBreakKey, compareDecisions, type TieBreakParts } from "./ties";

export {
  applyPromotion,
  resolvePromotion,
  type ApplyPromotionInput,
  type PromotionInput,
  type PromotionOutcome,
} from "./promotion";

export { buildBaseDecision, evaluateMatch } from "./match";

export { MATCH_DECISION_SCHEMA_ID, validateMatchDecision } from "./validate";

export {
  InvalidMatchDecisionError,
  RoutingUnavailableError,
  SolverInputError,
} from "./errors";

export {
  buildAssignmentModel,
  type AssignmentModel,
  type AssignmentPair,
  type MilpConstraint,
  type MilpModel,
  type MilpSolution,
  type MilpSolverPort,
  type MilpStatus,
  type MilpVariable,
} from "./milp/model";

export { greedyAssignment, type GreedyResult } from "./milp/greedy";

export { solveAssignment, type AssignmentSolveResult } from "./milp/assignment";

export { highsMilpSolver } from "./milp/highs";

export {
  nominate,
  type NominationProblem,
  type NominationResult,
} from "./nominate";
