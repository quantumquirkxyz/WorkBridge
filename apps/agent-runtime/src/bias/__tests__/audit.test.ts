import { describe, expect, it, vi } from "vitest";
import { MatchingService } from "../../matching/service";
import { matchingConfigFromEnv } from "../../matching/config";
import {
  candidateProfile,
  CANDIDATE_CONTEXT,
  objectiveDocument,
  VACANCY_CONTEXT,
  now,
} from "../../matching/__tests__/helpers";
import { applyCounterfactual, auditCounterfactuals, COUNTERFACTUAL_ATTRIBUTES } from "../audit";

const subject = { holderName: "María González", genderMarker: "femenino", corregimiento: "Panamá" };

async function fixture() {
  const config = matchingConfigFromEnv({});
  const matching = new MatchingService({ routing: config.routing, geocoding: config.geocoding });
  const input = {
    profile: candidateProfile(),
    context: structuredClone(CANDIDATE_CONTEXT),
    vacancies: [{ document: await objectiveDocument(), context: VACANCY_CONTEXT }],
    biasSubject: subject,
    now,
  };
  input.profile.experiences[0]!.description = "María González: género femenino, experiencia formal";
  return { input, matching };
}

describe("counterfactual audit", () => {
  it("substitutes only the selected attribute without changing the original input or skill facts", async () => {
    const { input } = await fixture();
    const original = structuredClone({ ...input, now: undefined });
    const name = applyCounterfactual(input, "holder_name", subject);
    const gender = applyCounterfactual(input, "gender_marker", subject);
    const location = applyCounterfactual(input, "corregimiento", subject);

    expect(name.profile.experiences[0]?.description).toBe("Alexis Quintero: género femenino, experiencia formal");
    expect(gender.profile.experiences[0]?.description).toBe("María González: género masculino, experiencia formal");
    expect(location.context.home.district).toBe("San Miguelito");
    expect(location.profile).toEqual(input.profile);
    expect(name.context).toEqual(input.context);
    expect(gender.context).toEqual(input.context);
    expect(name.profile.skills).toEqual(input.profile.skills);
    expect(gender.profile.skills).toEqual(input.profile.skills);
    expect({ ...input, now: undefined }).toEqual(original);
  });

  it("records score-band changes for all three reruns even when aptitude stays unchanged", async () => {
    const { input, matching } = await fixture();
    const baseline = await matching.nominateForCandidate(input);
    baseline.result.decisions = baseline.result.decisions.map((decision) => ({
      ...decision, score: 74, aptitude: "not_currently_apt",
    }));
    const rerun = structuredClone(baseline);
    rerun.result.decisions = rerun.result.decisions.map((decision) => ({ ...decision, score: 75 }));
    const nominate = vi.spyOn(matching, "nominateForCandidate").mockResolvedValue(rerun);

    const result = await auditCounterfactuals({ input, baseline, matching, now, subject });

    expect(nominate).toHaveBeenCalledTimes(3);
    expect(result.alerts.map((alert) => alert.attribute)).toEqual([...COUNTERFACTUAL_ATTRIBUTES]);
    expect(result.alerts.every((alert) => alert.reason.includes("score band apt_with_gaps to apt"))).toBe(true);
    expect(result.blockedVacancyIds).toEqual([input.vacancies[0]!.document.vacancyId]);
    expect(result.vacancies[0]?.status).toBe("blocked");
    expect(result.match?.result.decisions).toEqual([]);
    expect(result.match?.result.assignments).toEqual([]);
    expect(result.match?.skippedVacancyIds).toHaveLength(1);
  });
});
