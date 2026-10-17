import { expect, test } from "@playwright/test";
import type { MatchDecision } from "@workbridge/domain";
import { sampleMatchDecision, sampleWorkflowEnvelope } from "../src/application/fixtures";
import { signBetterAuthSession } from "../src/application/roles";

const SESSION_SECRET = "better-auth-test-secret";

function session(role: "candidate" | "employer" | "counselor", id = role) {
  return signBetterAuthSession(
    {
      session: { id: `sess-${id}`, userId: id, expiresAt: "2027-01-01T00:00:00.000Z" },
      user: { id, email: `${id}@workbridge.pa`, role },
    },
    SESSION_SECRET,
  );
}

function match(traceId: string, extras: Partial<MatchDecision> = {}): MatchDecision {
  return {
    ...sampleMatchDecision({
      traceId,
      total: 82,
      transport: { feasible: true, source: "google_maps" },
    }),
    ...extras,
  };
}

function draftBody(traceId: string, extras: Record<string, unknown> = {}) {
  return {
    session: session("candidate"),
    traceId,
    idempotencyKey: `${traceId}-draft`,
    candidateId: "candidate",
    vacancyId: "vac-1",
    vacancyTitle: "Auxiliar de bodega",
    evidence: [
      {
        id: "ev-1",
        kind: "experience",
        text: "Organicé la bodega del negocio familiar los sábados.",
        credentialStatus: "not_applicable",
      },
    ],
    match: match(traceId),
    envelope: sampleWorkflowEnvelope(traceId, `${traceId}-draft`),
    ...extras,
  };
}

test("candidate drafts, corrects, approves, retries, and submits", async ({ request }) => {
  const traceId = "trace-playwright-submit";
  const created = await request.post("/drafts", { data: draftBody(traceId) });
  expect(created.status()).toBe(201);
  const draft = (await created.json()) as {
    draftId: string;
    documents: { cv: Array<{ text: string }> };
  };
  expect(draft.documents.cv[0]?.text).toBe("Organicé la bodega del negocio familiar los sábados.");
  expect(JSON.stringify(draft)).not.toContain("licenciatura");

  const corrected = await request.post(`/drafts/${draft.draftId}/corrections`, {
    data: {
      session: session("candidate"),
      traceId,
      idempotencyKey: `${traceId}-correct`,
      envelope: sampleWorkflowEnvelope(traceId, `${traceId}-correct`),
      reason: "mantengo solo la experiencia declarada",
      includeEvidenceIds: ["ev-1"],
    },
  });
  expect(corrected.ok()).toBe(true);

  const approved = await request.post(`/drafts/${draft.draftId}/approvals`, {
    data: {
      session: session("candidate"),
      traceId,
      idempotencyKey: `${traceId}-approve`,
      envelope: sampleWorkflowEnvelope(traceId, `${traceId}-approve`),
      reason: "apruebo mi postulación",
    },
  });
  expect(approved.ok()).toBe(true);

  const blocked = await request.post(`/drafts/${draft.draftId}/submissions`, {
    data: {
      session: session("employer"),
      traceId,
      idempotencyKey: `${traceId}-blocked`,
      envelope: sampleWorkflowEnvelope(traceId, `${traceId}-blocked`),
      reason: "un empleador no envía la postulación",
    },
  });
  expect(blocked.status()).toBe(403);

  const submitData = {
    session: session("candidate"),
    traceId,
    idempotencyKey: `${traceId}-submit`,
    envelope: sampleWorkflowEnvelope(traceId, `${traceId}-submit`),
    reason: "envío la postulación",
  };
  const submitted = await request.post(`/drafts/${draft.draftId}/submissions`, { data: submitData });
  expect(submitted.ok()).toBe(true);
  const first = (await submitted.json()) as { submissionId: string; replayed: boolean };
  const retry = await request.post(`/drafts/${draft.draftId}/submissions`, { data: submitData });
  const replay = (await retry.json()) as { submissionId: string; replayed: boolean };
  expect(replay.submissionId).toBe(first.submissionId);
  expect(replay.replayed).toBe(true);

  const employerApproval = await request.post(`/submissions/${first.submissionId}/approvals`, {
    data: {
      session: session("employer"),
      traceId,
      idempotencyKey: `${traceId}-employer`,
      envelope: sampleWorkflowEnvelope(traceId, `${traceId}-employer`),
      reason: "aprobamos pasar a entrevista",
    },
  });
  expect(employerApproval.ok()).toBe(true);
  const progressed = await request.post(`/submissions/${first.submissionId}/interview`, {
    data: {
      session: session("employer"),
      traceId,
      idempotencyKey: `${traceId}-interview`,
      envelope: sampleWorkflowEnvelope(traceId, `${traceId}-interview`),
      reason: "la entrevista queda habilitada",
      decision: "approved",
    },
  });
  expect(progressed.ok()).toBe(true);
  expect(((await progressed.json()) as { interview: string }).interview).toBe("approved");
});

