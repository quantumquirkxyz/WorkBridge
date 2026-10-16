import { describe, expect, it } from "vitest";
import type { MatchDecision } from "@puente/domain";
import { assertDocumentsGrounded, gapLine, vacancyIntro } from "../draft";
import { signBetterAuthSession, sessionSignature } from "../roles";
import { ApplicationService } from "../service";
import type { EvidenceItem } from "../evidence";

const NOW = "2026-10-16T18:00:00.000Z";
const TOKEN = "certo-token-value-123456";
const SESSION_SECRET = "better-auth-test-secret";

function envelope(traceId: string, idempotencyKey: string) {
  return {
    traceId,
    idempotencyKey,
    agent: "market_and_matching" as const,
    schemaId: "https://puentelaboral.pa/schemas/match-decision.schema.json",
    guardrails: [{ stage: "output" as const, allowed: true, code: "ok" as const }],
    dqlState: "validated" as const,
  };
}

function session(role: "candidate" | "employer" | "counselor", id: string = role) {
  return signBetterAuthSession(
    {
      session: { id: `sess-${id}`, userId: id, expiresAt: "2027-01-01T00:00:00.000Z" },
      user: { id, email: `${id}@puente.pa`, role },
    },
    SESSION_SECRET,
  );
}

function evidence(): EvidenceItem[] {
  return [
    {
      id: "ev-1",
      kind: "experience",
      text: "Apoyé el inventario del negocio familiar.",
      credentialStatus: "not_applicable",
    },
  ];
}

function match(total = 80, aptitude: MatchDecision["aptitude"] = "apt"): MatchDecision {
  return {
    schemaVersion: "1.0.0",
    decisionId: "dec-1",
    traceId: "trace-1",
    candidateId: "candidate",
    vacancyId: "vac-1",
    strategy: "deterministic_greedy",
    aptitude,
    score: {
      technicalRequirements: total,
      experienceEvidence: total,
      availability: total,
      transportAccessibility: total,
      salaryConditions: total,
      weightedTotal: total,
    },
    hardConstraints: {
      mandatorySkills: "pass",
      schedule: "pass",
      salary: "pass",
      capacity: "pass",
      geographic: "pass",
    },
    transport: { feasible: true, source: "google_maps" },
    gaps: [],
    biasAlerts: [],
    promotion: null,
    tieBreak: { deterministic: true, usedProtectedAttributes: false, usedRandomness: false },
    reasons: [{ code: "score", message: "total registrado" }],
  };
}

function gatedMatch(): MatchDecision {
  return {
    ...match(60, "apt_with_gaps"),
    transport: { feasible: false, source: "local_matrix" },
    gaps: [{ id: "gap-1", severity: "critical", description: "Falta horario de fin de semana." }],
    biasAlerts: [{ id: "bias-1", reason: "La vacante pide buena presencia." }],
  };
}

function draftInput(overrides: Record<string, unknown> = {}) {
  const traceId = typeof overrides.traceId === "string" ? overrides.traceId : "trace-1";
  const idempotencyKey = typeof overrides.idempotencyKey === "string" ? overrides.idempotencyKey : "idem-draft";
  return {
    traceId,
    idempotencyKey,
    candidateId: "candidate",
    vacancyId: "vac-1",
    vacancyTitle: "Auxiliar administrativo",
    evidence: evidence(),
    match: match(),
    ...overrides,
    envelope: overrides.envelope ?? envelope(traceId, idempotencyKey),
  };
}

function action(reason: string, idempotencyKey = "idem-action", traceId = "trace-1") {
  return { traceId, idempotencyKey, reason, envelope: envelope(traceId, idempotencyKey) };
}

function service(secrets: string[] = []) {
  return new ApplicationService({
    clock: () => NOW,
    ids: (() => {
      let n = 0;
      return () => `id-${n++}`;
    })(),
    secrets,
    sessionSecret: SESSION_SECRET,
  });
}

