import { createSeedCatalog } from "@workbridge/catalog";
import { assertCandidatePreferences, assertCandidateProfile, makeCandidateId, type MatchDecision } from "@workbridge/domain";
import { auditCounterfactuals, biasSubjectFor } from "../bias/audit";
import { candidateContext, vacancyInput } from "../matching/catalog-input";
import { createMatchingService, matchingConfigFromEnv, toApplicationMatchDecision } from "../matching";
import { ApplicationError } from "./errors";
import { applicationEvidenceFromCertifications, type EvidenceItem } from "./evidence";
import type { SqlQuery } from "./store";

/**
 * What the seam knows about one candidate and one vacancy. It reports facts, not
 * policy: each consumer decides what an absent decision means (ADR-0010).
 */
export type DecisionOutcome =
  | { kind: "decision"; decision: MatchDecision; evidence: EvidenceItem[]; biasBlocked: boolean }
  /** The counterfactual audit blocked this candidate from this vacancy. */
  | { kind: "blocked" }
  | {
      kind: "unavailable";
      reason:
        /** The vacancy is not in our catalog. */
        | "not_applicable"
        /** A catalog vacancy, but this candidate has no persisted profile/preferences. */
        | "no_profile"
        /** No persistence is configured at all. */
        | "not_configured"
        /** The profile resolved, but the solver produced no decision for this vacancy. */
        | "no_decision";
    };

/** Trusted server seam. Neither ownership, match scores nor credential status come from application bodies. */
export interface ApplicationDecisionSource {
  ownerOf(vacancyId: string): string | undefined;
  isKnownVacancy(vacancyId: string): boolean;
  decisionFor(candidateId: string, vacancyId: string): Promise<DecisionOutcome>;
}

/** Rank only the seeded demo catalog, owned by the organization created by seed-roles. */
export function createApplicationDecisionSource(options: {
  query?: SqlQuery;
  env: Record<string, string | undefined>;
  clock: () => string;
}): ApplicationDecisionSource {
  const catalog = createSeedCatalog();
  const roleEnv = (options.env.AUTH_SEED_ENV ?? options.env.NODE_ENV ?? "development")
    .toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const organization = `employer_org_${roleEnv}`;
  const matching = createMatchingService(matchingConfigFromEnv(options.env));
  const knownVacancy = (vacancyId: string) => catalog.get(vacancyId) !== undefined;
  return {
    isKnownVacancy(vacancyId) {
      return knownVacancy(vacancyId);
    },
    ownerOf(vacancyId) {
      return knownVacancy(vacancyId) ? organization : undefined;
    },
    async decisionFor(candidateId, vacancyId) {
      const vacancy = catalog.get(vacancyId);
      if (!vacancy) return { kind: "unavailable", reason: "not_applicable" };
      if (!options.query) return { kind: "unavailable", reason: "not_configured" };
      // Application ownership uses the Better Auth user id; intake persists its domain candidate id.
      const profileId = makeCandidateId(candidateId);
      const result = await options.query(
        `SELECT p.profile, c.preferences FROM candidate_profiles p
         JOIN candidate_preferences c ON c.candidate_id = p.candidate_id
         WHERE p.candidate_id = $1`,
        [profileId],
      );
      const row = result.rows[0];
      if (!row) return { kind: "unavailable", reason: "no_profile" };
      assertCandidateProfile(row.profile);
      assertCandidatePreferences(row.preferences);
      if (row.profile.candidate_id !== profileId || row.preferences.candidate_id !== profileId) {
        throw new ApplicationError("Persisted candidate records do not match.", 422, "inconsistent_match");
      }
      const now = () => new Date(options.clock());
      const input = {
        profile: row.profile,
        context: candidateContext(row.preferences),
        vacancies: [vacancyInput(vacancy)],
        now,
      };
      const baseline = await matching.nominateForCandidate(input);
      const audited = await auditCounterfactuals({ input, baseline, matching, now, subject: biasSubjectFor(input) });
      const biasBlocked = audited.blockedVacancyIds.includes(vacancyId);
      const decision = audited.match?.result.decisions[0];
      if (biasBlocked) return { kind: "blocked" };
      if (!decision) return { kind: "unavailable", reason: "no_decision" };
      // The auditor, not the vacancy document, is the source of bias alerts.
      const biasAlerts = audited.alerts
        .filter((alert) => alert.vacancyId === vacancyId)
        .map(({ id, reason }) => ({ id, reason }));
      return {
        kind: "decision",
        biasBlocked,
        evidence: applicationEvidenceFromCertifications(row.profile.certifications),
        decision: { ...toApplicationMatchDecision(decision, input.vacancies[0]!.document), candidateId, biasAlerts },
      };
    },
  };
}