test("candidate, counselor, and employer can each reject", async ({ request }) => {
  const candidateTrace = "trace-playwright-candidate-reject";
  const candidateDraft = await request.post("/drafts", { data: draftBody(candidateTrace) });
  const candidateBody = (await candidateDraft.json()) as { draftId: string };
  const candidateRejection = await request.post(`/drafts/${candidateBody.draftId}/rejections`, {
    data: {
      session: session("candidate"),
      traceId: candidateTrace,
      idempotencyKey: `${candidateTrace}-reject`,
      envelope: sampleWorkflowEnvelope(candidateTrace, `${candidateTrace}-reject`),
      reason: "retiro la postulación",
    },
  });
  expect(candidateRejection.ok()).toBe(true);

  const counselorTrace = "trace-playwright-counselor-reject";
  const counselorDraft = await request.post("/drafts", {
    data: draftBody(counselorTrace, {
      evidence: [
        {
          id: "cert-1",
          kind: "certification",
          text: "Taller de atención al cliente declarado por el candidato.",
          credentialStatus: "unverified",
        },
      ],
      match: match(counselorTrace, {
        aptitude: "apt_with_gaps",
        score: {
          technicalRequirements: 60,
          experienceEvidence: 60,
          availability: 60,
          transportAccessibility: 60,
          salaryConditions: 60,
          weightedTotal: 60,
        },
      }),
    }),
  });
  const counselorBody = (await counselorDraft.json()) as { draftId: string; counselorGate: unknown[] };
  expect(counselorBody.counselorGate.length).toBeGreaterThan(0);
  const counselorRejection = await request.post(`/drafts/${counselorBody.draftId}/rejections`, {
    data: {
      session: session("counselor"),
      traceId: counselorTrace,
      idempotencyKey: `${counselorTrace}-reject`,
      envelope: sampleWorkflowEnvelope(counselorTrace, `${counselorTrace}-reject`),
      reason: "la credencial sigue sin verificar",
    },
  });
  expect(counselorRejection.ok()).toBe(true);

  const employerTrace = "trace-playwright-employer-reject";
  const employerDraft = await request.post("/drafts", { data: draftBody(employerTrace) });
  const employerBody = (await employerDraft.json()) as { draftId: string };
  await request.post(`/drafts/${employerBody.draftId}/approvals`, {
    data: {
      session: session("candidate"),
      traceId: employerTrace,
      idempotencyKey: `${employerTrace}-approve`,
      envelope: sampleWorkflowEnvelope(employerTrace, `${employerTrace}-approve`),
      reason: "apruebo el borrador",
    },
  });
  const submitted = await request.post(`/drafts/${employerBody.draftId}/submissions`, {
    data: {
      session: session("candidate"),
      traceId: employerTrace,
      idempotencyKey: `${employerTrace}-submit`,
      envelope: sampleWorkflowEnvelope(employerTrace, `${employerTrace}-submit`),
      reason: "envío para revisión del empleador",
    },
  });
  const submission = (await submitted.json()) as { submissionId: string };
  const employerRejection = await request.post(`/submissions/${submission.submissionId}/interview`, {
    data: {
      session: session("employer"),
      traceId: employerTrace,
      idempotencyKey: `${employerTrace}-reject`,
      envelope: sampleWorkflowEnvelope(employerTrace, `${employerTrace}-reject`),
      reason: "no avanzamos a entrevista",
      decision: "rejected",
    },
  });
  expect(employerRejection.ok()).toBe(true);
  expect(((await employerRejection.json()) as { interview: string }).interview).toBe("rejected");
});

test("counselor approval allows a gated draft to be submitted and retried", async ({ request }) => {
  const traceId = "trace-playwright-gated";
  const created = await request.post("/drafts", {
    data: draftBody(traceId, {
      evidence: [
        {
          id: "cert-1",
          kind: "certification",
          text: "Curso declarado por el candidato, todavía sin verificar.",
          credentialStatus: "unverified",
        },
      ],
      match: match(traceId, {
        aptitude: "apt_with_gaps",
        gaps: [{ id: "gap-1", severity: "critical", description: "Falta disponibilidad de sábado." }],
        score: {
          technicalRequirements: 60,
          experienceEvidence: 60,
          availability: 60,
          transportAccessibility: 60,
          salaryConditions: 60,
          weightedTotal: 60,
        },
      }),
    }),
  });
  expect(created.status()).toBe(201);
  const draft = (await created.json()) as { draftId: string; counselorGate: unknown[] };
  expect(draft.counselorGate.length).toBeGreaterThan(0);

  const candidateApproval = await request.post(`/drafts/${draft.draftId}/approvals`, {
    data: {
      session: session("candidate"),
      traceId,
      idempotencyKey: `${traceId}-candidate`,
      envelope: sampleWorkflowEnvelope(traceId, `${traceId}-candidate`),
      reason: "apruebo mi postulación con la brecha visible",
    },
  });
  expect(candidateApproval.ok()).toBe(true);

  const counselorApproval = await request.post(`/drafts/${draft.draftId}/approvals`, {
    data: {
      session: session("counselor"),
      traceId,
      idempotencyKey: `${traceId}-counselor`,
      envelope: sampleWorkflowEnvelope(traceId, `${traceId}-counselor`),
      reason: "la credencial no verificada queda explícita",
    },
  });
  expect(counselorApproval.ok()).toBe(true);

  const submitData = {
    session: session("candidate"),
    traceId,
    idempotencyKey: `${traceId}-submit`,
    envelope: sampleWorkflowEnvelope(traceId, `${traceId}-submit`),
    reason: "envío después de la revisión",
  };
  const submitted = await request.post(`/drafts/${draft.draftId}/submissions`, { data: submitData });
  expect(submitted.ok()).toBe(true);
  const first = (await submitted.json()) as { submissionId: string; replayed: boolean };
  const retry = await request.post(`/drafts/${draft.draftId}/submissions`, { data: submitData });
  const replay = (await retry.json()) as { submissionId: string; replayed: boolean };
  expect(replay.submissionId).toBe(first.submissionId);
  expect(replay.replayed).toBe(true);
});
