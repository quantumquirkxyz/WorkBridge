import type { CandidateProfile, IntakeSource, JobRequirements } from "@puente/domain";
import { normalizeProfileDraft } from "@puente/profile";
import { normalizeVacancy } from "../../vacancy/normalize";
import type { RawVacancy } from "../../vacancy/types";
import type { CandidateMatchContext, VacancyMatchContext } from "../adapt";
import { loadVacancyFixture } from "../../../test/load-fixture";

export const NOW = "2026-10-16T12:00:00.000Z";
export const now = () => new Date(NOW);

export async function objectiveDocument(): Promise<JobRequirements> {
  const vacancy = loadVacancyFixture<RawVacancy>("objective.json");
  return normalizeVacancy({ kind: "manual", vacancy }, { now });
}

export async function flaggedDocument(): Promise<JobRequirements> {
  const vacancy = loadVacancyFixture<RawVacancy>("age-limit.json");
  return normalizeVacancy({ kind: "manual", vacancy }, { now });
}

export async function blockedDocument(): Promise<JobRequirements> {
  const vacancy = loadVacancyFixture<RawVacancy>("good-appearance.json");
  return normalizeVacancy({ kind: "manual", vacancy }, { now });
}

export const VACANCY_CONTEXT: VacancyMatchContext = {
  schedule: { days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 1020, weeklyHours: 45 },
  salaryMinUsd: 500,
  salaryMaxUsd: 800,
  capacity: 2,
};

export const CANDIDATE_CONTEXT: CandidateMatchContext = {
  home: { country: "PA", province: "Panamá", district: "Panamá", raw: null },
  availability: { days: [1, 2, 3, 4, 5], startMinute: 420, endMinute: 1080, weeklyHours: 50 },
  transport: { hasVehicle: true, maxCommuteMinutes: 60, modes: ["driving"] },
  expectedSalaryUsd: 700,
  minimumSalaryUsd: 600,
};

const SOURCE: IntakeSource = {
  kind: "text",
  ref: "intake:test",
  extraction_method: "declared",
  extracted_at: NOW,
};

export function candidateProfile(): CandidateProfile {
  return normalizeProfileDraft(
    {
      target_roles: ["soporte tecnico"],
      skills: [
        {
          original_term: "Excel",
          level_hint: 3,
          evidence: [{ claim: "Uso de Excel para reportes", source: "extracted" }],
        },
        {
          original_term: "Inglés",
          level_hint: 3,
          evidence: [{ claim: "Inglés B2 certificado", source: "extracted" }],
        },
        {
          original_term: "Atención al cliente",
          level_hint: 3,
          evidence: [{ claim: "Atención al cliente en tienda", source: "extracted" }],
        },
        {
          original_term: "Redes",
          level_hint: 2,
          evidence: [{ claim: "Configuración de redes básicas", source: "extracted" }],
        },
      ],
      experiences: [
        {
          experience_type: "formal_employment",
          title: "Técnico de soporte",
          organization: "Tienda PA",
          description: "Soporte técnico a clientes y configuración de equipos durante 12 meses",
          confidence: 0.9,
        },
      ],
    },
    {
      traceId: "trace-test",
      sources: [SOURCE],
      provenance: "extracted",
      candidateId: "cand-test",
      now,
    },
  );
}

/** A minimal caller that answers both Distance Matrix and Geocoding URLs. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function googleFetch(
  override?: (url: string) => Response | undefined,
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const custom = override?.(url);
    if (custom) return custom;
    if (url.includes("distancematrix")) {
      return jsonResponse({
        status: "OK",
        rows: [{ elements: [{ status: "OK", duration: { value: 1800 }, distance: { value: 12000 } }] }],
      });
    }
    return jsonResponse({
      status: "OK",
      results: [
        {
          formatted_address: "Ciudad de Panamá, Panamá",
          geometry: { location: { lat: 8.99, lng: -79.52 } },
        },
      ],
    });
  }) as typeof fetch;
}
