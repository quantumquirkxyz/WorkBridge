import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { resolveDatabaseMode } from "../database";
import { createApplicationServer } from "../server";
import { createSqlIdempotencyStore, ENSURE_IDEMPOTENCY_TABLE_SQL } from "../store";
import { startApplicationServer } from "../main";
import handler from "../vercel";

const TOKEN = "certo-token-value-123456";

function session(role: "candidate" | "employer" | "counselor", id = role) {
  return {
    session: { id: `sess-${id}`, userId: id, expiresAt: "2027-01-01T00:00:00.000Z" },
    user: { id, email: `${id}@puente.pa`, role },
  };
}

function payload(extra: Record<string, unknown> = {}) {
  return {
    session: session("candidate"),
    traceId: "trace-http",
    idempotencyKey: "idem-http",
    candidateId: "candidate",
    vacancyId: "vac-1",
    vacancyTitle: "Cajero",
    evidence: [
      {
        id: "ev-1",
        kind: "experience",
        text: "Atendí la caja del kiosco familiar.",
        credentialStatus: "not_applicable",
      },
    ],
    match: {
      schemaVersion: "1.0.0",
      decisionId: "dec-http",
      traceId: "trace-http",
      candidateId: "candidate",
      vacancyId: "vac-1",
      strategy: "highs_milp",
      aptitude: "apt",
      score: {
        technicalRequirements: 80,
        experienceEvidence: 80,
        availability: 80,
        transportAccessibility: 80,
        salaryConditions: 80,
        weightedTotal: 80,
      },
      hardConstraints: {
        mandatorySkills: "pass",
        schedule: "pass",
        salary: "pass",
        capacity: "pass",
        geographic: "pass",
      },
      transport: { feasible: true, source: "local_matrix" },
      gaps: [],
      biasAlerts: [],
      promotion: null,
      tieBreak: { deterministic: true, usedProtectedAttributes: false, usedRandomness: false },
      reasons: [{ code: "score", message: "apto" }],
    },
    ...extra,
  };
}

