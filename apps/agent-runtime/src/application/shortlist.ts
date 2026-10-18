import { createSeedCatalog } from "@workbridge/catalog";
import { assertCandidatePreferences, assertCandidateProfile, makeCandidateId, type MatchDecision } from "@workbridge/domain";
import { auditCounterfactuals, biasSubjectFor } from "../bias/audit";
import { candidateContext, vacancyInput } from "../matching/catalog-input";
import { createMatchingService, matchingConfigFromEnv, toApplicationMatchDecision } from "../matching";
import { ApplicationError } from "./errors";
import type { SqlQuery } from "./store";

/** Trusted server seam. Neither ownership nor match scores come from application bodies. */
export interface ShortlistSource {
  ownerOf(vacancyId: string): string | undefined;
  isKnownVacancy(vacancyId: string): boolean;
  match(candidateId: string, vacancyId: string): Promise<{ decision?: MatchDecision; biasBlocked: boolean }>;
}

/** Rank only the seeded demo catalog, owned by the organization created by seed-roles. */
export function createShortlistSource(options: {
  query?: SqlQuery;
  env: Record<string, string | undefined>;
  clock: () => string;
}): ShortlistSource {
  const catalog = createSeedCatalog();
  const roleEnv = (options.env.AUTH_SEED_ENV ?? options.env.NODE_ENV ?? "development")
    .toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const organization = `employer_org_${roleEnv}`;
  const matching = createMatchingService(matchingConfigFromEnv(options.env));
  return {
    isKnownVacancy(vacancyId) {
      return catalog.get(vacancyId) !== undefined;
    },
    ownerOf(vacancyId) {
      return catalog.get(vacancyId) ? organization : undefined;
    },
    async match(candidateId, vacancyId) {
      const vacancy = catalog.get(vacancyId);
      if (!vacancy) return { biasBlocked: false };
      if (!options.query) {
        throw new ApplicationError("Shortlist requires persisted candidate profiles and preferences.", 503, "shortlist_unavailable");
      }
      // Application ownership uses the Better Auth user id; intake persists its domain candidate id.
      const profileId = makeCandidateId(candidateId);
      const result = await options.query(
        `SELECT p.profile, c.preferences FROM candidate_profiles p
         JOIN candidate_preferences c ON c.candidate_id = p.candidate_id
         WHERE p.candidate_id = $1`,
        [profileId],
      );
      const row = result.rows[0];
      if (!row) return { biasBlocked: false };
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
      const decision = audited.match?.result.decisions[0];
      // The auditor, not the vacancy document, is the source of bias alerts.
      const biasAlerts = audited.alerts
        .filter((alert) => alert.vacancyId === vacancyId)
        .map(({ id, reason }) => ({ id, reason }));
      return {
        biasBlocked: audited.blockedVacancyIds.includes(vacancyId),
        ...(decision
          ? { decision: { ...toApplicationMatchDecision(decision, input.vacancies[0]!.document), candidateId, biasAlerts } }
          : {}),
      };
    },
  };
}
