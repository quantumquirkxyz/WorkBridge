import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { resolveDatabaseMode } from "../database";
import { signBetterAuthSession } from "../roles";
import { createApplicationServer } from "../server";
import { sampleMatchDecision, sampleWorkflowEnvelope } from "../fixtures";
import { ENSURE_NOTIFICATION_OUTBOX_SQL } from "../notification";
import { createSqlIdempotencyStore, ENSURE_IDEMPOTENCY_TABLE_SQL, type SqlQuery } from "../store";
import { startApplicationServer } from "../main";
import handler from "../vercel";

const TOKEN = "certo-token-value-123456";
const SESSION_SECRET = "better-auth-test-secret";

function session(role: "candidate" | "employer" | "counselor", id = role) {
  return signBetterAuthSession(
    {
      session: { id: `sess-${id}`, userId: id, expiresAt: "2027-01-01T00:00:00.000Z" },
      user: { id, email: `${id}@workbridge.pa`, role, ...(role === "employer" ? { employerOrgId: "org-1" } : {}) },
    },
    SESSION_SECRET,
  );
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
    match: sampleMatchDecision({ traceId: "trace-http", decisionId: "dec-http" }),
    envelope: sampleWorkflowEnvelope("trace-http", "idem-http"),
    employerOrgId: "org-1",
    ...extra,
  };
}