async function withServer(
  env: Record<string, string | undefined>,
  run: (base: string) => Promise<void>,
) {
  const server = createApplicationServer({
    env,
    clock: () => "2026-10-16T18:00:00.000Z",
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

describe("application HTTP surface", () => {
  it("reports the Neon backup mode without revealing the URL", async () => {
    expect(resolveDatabaseMode({})).toBe("memory");
    expect(resolveDatabaseMode({ DATABASE_URL: "postgres://primary" })).toBe("primary");
    expect(resolveDatabaseMode({ NEON_DATABASE_URL: "postgres://neon" })).toBe("neon-backup");
    await withServer({ NEON_DATABASE_URL: "postgres://user:secret-pass@neon/db" }, async (base) => {
      const health = await fetch(`${base}/health`);
      const body = (await health.json()) as { databaseMode: string; ok: boolean };
      expect(body).toEqual({ ok: true, databaseMode: "neon-backup", persistence: "memory" });
      expect(JSON.stringify(body)).not.toContain("secret-pass");
    });
  });

  it("runs draft, correction, approval, rejection, retry, and submission", async () => {
    await withServer({ CERTO_TOKEN: TOKEN }, async (base) => {
      const created = await fetch(`${base}/drafts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      expect(created.status).toBe(201);
      const draft = (await created.json()) as { draftId: string; documents: { cv: Array<{ text: string }> } };
      expect(draft.documents.cv[0]?.text).toBe("Atendí la caja del kiosco familiar.");

      const corrected = await fetch(`${base}/drafts/${draft.draftId}/corrections`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session: session("candidate"),
          traceId: "trace-http",
          idempotencyKey: "idem-correct",
          reason: "dejo solo la experiencia declarada",
          includeEvidenceIds: ["ev-1"],
        }),
      });
      expect(corrected.status).toBe(200);

      const approved = await fetch(`${base}/drafts/${draft.draftId}/approvals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session: session("candidate"),
          traceId: "trace-http",
          idempotencyKey: "idem-approve",
          reason: "apruebo el envío",
        }),
      });
      expect(approved.status).toBe(200);

      const denied = await fetch(`${base}/drafts/${draft.draftId}/submissions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session: session("employer"),
          traceId: "trace-http",
          idempotencyKey: "idem-submit",
          reason: "intento de un empleador",
        }),
      });
      expect(denied.status).toBe(403);

      const submitBody = {
        session: session("candidate"),
        traceId: "trace-http",
        idempotencyKey: "idem-submit",
        reason: "envío confirmado",
      };
      const submitted = await fetch(`${base}/drafts/${draft.draftId}/submissions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(submitBody),
      });
      expect(submitted.status).toBe(200);
      const submission = (await submitted.json()) as { submissionId: string; replayed: boolean };
      const retry = await fetch(`${base}/drafts/${draft.draftId}/submissions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(submitBody),
      });
      const replay = (await retry.json()) as { submissionId: string; replayed: boolean };
      expect(replay).toEqual({ ...submission, replayed: true, interview: "pending_employer_approval" });

      const interviewDenied = await fetch(`${base}/submissions/${submission.submissionId}/interview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session: session("employer"),
          traceId: "trace-http",
          idempotencyKey: "idem-interview",
          reason: "todavía no hay aprobación",
          decision: "approved",
        }),
      });
      expect(interviewDenied.status).toBe(422);

      const employerApproval = await fetch(`${base}/submissions/${submission.submissionId}/approvals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session: session("employer"),
          traceId: "trace-http",
          idempotencyKey: "idem-employer",
          reason: "aprobamos entrevista",
        }),
      });
      expect(employerApproval.status).toBe(200);

      const leaked = await fetch(`${base}/drafts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload({ vacancyTitle: TOKEN })),
      });
      expect(leaked.status).toBe(422);
      expect(await leaked.text()).not.toContain(TOKEN);

      const audit = await fetch(`${base}/audit?traceId=trace-http`, {
        headers: { "x-better-auth-session": JSON.stringify(session("counselor")) },
      });
      const events = (await audit.json()) as { events: Array<{ action: string; role: string }> };
      expect(events.events.map((event) => `${event.role}:${event.action}`)).toEqual([
        "candidate:correction",
        "candidate:approval",
        "candidate:submission",
        "employer:approval",
      ]);
    });
  });

  it("rejects invalid JSON, unknown routes, and a bad session header", async () => {
    await withServer({}, async (base) => {
      const invalid = await fetch(`${base}/drafts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      });
      expect(invalid.status).toBe(400);
      const missing = await fetch(`${base}/nope`);
      expect(missing.status).toBe(404);
      const header = await fetch(`${base}/audit?traceId=trace-http`, {
        headers: { "x-better-auth-session": "not-json" },
      });
      expect(header.status).toBe(400);
      const huge = await fetch(`${base}/drafts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pad: "x".repeat(1_100_000) }),
      });
      expect(huge.status).toBe(413);
    });
  });

  it("stores idempotency rows through the SQL backup adapter", async () => {
    const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
    const rows = new Map<string, { fingerprint: string; response: string }>();
    const store = createSqlIdempotencyStore<{ ok: boolean }>(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT")) {
        const row = rows.get(String(params[0]));
        return { rows: row ? [row] : [] };
      }
      rows.set(String(params[0]), { fingerprint: String(params[1]), response: String(params[2]) });
      return { rows: [] };
    });
    expect(ENSURE_IDEMPOTENCY_TABLE_SQL).toContain("submission_idempotency");
    await store.put({ key: "k1", fingerprint: "fp", response: { ok: true } });
    await expect(store.get("missing")).resolves.toBeUndefined();
    await expect(store.get("k1")).resolves.toEqual({ key: "k1", fingerprint: "fp", response: { ok: true } });
    expect(calls[0]?.sql).toContain("INSERT");
  });

  it("starts the local server entry and the Vercel handler", async () => {
    const server = startApplicationServer(0);
    await once(server, "listening");
    server.close();
    await once(server, "close");

    const { EventEmitter } = await import("node:events");
    const req = new EventEmitter();
    Object.assign(req, { method: "GET", url: "/health", headers: {} });
    let status = 0;
    let raw = "";
    const res = {
      headersSent: false,
      writeHead(code: number) {
        status = code;
        this.headersSent = true;
      },
      end(body: string) {
        raw = body;
      },
    };
    handler(req as never, res as never);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(status).toBe(200);
    expect(raw).toContain("\"ok\":true");
  });
});
