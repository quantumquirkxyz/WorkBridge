export type {
  AvailabilityWindow,
  BuildRoadmapOptions,
  CoveredSkill,
  DeriveGapsInput,
  ExcludedOpportunity,
  GapContribution,
  GapKind,
  HeldSkill,
  Modality,
  OpportunityFreshness,
  OpportunitySchedule,
  OpportunityType,
  RankedOpportunity,
  RankingBreakdownItem,
  RankingDimension,
  Roadmap,
  RoadmapConstraints,
  RoadmapRecommendation,
  RoadmapRequest,
  RoadmapTotals,
  TrainingCatalog,
  TrainingGap,
  TrainingOpportunity,
  TrainingPreferences,
} from "./types";

export { loadCatalog } from "./catalog";

export {
  FRESH_HOURS,
  STALE_HOURS,
  freshnessLabelEs,
  opportunityFreshness,
} from "./freshness";

export {
  deriveGaps,
  effectiveRequiredLevel,
  gapDeficit,
  gapKindForSkill,
  gapLabel,
  gapLabelForSkill,
  heldSkillLevel,
} from "./gaps";

export {
  RANKING_DIMENSIONS,
  TRAINING_WEIGHTS,
  weightedTrainingScore,
} from "./weights";

export {
  AVG_KM_PER_MINUTE,
  COST_CEILING_SCORE,
  DURATION_REFERENCE_HOURS,
  NEUTRAL_GEOGRAPHY_SCORE,
  NON_PREFERRED_MODALITY_SCORE,
  SEATS_SATURATION,
  availabilityScore,
  costScore,
  coveredSkillLevel,
  credentialScore,
  durationScore,
  gapCoverageScore,
  geographyScore,
  modalityLabelEs,
  modalityScore,
  scheduleCoverage,
  scheduleScore,
  specializationOverlap,
  specializationScore,
  typeLabelEs,
  type DimensionScore,
  type GapCoverageScore,
  type ScheduleCoverage,
} from "./scoring";

export {
  rankOpportunities,
  staticExclusionReasons,
  type RankInput,
} from "./rank";

export {
  selectRoadmap,
  type OmittedOpportunity,
  type SelectedOpportunity,
  type SelectionResult,
} from "./select";

export { buildRoadmap, explanationEs } from "./roadmap";

export {
  ROADMAP_SCHEMA_ID,
  TRAINING_CATALOG_SCHEMA_ID,
  assertRoadmap,
  assertTrainingCatalog,
  validateRoadmap,
  validateTrainingCatalog,
} from "./validate";

export {
  InvalidRoadmapError,
  InvalidTrainingCatalogError,
  TrainingInputError,
} from "./errors";