describe("application approval and submission", () => {
  it("drafts only the evidence the candidate declared", () => {
    const app = service();
    const draft = app.createDraft(session("candidate"), draftInput());
    expect(draft.documents.cv).toEqual([
      {
        source: "evidence",
        evidenceIds: ["ev-1"],
        text: "Apoyé el inventario del negocio familiar.",
      },
    ]);
    expect(JSON.stringify(draft.documents)).not.toContain("cinco años de experiencia");
    expect(draft.counselorGate).toEqual([]);
  });

  it("lets the candidate correct a draft down to a declared subset", () => {
    const app = service();
    const created = app.createDraft(session("candidate"), draftInput());
    const corrected = app.correctDraft(session("candidate"), created.draftId, {
      ...action("quito una línea no seleccionada"),
      includeEvidenceIds: [],
    });
    expect(corrected.documents.cv).toEqual([]);
    expect(corrected.documents.coverLetter[0]?.text).toBe(vacancyIntro("Auxiliar administrativo"));
  });

  it("refuses corrections that introduce undeclared evidence", () => {
    const app = service();
    const created = app.createDraft(session("candidate"), draftInput());
    expect(() =>
      app.correctDraft(session("candidate"), created.draftId, {
        ...action("intento agregar un curso"),
        includeEvidenceIds: ["no-existe"],
      }),
    ).toThrow(/not declared/);
  });

  it("requires candidate approval and blocks other roles from submitting", async () => {
    const app = service();
    const created = app.createDraft(session("candidate"), draftInput());
    await expect(app.submit(session("candidate"), created.draftId, action("envío"))).rejects.toThrow(
      /Candidate approval/,
    );
    await expect(app.submit(session("employer"), created.draftId, action("envío"))).rejects.toThrow(
      /Only the candidate/,
    );
    await expect(app.submit(session("counselor"), created.draftId, action("envío"))).rejects.toThrow(
      /Only the candidate/,
    );
  });

  it("submits once and replays the same idempotency key", async () => {
    const app = service();
    const created = app.createDraft(session("candidate"), draftInput());
    app.approveDraft(session("candidate"), created.draftId, action("confirmo el borrador", "idem-approve"));
    const first = await app.submit(session("candidate"), created.draftId, action("envío la postulación", "idem-submit"));
    const retry = await app.submit(session("candidate"), created.draftId, action("envío la postulación", "idem-submit"));
    expect(first.replayed).toBe(false);
    expect(retry).toMatchObject({ submissionId: first.submissionId, replayed: true });
    const events = app.auditTrail(session("counselor"), "trace-1");
    expect(events.filter((event) => event.action === "submission")).toHaveLength(1);
    expect(events.map((event) => event.role)).toEqual(["candidate", "candidate"]);
    for (const event of events) {
      expect(event.timestamp).toBe(NOW);
      expect(event.traceId).toBe("trace-1");
      expect(event.actor).toBe("candidate");
      expect(event.reason.length).toBeGreaterThan(0);
    }
  });

  it("conflicts when the same idempotency key is reused for another draft", async () => {
    const app = service();
    const first = app.createDraft(session("candidate"), draftInput());
    const second = app.createDraft(session("candidate"), draftInput({ idempotencyKey: "idem-draft-2" }));
    app.approveDraft(session("candidate"), first.draftId, action("apruebo", "idem-a"));
    app.approveDraft(session("candidate"), second.draftId, action("apruebo", "idem-b"));
    await app.submit(session("candidate"), first.draftId, action("envío", "shared-key"));
    await expect(
      app.submit(session("candidate"), second.draftId, action("envío", "shared-key")),
    ).rejects.toThrow(/idempotency key/);
  });

  it("requires counselor approval for critical gaps, unverified credentials, bias, and transport", async () => {
    const app = service();
    const unverified: EvidenceItem = {
      id: "cert-1",
      kind: "certification",
      text: "Curso de ofimática declarado por el candidato.",
      credentialStatus: "unverified",
    };
    const created = app.createDraft(
      session("candidate"),
      draftInput({ evidence: [unverified], match: gatedMatch() }),
    );
    expect(created.counselorGate.map((reason) => reason.code)).toEqual([
      "critical_gap",
      "unverified_credential",
      "bias_alert",
      "infeasible_transport",
    ]);
    expect(created.documents.application.map((fragment) => fragment.text)).toContain(
      gapLine("Falta horario de fin de semana."),
    );
    app.approveDraft(session("candidate"), created.draftId, action("quiero postular", "idem-c"));
    await expect(
      app.submit(session("candidate"), created.draftId, action("envío", "idem-s")),
    ).rejects.toThrow(/Counselor approval/);
    app.approveDraft(session("counselor"), created.draftId, action("la brecha queda explícita", "idem-k"));
    const submitted = await app.submit(session("candidate"), created.draftId, action("envío", "idem-s"));
    expect(submitted.interview).toBe("pending_employer_approval");
  });

  it("records candidate, counselor, and employer rejections", async () => {
    const app = service();
    const withdrawn = app.createDraft(session("candidate"), draftInput());
    const rejected = app.rejectDraft(session("candidate"), withdrawn.draftId, action("me arrepiento", "idem-r1"));
    expect(rejected.status).toBe("rejected");
    await expect(app.submit(session("candidate"), withdrawn.draftId, action("envío", "idem-no"))).rejects.toThrow(
      /rejected/,
    );

    const gated = app.createDraft(
      session("candidate"),
      draftInput({
        evidence: [
          {
            id: "cert-2",
            kind: "certification",
            text: "Certificado declarado, aún sin verificar.",
            credentialStatus: "unverified",
          },
        ],
        match: { ...match(70, "apt_with_gaps"), decisionId: "dec-2" },
      }),
    );
    app.rejectDraft(session("counselor"), gated.draftId, action("credencial no verificada", "idem-r2"));

    const ready = app.createDraft(session("candidate"), draftInput({ idempotencyKey: "idem-draft-3" }));
    app.approveDraft(session("candidate"), ready.draftId, action("apruebo", "idem-r3"));
    const submitted = await app.submit(session("candidate"), ready.draftId, action("envío", "idem-r4"));
    const interview = app.decideInterview(session("employer"), submitted.submissionId, {
      ...action("no avanzamos a entrevista", "idem-r5"),
      decision: "rejected",
    });
    expect(interview.interview).toBe("rejected");
    const roles = app.auditTrail(session("employer"), "trace-1").map((event) => `${event.role}:${event.action}`);
    expect(roles).toContain("candidate:rejection");
    expect(roles).toContain("counselor:rejection");
    expect(roles).toContain("employer:rejection");
  });

  it("requires employer approval before interview progression", async () => {
    const app = service();
    const created = app.createDraft(session("candidate"), draftInput());
    app.approveDraft(session("candidate"), created.draftId, action("apruebo", "idem-e1"));
    const submitted = await app.submit(session("candidate"), created.draftId, action("envío", "idem-e2"));
    expect(() =>
      app.decideInterview(session("employer"), submitted.submissionId, {
        ...action("quiero entrevistar", "idem-e3"),
        decision: "approved",
      }),
    ).toThrow(/Employer approval/);
    expect(() =>
      app.decideInterview(session("candidate"), submitted.submissionId, {
        ...action("no me corresponde", "idem-e4"),
        decision: "approved",
      }),
    ).toThrow(/Only an employer/);
    app.approveInterview(session("employer"), submitted.submissionId, action("apruebo entrevista", "idem-e5"));
    const progressed = app.decideInterview(session("employer"), submitted.submissionId, {
      ...action("agendamos entrevista", "idem-e6"),
      decision: "approved",
    });
    expect(progressed.interview).toBe("approved");
    expect(() =>
      app.approveInterview(session("candidate"), submitted.submissionId, action("no", "idem-e7")),
    ).toThrow(/Only an employer/);
  });

  it("rejects expired sessions, unknown roles, and secret material", () => {
    const app = service([TOKEN]);
    const expired = {
      session: { id: "s", userId: "candidate", expiresAt: "2020-01-01T00:00:00.000Z" },
      user: { id: "candidate", email: "a@puente.pa", role: "candidate" as const },
    };
    expect(() =>
      app.createDraft({ ...expired, signature: sessionSignature(expired, SESSION_SECRET) }, draftInput()),
    ).toThrow(/expired/);
    const unknownRole = {
      session: { id: "s", userId: "candidate", expiresAt: "2027-01-01T00:00:00.000Z" },
      user: { id: "candidate", email: "a@puente.pa", role: "admin" },
    };
    expect(() =>
      app.createDraft({ ...unknownRole, signature: sessionSignature(unknownRole, SESSION_SECRET) }, draftInput()),
    ).toThrow(/candidate, employer, or counselor/);
    const forged = session("employer");
    forged.user.role = "candidate";
    expect(() => app.createDraft(forged, draftInput())).toThrow(/signature/);
    expect(() =>
      app.createDraft(session("candidate"), draftInput({ vacancyTitle: `Puesto ${TOKEN}` })),
    ).toThrow(/secret/i);
    const created = app.createDraft(session("candidate"), draftInput());
    expect(() => app.approveDraft(session("candidate"), created.draftId, action(`porque ${TOKEN}`))).toThrow(
      /secret/i,
    );
    expect(app.auditTrail(session("candidate"), "trace-1")).toEqual([]);
  });

  it("rejects inconsistent match decisions and closed drafts", async () => {
    const app = service();
    expect(() => app.createDraft(session("employer"), draftInput())).toThrow(/Only a candidate/);
    expect(() => app.createDraft(session("candidate", "other"), draftInput())).toThrow(/own application/);
    expect(() =>
      app.createDraft(session("candidate"), draftInput({ match: { ...match(), traceId: "other-trace" } })),
    ).toThrow(/traceId/);
    expect(() =>
      app.createDraft(session("candidate"), draftInput({ match: { ...match(), vacancyId: "other-vacancy" } })),
    ).toThrow(/does not belong/);
    const created = app.createDraft(session("candidate"), draftInput());
    expect(() => app.correctDraft(session("employer"), created.draftId, { ...action("no"), includeEvidenceIds: [] })).toThrow(
      /Only the candidate/,
    );
    expect(() =>
      app.correctDraft(session("candidate", "other"), created.draftId, { ...action("no"), includeEvidenceIds: [] }),
    ).toThrow(/own draft/);
    expect(() => app.approveDraft(session("employer"), created.draftId, action("no"))).toThrow(/cannot approve/);
    expect(() => app.rejectDraft(session("employer"), created.draftId, action("no"))).toThrow(/cannot reject/);
    app.approveDraft(session("candidate"), created.draftId, action("apruebo"));
    await app.submit(session("candidate"), created.draftId, action("envío", "idem-once"));
    expect(() => app.approveDraft(session("candidate"), created.draftId, action("otra vez"))).toThrow(/no longer/);
    await expect(app.submit(session("candidate"), created.draftId, action("envío", "idem-other"))).rejects.toThrow(
      /already submitted/,
    );
    expect(() => app.auditTrail(session("candidate"), " ")).toThrow(/traceId/);
    expect(() => app.decideInterview(session("employer"), "missing", { ...action("x"), decision: "rejected" })).toThrow(
      /not found/,
    );
  });

  it("flags invented draft text", () => {
    const documents = {
      cv: [{ source: "evidence" as const, evidenceIds: ["ev-1"], text: "Inventé un empleo en un banco." }],
      coverLetter: [],
      application: [],
    };
    expect(() =>
      assertDocumentsGrounded(documents, {
        vacancyTitle: "Auxiliar administrativo",
        evidence: evidence(),
        match: match(),
      }),
    ).toThrow(/not grounded/);
  });

  it("drops approvals when a correction changes the evidence subset", async () => {
    const app = service();
    const created = app.createDraft(session("candidate"), draftInput());
    app.approveDraft(session("candidate"), created.draftId, action("apruebo", "idem-keep"));
    app.correctDraft(session("candidate"), created.draftId, {
      ...action("quito la evidencia", "idem-clear"),
      includeEvidenceIds: [],
    });
    await expect(app.submit(session("candidate"), created.draftId, action("envío", "idem-after"))).rejects.toThrow(
      /Candidate approval/,
    );
    app.approveDraft(session("candidate"), created.draftId, action("apruebo el texto vacío", "idem-again"));
    const submitted = await app.submit(session("candidate"), created.draftId, action("envío", "idem-after"));
    expect(submitted.replayed).toBe(false);
  });

  it("rejects an action whose trace does not match the draft and a blocked guardrail", () => {
    const app = service();
    const created = app.createDraft(session("candidate"), draftInput());
    expect(() => app.approveDraft(session("candidate"), created.draftId, action("otra traza", "idem-x", "trace-other"))).toThrow(
      /draft traceId/,
    );
    expect(app.auditTrail(session("candidate"), "trace-other")).toEqual([]);
    expect(() =>
      app.createDraft(session("candidate"), draftInput({ envelope: { traceId: "trace-1" } })),
    ).toThrow(/envelope|traceId|idempotencyKey/i);
    expect(() =>
      app.approveDraft(session("candidate"), created.draftId, {
        ...action("bloqueado", "idem-block"),
        envelope: {
          ...envelope("trace-1", "idem-block"),
          guardrails: [{ stage: "output", allowed: false, code: "prompt_injection" }],
        },
      }),
    ).toThrow(/guardrail/);
  });

  it("lets a counselor review a clean draft without making that approval mandatory", async () => {
    const app = service();
    const created = app.createDraft(session("candidate"), draftInput());
    const reviewed = app.approveDraft(session("counselor"), created.draftId, action("sin brecha crítica", "idem-clean"));
    expect(reviewed.counselorApproved).toBe(true);
    const another = app.createDraft(session("candidate"), draftInput({ idempotencyKey: "idem-draft-clean" }));
    app.approveDraft(session("candidate"), another.draftId, action("apruebo", "idem-clean-2"));
    const submitted = await app.submit(session("candidate"), another.draftId, action("envío", "idem-clean-3"));
    expect(submitted.interview).toBe("pending_employer_approval");
  });

  it("rejects a short Certo token", () => {
    const app = service(["xy"]);
    expect(() => app.createDraft(session("candidate"), draftInput({ vacancyTitle: "Puesto xy" }))).toThrow(/secret/i);
  });
});
