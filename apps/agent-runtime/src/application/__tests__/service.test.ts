import { describe, expect, it } from "vitest";
import { makeCandidateId, type MatchDecision } from "@workbridge/domain";
import { assertDocumentsGrounded, gapLine, vacancyIntro } from "../draft";
import type { EvidenceItem } from "../evidence";
import { sampleMatchDecision, sampleWorkflowEnvelope } from "../fixtures";
import { signBetterAuthSession, sessionSignature } from "../roles";
import { ApplicationService } from "../service";

const NOW = "2026-10-16T18:00:00.000Z";
const TOKEN = "certo-token-value-123456";
const SESSION_SECRET = "better-auth-test-secret";

function session(role: "candidate" | "employer" | "counselor", id: string = role) {
  return signBetterAuthSession(
    {
      session: { id: `sess-${id}`, userId: id, expiresAt: "2027-01-01T00:00:00.000Z" },
      user: { id, email: `${id}@workbridge.pa`, role, ...(role === "employer" ? { employerOrgId: "org-1" } : {}) },
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
  return sampleMatchDecision({
    traceId: "trace-1",
    decisionId: "dec-1",
    total,
    aptitude,
    strategy: "deterministic_greedy",
    transport: { feasible: true, source: "google_maps" },
    reason: "total registrado",
  });
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
    employerOrgId: "org-1",
    ...overrides,
    envelope: overrides.envelope ?? sampleWorkflowEnvelope(traceId, idempotencyKey),
  };
}

function action(reason: string, idempotencyKey = "idem-action", traceId = "trace-1") {
  return { traceId, idempotencyKey, reason, envelope: sampleWorkflowEnvelope(traceId, idempotencyKey) };
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
    const draft = app.createDraftSync(session("candidate"), draftInput());
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
    const created = app.createDraftSync(session("candidate"), draftInput());
    const corrected = app.correctDraft(session("candidate"), created.draftId, {
      ...action("quito una línea no seleccionada"),
      includeEvidenceIds: [],
    });
    expect(corrected.documents.cv).toEqual([]);
    expect(corrected.documents.coverLetter[0]?.text).toBe(vacancyIntro("Auxiliar administrativo"));
  });

  it("refuses corrections that introduce undeclared evidence", () => {
    const app = service();
    const created = app.createDraftSync(session("candidate"), draftInput());
    expect(() =>
      app.correctDraft(session("candidate"), created.draftId, {
        ...action("intento agregar un curso"),
        includeEvidenceIds: ["no-existe"],
      }),
    ).toThrow(/not declared/);
  });

  it("requires candidate approval and blocks other roles from submitting", async () => {
    const app = service();
    const created = app.createDraftSync(session("candidate"), draftInput());
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
    const created = app.createDraftSync(session("candidate"), draftInput());
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
    const first = app.createDraftSync(session("candidate"), draftInput());
    const second = app.createDraftSync(session("candidate"), draftInput({ idempotencyKey: "idem-draft-2" }));
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
    const created = app.createDraftSync(session("candidate"), draftInput({ evidence: [unverified], match: gatedMatch() }));
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
    const withdrawn = app.createDraftSync(session("candidate"), draftInput());
    const rejected = app.rejectDraft(session("candidate"), withdrawn.draftId, action("me arrepiento", "idem-r1"));
    expect(rejected.status).toBe("rejected");
    await expect(app.submit(session("candidate"), withdrawn.draftId, action("envío", "idem-no"))).rejects.toThrow(
      /rejected/,
    );

    const gated = app.createDraftSync(session("candidate"), draftInput({
      evidence: [
        {
          id: "cert-2",
          kind: "certification",
          text: "Certificado declarado, aún sin verificar.",
          credentialStatus: "unverified",
        },
      ],
      match: { ...match(70, "apt_with_gaps"), decisionId: "dec-2" },
    }));
    app.rejectDraft(session("counselor"), gated.draftId, action("credencial no verificada", "idem-r2"));

    const ready = app.createDraftSync(session("candidate"), draftInput({ idempotencyKey: "idem-draft-3" }));
    app.approveDraft(session("candidate"), ready.draftId, action("apruebo", "idem-r3"));
    const submitted = await app.submit(session("candidate"), ready.draftId, action("envío", "idem-r4"));
    const interview = await app.decideInterview(session("employer"), submitted.submissionId, {
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
    const created = app.createDraftSync(session("candidate"), draftInput());
    app.approveDraft(session("candidate"), created.draftId, action("apruebo", "idem-e1"));
    const submitted = await app.submit(session("candidate"), created.draftId, action("envío", "idem-e2"));
    await expect(
      app.decideInterview(session("employer"), submitted.submissionId, {
        ...action("quiero entrevistar", "idem-e3"),
        decision: "approved",
      }),
    ).rejects.toThrow(/Employer approval/);
    await expect(
      app.decideInterview(session("candidate"), submitted.submissionId, {
        ...action("no me corresponde", "idem-e4"),
        decision: "approved",
      }),
    ).rejects.toThrow(/Only an employer/);
    app.approveInterview(session("employer"), submitted.submissionId, action("apruebo entrevista", "idem-e5"));
    const progressed = await app.decideInterview(session("employer"), submitted.submissionId, {
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
      user: { id: "candidate", email: "a@workbridge.pa", role: "candidate" as const },
    };
    expect(() =>
      app.createDraftSync({ ...expired, signature: sessionSignature(expired, SESSION_SECRET) }, draftInput()),
    ).toThrow(/expired/);
    const unknownRole = {
      session: { id: "s", userId: "candidate", expiresAt: "2027-01-01T00:00:00.000Z" },
      user: { id: "candidate", email: "a@workbridge.pa", role: "admin" },
    };
    expect(() =>
      app.createDraftSync({ ...unknownRole, signature: sessionSignature(unknownRole, SESSION_SECRET) }, draftInput()),
    ).toThrow(/candidate, employer, or counselor/);
    const forged = session("employer");
    forged.user.role = "candidate";
    expect(() => app.createDraftSync(forged, draftInput())).toThrow(/signature/);
    expect(() =>
      app.createDraftSync(session("candidate"), draftInput({ vacancyTitle: `Puesto ${TOKEN}` })),
    ).toThrow(/secret/i);
    const created = app.createDraftSync(session("candidate"), draftInput());
    expect(() => app.approveDraft(session("candidate"), created.draftId, action(`porque ${TOKEN}`))).toThrow(
      /secret/i,
    );
    expect(app.auditTrail(session("candidate"), "trace-1")).toEqual([]);
  });

  it("rejects inconsistent match decisions and closed drafts", async () => {
    const app = service();
    expect(() => app.createDraftSync(session("employer"), draftInput())).toThrow(/Only a candidate/);
    expect(() => app.createDraftSync(session("candidate", "other"), draftInput())).toThrow(/own application/);
    expect(() =>
      app.createDraftSync(session("candidate"), draftInput({ match: { ...match(), traceId: "other-trace" } })),
    ).toThrow(/traceId/);
    expect(() =>
      app.createDraftSync(session("candidate"), draftInput({ match: { ...match(), vacancyId: "other-vacancy" } })),
    ).toThrow(/does not belong/);
    const created = app.createDraftSync(session("candidate"), draftInput());
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
    await expect(
      app.decideInterview(session("employer"), "missing", { ...action("x"), decision: "rejected" }),
    ).rejects.toThrow(/not found/);
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
    const created = app.createDraftSync(session("candidate"), draftInput());
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
    const created = app.createDraftSync(session("candidate"), draftInput());
    expect(() => app.approveDraft(session("candidate"), created.draftId, action("otra traza", "idem-x", "trace-other"))).toThrow(
      /draft traceId/,
    );
    expect(app.auditTrail(session("candidate"), "trace-other")).toEqual([]);
    expect(() =>
      app.createDraftSync(session("candidate"), draftInput({ envelope: { traceId: "trace-1" } })),
    ).toThrow(/envelope|traceId|idempotencyKey/i);
    expect(() =>
      app.approveDraft(session("candidate"), created.draftId, {
        ...action("bloqueado", "idem-block"),
        envelope: {
          ...sampleWorkflowEnvelope("trace-1", "idem-block"),
          guardrails: [{ stage: "output", allowed: false, code: "prompt_injection" }],
        },
      }),
    ).toThrow(/guardrail/);
  });

  it("removes rejected and approved drafts from the counselor pending queue", () => {
    const app = service();
    const unverified: EvidenceItem = {
      id: "cert-q",
      kind: "certification",
      text: "Certificado declarado, aún sin verificar.",
      credentialStatus: "unverified",
    };
    const pending = (): string[] =>
      app.listDrafts(session("counselor"), { gate: "counselor", pending: true }).map((draft) => draft.draftId);
    const rejectedDraft = app.createDraftSync(session("candidate"), draftInput({ idempotencyKey: "idem-q1", evidence: [unverified], match: gatedMatch() }));
    const approvedDraft = app.createDraftSync(session("candidate"), draftInput({ idempotencyKey: "idem-q2", evidence: [unverified], match: gatedMatch() }));
    expect(pending()).toEqual([rejectedDraft.draftId, approvedDraft.draftId]);

    app.rejectDraft(session("counselor"), rejectedDraft.draftId, action("no cumple", "idem-q3"));
    expect(pending()).toEqual([approvedDraft.draftId]);

    app.approveDraft(session("counselor"), approvedDraft.draftId, action("la brecha queda explícita", "idem-q4"));
    expect(pending()).toEqual([]);
  });

  it("exposes trace, vacancy, candidate, and selected evidence in the draft view", () => {
    const app = service();
    const view = app.createDraftSync(session("candidate"), draftInput({ candidateDisplayName: "Ana Pérez" }));
    expect(view.traceId).toBe("trace-1");
    expect(view.vacancyTitle).toBe("Auxiliar administrativo");
    expect(view.candidateDisplayName).toBe("Ana Pérez");
    expect(view.evidence.map((item) => item.id)).toEqual(["ev-1"]);
    expect(view.availableEvidence.map((item) => item.id)).toEqual(["ev-1"]);
  });

  it("computes the counselor gate over the selected evidence only", () => {
    const app = service();
    const unverified: EvidenceItem = {
      id: "cert-g",
      kind: "certification",
      text: "Certificado declarado, aún sin verificar.",
      credentialStatus: "unverified",
    };
    const created = app.createDraftSync(session("candidate"), draftInput({ evidence: [...evidence(), unverified], match: match() }));
    expect(created.counselorGate.map((reason) => reason.code)).toEqual(["unverified_credential"]);
    const corrected = app.correctDraft(session("candidate"), created.draftId, {
      ...action("quito el certificado no verificado", "idem-g"),
      includeEvidenceIds: ["ev-1"],
    });
    expect(corrected.evidence.map((item) => item.id)).toEqual(["ev-1"]);
    expect(corrected.availableEvidence.map((item) => item.id)).toEqual(["ev-1", "cert-g"]);
    expect(corrected.counselorGate).toEqual([]);
  });

  it("lets a counselor review a clean draft without making that approval mandatory", async () => {
    const app = service();
    const created = app.createDraftSync(session("candidate"), draftInput());
    const reviewed = app.approveDraft(session("counselor"), created.draftId, action("sin brecha crítica", "idem-clean"));
    expect(reviewed.counselorApproved).toBe(true);
    const another = app.createDraftSync(session("candidate"), draftInput({ idempotencyKey: "idem-draft-clean" }));
    app.approveDraft(session("candidate"), another.draftId, action("apruebo", "idem-clean-2"));
    const submitted = await app.submit(session("candidate"), another.draftId, action("envío", "idem-clean-3"));
    expect(submitted.interview).toBe("pending_employer_approval");
  });

  it("accepts the canonical candidate id and still refuses someone else's", () => {
    const app = service();
    const userId = "user-uuid-1";
    const candidateId = makeCandidateId(userId);
    const created = app.createDraftSync(session("candidate", userId), draftInput({ candidateId, match: { ...match(), candidateId } }));
    expect(created.candidateId).toBe(candidateId);
    expect(app.listDrafts(session("candidate", userId), { candidateId }).map((draft) => draft.draftId)).toEqual([
      created.draftId,
    ]);
    expect(() =>
      app.createDraftSync(session("candidate", userId), draftInput({
        idempotencyKey: "idem-other-person",
        candidateId: "candidate_other",
        match: { ...match(), candidateId: "candidate_other" },
      })),
    ).toThrow(/own application/);
  });

  it("lets the owning candidate read the interview decision", async () => {
    const app = service();
    const created = app.createDraftSync(session("candidate"), draftInput());
    expect(() => app.readOwnSubmission(session("candidate"), created.draftId)).toThrow(/not been submitted/);
    expect(() => app.readOwnSubmission(session("employer"), created.draftId)).toThrow(/Only the candidate/);
    app.approveDraft(session("candidate"), created.draftId, action("apruebo", "idem-own-1"));
    const submitted = await app.submit(session("candidate"), created.draftId, action("envío", "idem-own-2"));
    expect(app.readOwnSubmission(session("candidate"), created.draftId)).toEqual({
      submissionId: submitted.submissionId,
      draftId: created.draftId,
      interview: "pending_employer_approval",
      submittedAt: NOW,
    });
    expect(() => app.readOwnSubmission(session("candidate", "other"), created.draftId)).toThrow(/own submission/);
    const open = app.readDraft(session("candidate"), created.draftId);
    expect(open.interview).toBe("pending_employer_approval");
    expect(open.submissionId).toBe(submitted.submissionId);
    expect(open.history.some((entry) => entry.action === "submission")).toBe(true);

    await app.decideInterview(session("employer"), submitted.submissionId, {
      ...action("no avanzamos", "idem-own-3"),
      decision: "rejected",
    });
    expect(app.readOwnSubmission(session("candidate"), created.draftId).interview).toBe("rejected");
    expect(app.readDraft(session("candidate"), created.draftId).interview).toBe("rejected");
    expect(app.listDrafts(session("candidate"), { candidateId: "candidate" })[0]?.interview).toBe("rejected");
  });

  it("rejects a short Certo token", () => {
    const app = service(["xy"]);
    expect(() => app.createDraftSync(session("candidate"), draftInput({ vacancyTitle: "Puesto xy" }))).toThrow(/secret/i);
  });
});
