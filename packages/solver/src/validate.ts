import { ajv } from "@workbridge/domain";
import type { MatchDecision } from "./types";
import matchDecisionSchema from "./schemas/match-decision.schema.json";

/** Compiled against the shared Ajv 2020-12 instance from `@workbridge/domain`. */
export const validateMatchDecision = ajv.compile<MatchDecision>(matchDecisionSchema);

export const MATCH_DECISION_SCHEMA_ID = matchDecisionSchema.$id;