async function withServer(
  env: Record<string, string | undefined>,
  run: (base: string) => Promise<void>,
  query?: SqlQuery,
) {
  const server = createApplicationServer({
    env: { BETTER_AUTH_SECRET: SESSION_SECRET, ...env },
    clock: () => "2026-10-16T18:00:00.000Z",
    query,
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
    const calls: string[] = [];
    const query: SqlQuery = async (sql) => {
      calls.push(sql);
      return { rows: [] };
    };
    await withServer({ NEON_DATABASE_URL: "postgres://user:secret-pass@neon/db" }, async (base) => {
      const health = await fetch(`${base}/health`);
      const body = (await health.json()) as { databaseMode: string; ok: boolean };
      expect(body).toEqual({ ok: true, databaseMode: "neon-backup", persistence: "sql" });
      expect(JSON.stringify(body)).not.toContain("secret-pass");
      expect(calls).toEqual([]);
      const created = await fetch(`${base}/drafts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const draft = (await created.json()) as { draftId: string };
      await fetch(`${base}/drafts/${draft.draftId}/approvals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session: session("candidate"),
          traceId: "trace-http",
          idempotencyKey: "idem-sql-approve",
          envelope: sampleWorkflowEnvelope("trace-http", "idem-sql-approve"),
          reason: "apruebo",
        }),
      });
      const submitted = await fetch(`${base}/drafts/${draft.draftId}/submissions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session: session("candidate"),
          traceId: "trace-http",
          idempotencyKey: "idem-sql-submit",
          envelope: sampleWorkflowEnvelope("trace-http", "idem-sql-submit"),
          reason: "envío",
        }),
      });
      expect(submitted.status).toBe(200);
      expect(calls[0]).toBe(ENSURE_IDEMPOTENCY_TABLE_SQL);
      expect(calls).toContain(ENSURE_NOTIFICATION_OUTBOX_SQL);
      expect(calls.some((sql) => sql.includes("INSERT INTO notification_outbox"))).toBe(true);
      expect(calls.some((sql) => sql.includes("INSERT"))).toBe(true);
    }, query);
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
          envelope: sampleWorkflowEnvelope("trace-http", "idem-correct"),
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
          envelope: sampleWorkflowEnvelope("trace-http", "idem-approve"),
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
          envelope: sampleWorkflowEnvelope("trace-http", "idem-submit"),
          reason: "intento de un empleador",
        }),
      });
      expect(denied.status).toBe(403);

      const submitBody = {
        session: session("candidate"),
        traceId: "trace-http",
        idempotencyKey: "idem-submit",
        envelope: sampleWorkflowEnvelope("trace-http", "idem-submit"),
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
          envelope: sampleWorkflowEnvelope("trace-http", "idem-interview"),
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
          envelope: sampleWorkflowEnvelope("trace-http", "idem-employer"),
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

  it("exposes the employer submission view with trace, documents, title and approved evidence only", async () => {
    const orgSession = (org: string) =>
      signBetterAuthSession(
        {
          session: { id: `sess-${org}`, userId: `emp-${org}`, expiresAt: "2027-01-01T00:00:00.000Z" },
          user: { id: `emp-${org}`, email: `${org}@workbridge.pa`, role: "employer", employerOrgId: org },
        },
        SESSION_SECRET,
      );
    const post = (base: string, path: string, body: unknown) =>
      fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const action = (key: string, extra: Record<string, unknown> = {}) => ({
      session: session("candidate"),
      traceId: "trace-http",
      idempotencyKey: key,
      envelope: sampleWorkflowEnvelope("trace-http", key),
      reason: "ok",
      ...extra,
    });
    await withServer({}, async (base) => {
      const evidence = [
        { id: "ev-1", kind: "experience", text: "Atendí la caja del kiosco familiar.", credentialStatus: "not_applicable" },
        { id: "ev-2", kind: "skill", text: "Dato descartado por la candidata.", credentialStatus: "not_applicable" },
      ];
      const created = await post(
        base,
        "/drafts",
        payload({ evidence, employerOrgId: "org-a", age: 30, gender: "f", address: "Calle 1", photo: "p.png" }),
      );
      const draft = (await created.json()) as { draftId: string };
      await post(base, `/drafts/${draft.draftId}/corrections`, action("idem-c", { includeEvidenceIds: ["ev-1"] }));
      await post(base, `/drafts/${draft.draftId}/approvals`, action("idem-a"));
      const submitted = await post(base, `/drafts/${draft.draftId}/submissions`, action("idem-s"));
      const sbody = (await submitted.json()) as { submissionId: string };
      const { submissionId } = sbody;

      const read = await fetch(`${base}/submissions/${submissionId}`, {
        headers: { "x-better-auth-session": JSON.stringify(orgSession("org-a")) },
      });
      expect(read.status).toBe(200);
      const text = await read.text();
      const view = JSON.parse(text) as {
        traceId: string;
        vacancyTitle: string;
        documents: { cv: Array<{ text: string }> };
        evidence: Array<{ id: string }>;
      };
      expect(view.traceId).toBe("trace-http");
      expect(view.vacancyTitle).toBe("Cajero");
      expect(view.documents.cv[0]?.text).toBe("Atendí la caja del kiosco familiar.");
      expect(view.evidence.map((item) => item.id)).toEqual(["ev-1"]);
      expect(text).not.toContain("descartado");
      for (const key of ["age", "gender", "address", "photo", "Calle 1"]) expect(text).not.toContain(key);

      const list = await fetch(`${base}/submissions?interview=pending_employer_approval`, {
        headers: { "x-better-auth-session": JSON.stringify(orgSession("org-a")) },
      });
      const listed = (await list.json()) as { submissions: Array<{ vacancyTitle: string; traceId: string }> };
      expect(listed.submissions[0]).toMatchObject({ vacancyTitle: "Cajero", traceId: "trace-http" });

      const other = await fetch(`${base}/submissions/${submissionId}`, {
        headers: { "x-better-auth-session": JSON.stringify(orgSession("org-b")) },
      });
      expect(other.status).toBe(403);

      const decide = (key: string, decision: string) =>
        post(base, `/submissions/${submissionId}/interview`, action(key, { session: orgSession("org-a"), decision }));
      expect((await post(base, `/submissions/${submissionId}/approvals`, action("idem-e", { session: orgSession("org-a") }))).status).toBe(200);
      const decided = await decide("idem-d", "approved");
      expect(decided.status).toBe(200);
      expect(((await decided.json()) as { interview: string }).interview).toBe("approved");
    });
  });

  it("scopes employer submissions by organization, fails closed without one, and records declines", async () => {
    const orgSession = (org: string) =>
      signBetterAuthSession(
        {
          session: { id: `sess-${org}`, userId: `emp-${org}`, expiresAt: "2027-01-01T00:00:00.000Z" },
          user: { id: `emp-${org}`, email: `${org}@workbridge.pa`, role: "employer", employerOrgId: org },
        },
        SESSION_SECRET,
      );
    const post = (base: string, path: string, body: unknown) =>
      fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const get = (base: string, path: string, who: unknown) =>
      fetch(`${base}${path}`, { headers: { "x-better-auth-session": JSON.stringify(who) } });
    const action = (key: string, extra: Record<string, unknown> = {}) => ({
      session: session("candidate"),
      traceId: "trace-http",
      idempotencyKey: key,
      envelope: sampleWorkflowEnvelope("trace-http", key),
      reason: "ok",
      ...extra,
    });
    await withServer({}, async (base) => {
      const submit = async (tag: string, extra: Record<string, unknown>) => {
        const created = await post(base, "/drafts", payload({ idempotencyKey: `idem-${tag}`, envelope: sampleWorkflowEnvelope("trace-http", `idem-${tag}`), ...extra }));
        const { draftId } = (await created.json()) as { draftId: string };
        await post(base, `/drafts/${draftId}/approvals`, action(`a-${tag}`));
        const submitted = await post(base, `/drafts/${draftId}/submissions`, action(`s-${tag}`));
        return ((await submitted.json()) as { submissionId: string }).submissionId;
      };
      const subA = await submit("a", { employerOrgId: "org-a" });
      const subNone = await submit("n", { employerOrgId: undefined });

      const listOf = async (who: unknown) =>
        ((await (await get(base, "/submissions?interview=pending_employer_approval", who)).json()) as {
          submissions: Array<Record<string, unknown>>;
        }).submissions;
      const orgA = await listOf(orgSession("org-a"));
      expect(orgA.map((item) => item.submissionId)).toEqual([subA]);
      expect(Object.keys(orgA[0]!).sort()).toEqual(["interview", "submissionId", "traceId", "vacancyTitle"]);
      expect(await listOf(orgSession("org-b"))).toEqual([]);

      expect((await post(base, `/submissions/${subA}/interview`, action("x1", { session: orgSession("org-b"), decision: "rejected" }))).status).toBe(403);
      expect((await post(base, `/submissions/${subA}/approvals`, action("x2", { session: orgSession("org-b") }))).status).toBe(403);

      expect((await get(base, `/submissions/${subNone}`, orgSession("org-a"))).status).toBe(403);
      expect((await post(base, `/submissions/${subNone}/interview`, action("x3", { session: orgSession("org-a"), decision: "rejected" }))).status).toBe(403);
      expect((await post(base, `/submissions/${subNone}/approvals`, action("x4", { session: orgSession("org-a") }))).status).toBe(403);

      const empty = await post(base, `/submissions/${subA}/interview`, action("x5", { session: orgSession("org-a"), decision: "rejected", reason: "  " }));
      expect(empty.status).toBeGreaterThanOrEqual(400);
      expect(empty.status).toBeLessThan(500);

      const declined = await post(base, `/submissions/${subA}/interview`, action("x6", { session: orgSession("org-a"), decision: "rejected", reason: "Falta experiencia" }));
      expect(declined.status).toBe(200);
      const view = (await declined.json()) as { interview: string; history: Array<Record<string, string>> };
      expect(view.interview).toBe("rejected");
      expect(view.history.at(-1)).toMatchObject({
        action: "rejection",
        actorRole: "employer",
        reason: "Falta experiencia",
        timestamp: "2026-10-16T18:00:00.000Z",
      });
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
      if (sql === ENSURE_IDEMPOTENCY_TABLE_SQL) return { rows: [] };
      if (sql.startsWith("SELECT")) {
        const row = rows.get(String(params[0]));
        return { rows: row ? [row] : [] };
      }
      rows.set(String(params[0]), { fingerprint: String(params[1]), response: String(params[2]) });
      return { rows: [] };
    });
    await store.put({ key: "k1", fingerprint: "fp", response: { ok: true } });
    await expect(store.get("missing")).resolves.toBeUndefined();
    await expect(store.get("k1")).resolves.toEqual({ key: "k1", fingerprint: "fp", response: { ok: true } });
    expect(calls[0]?.sql).toBe(ENSURE_IDEMPOTENCY_TABLE_SQL);
    expect(calls[1]?.sql).toContain("INSERT");
  });

  it("lets the owning candidate read the interview decision", async () => {
    const post = (base: string, path: string, body: unknown) =>
      fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const readAs = (base: string, path: string, who: ReturnType<typeof session>) =>
      fetch(`${base}${path}`, { headers: { "x-better-auth-session": JSON.stringify(who) } });
    await withServer({}, async (base) => {
      const created = await post(base, "/drafts", payload());
      const draft = (await created.json()) as { draftId: string; availableEvidence: Array<{ id: string }> };
      expect(created.status).toBe(201);
      expect(draft.availableEvidence.map((item) => item.id)).toEqual(["ev-1"]);

      const before = await readAs(base, `/drafts/${draft.draftId}/submission`, session("candidate"));
      expect(before.status).toBe(404);

      await post(base, `/drafts/${draft.draftId}/approvals`, {
        session: session("candidate"),
        traceId: "trace-http",
        idempotencyKey: "idem-own-a",
        reason: "apruebo",
        envelope: sampleWorkflowEnvelope("trace-http", "idem-own-a"),
      });
      const submitted = await post(base, `/drafts/${draft.draftId}/submissions`, {
        session: session("candidate"),
        traceId: "trace-http",
        idempotencyKey: "idem-own-s",
        reason: "envío",
        envelope: sampleWorkflowEnvelope("trace-http", "idem-own-s"),
      });
      const submissionId = ((await submitted.json()) as { submissionId: string }).submissionId;

      const pending = await readAs(base, `/drafts/${draft.draftId}/submission`, session("candidate"));
      expect(pending.status).toBe(200);
      expect(await pending.json()).toMatchObject({
        submissionId,
        draftId: draft.draftId,
        interview: "pending_employer_approval",
      });
      expect((await readAs(base, `/drafts/${draft.draftId}/submission`, session("candidate", "other"))).status).toBe(403);

      const declined = await post(base, `/submissions/${submissionId}/interview`, {
        session: session("employer"),
        traceId: "trace-http",
        idempotencyKey: "idem-own-d",
        reason: "no avanzamos",
        decision: "rejected",
        envelope: sampleWorkflowEnvelope("trace-http", "idem-own-d"),
      });
      expect(declined.status).toBe(200);
      const decision = await readAs(base, `/drafts/${draft.draftId}/submission`, session("candidate"));
      expect(await decision.json()).toMatchObject({ interview: "rejected" });
      const listed = await readAs(base, `/drafts/${draft.draftId}`, session("candidate"));
      expect(await listed.json()).toMatchObject({ interview: "rejected", submissionId });
    });
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
