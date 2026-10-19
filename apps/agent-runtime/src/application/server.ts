import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createPgQuery, resolveDatabaseMode, type DatabaseMode } from "./database";
import { ApplicationError } from "./errors";
import { createSqlNotificationOutbox } from "./notification";
import { assertNoSecrets, collectSecretValues } from "./secrets";
import { ApplicationService } from "./service";
import { createApplicationDecisionSource } from "./shortlist";
import { createSqlIdempotencyStore, type SqlQuery } from "./store";

export interface ServerOptions {
  env?: Record<string, string | undefined>;
  service?: ApplicationService;
  clock?: () => string;
  databaseMode?: DatabaseMode;
  query?: SqlQuery;
}

interface RequestContext {
  service: ApplicationService;
  secrets: readonly string[];
  databaseMode: DatabaseMode;
  persistence: "memory" | "sql";
}

export function createApplicationServer(options: ServerOptions = {}) {
  const env = options.env ?? process.env;
  const secrets = collectSecretValues(env);
  const databaseMode = options.databaseMode ?? resolveDatabaseMode(env);
  const databaseUrl = env.DATABASE_URL || env.NEON_DATABASE_URL || "";
  const useSql = databaseMode !== "memory" && databaseUrl.length > 0;
  const persistence = useSql ? "sql" : "memory";
  const sql = useSql ? (options.query ?? createPgQuery(databaseUrl)) : undefined;
  const service =
    options.service ??
    new ApplicationService({
      secrets,
      clock: options.clock,
      sessionSecret: env.BETTER_AUTH_SECRET ?? "",
      idempotency: sql ? createSqlIdempotencyStore(sql) : undefined,
      outbox: sql ? createSqlNotificationOutbox(sql) : undefined,
      shortlist: createApplicationDecisionSource({ query: sql, env, clock: options.clock ?? (() => new Date().toISOString()) }),
    });
  const context: RequestContext = { service, secrets, databaseMode, persistence };
  return createServer((req, res) => {
    void dispatch(req, res, context).catch((error: unknown) => {
      writeError(res, error, secrets);
    });
  });
}

async function dispatch(req: IncomingMessage, res: ServerResponse, context: RequestContext): Promise<void> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const path = url.pathname;
  if (req.method === "GET" && path === "/health") {
    writeJson(
      res,
      200,
      { ok: true, databaseMode: context.databaseMode, persistence: context.persistence },
      context.secrets,
    );
    return;
  }
  const body = req.method === "GET" ? {} : await readBody(req);
  assertNoSecrets(body, context.secrets);
  const session = resolveSession(req, body);

  const shortlist = /^\/vacancies\/([^/]+)\/shortlist$/.exec(path);
  if (req.method === "GET" && shortlist) {
    writeJson(res, 200, { shortlist: await context.service.shortlistForVacancy(session, decodeURIComponent(shortlist[1] ?? "")) }, context.secrets);
    return;
  }

  if (req.method === "GET" && path === "/drafts") {
    writeJson(
      res,
      200,
      { drafts: context.service.listDrafts(session, {
        candidateId: url.searchParams.get("candidateId") ?? undefined,
        gate: url.searchParams.get("gate") ?? undefined,
        pending: url.searchParams.get("pending") === "true",
      }) },
      context.secrets,
    );
    return;
  }

  const ownSubmission = /^\/drafts\/([^/]+)\/submission$/.exec(path);
  if (req.method === "GET" && ownSubmission) {
    writeJson(res, 200, context.service.readOwnSubmission(session, ownSubmission[1] ?? ""), context.secrets);
    return;
  }

  const draftRead = /^\/drafts\/([^/]+)$/.exec(path);
  if (req.method === "GET" && draftRead) {
    writeJson(res, 200, context.service.readDraft(session, draftRead[1] ?? ""), context.secrets);
    return;
  }

  if (req.method === "GET" && path === "/submissions") {
    writeJson(
      res,
      200,
      { submissions: context.service.listSubmissions(session, url.searchParams.get("interview") ?? "") },
      context.secrets,
    );
    return;
  }

  const submissionRead = /^\/submissions\/([^/]+)$/.exec(path);
  if (req.method === "GET" && submissionRead) {
    writeJson(res, 200, context.service.readSubmission(session, submissionRead[1] ?? ""), context.secrets);
    return;
  }

  if (req.method === "POST" && path === "/drafts") {
    writeJson(res, 201, await context.service.createDraftAsync(session, body), context.secrets);
    return;
  }

  const draftAction = /^\/drafts\/([^/]+)\/(corrections|approvals|rejections|submissions)$/.exec(path);
  if (req.method === "POST" && draftAction) {
    const draftId = draftAction[1] ?? "";
    const action = draftAction[2];
    if (action === "corrections") {
      writeJson(res, 200, context.service.correctDraft(session, draftId, body), context.secrets);
      return;
    }
    if (action === "approvals") {
      writeJson(res, 200, context.service.approveDraft(session, draftId, body), context.secrets);
      return;
    }
    if (action === "rejections") {
      writeJson(res, 200, context.service.rejectDraft(session, draftId, body), context.secrets);
      return;
    }
    writeJson(res, 200, await context.service.submit(session, draftId, body), context.secrets);
    return;
  }

  const submissionAction = /^\/submissions\/([^/]+)\/(approvals|interview)$/.exec(path);
  if (req.method === "POST" && submissionAction) {
    const submissionId = submissionAction[1] ?? "";
    const action = submissionAction[2];
    if (action === "approvals") {
      writeJson(res, 200, context.service.approveInterview(session, submissionId, body), context.secrets);
      return;
    }
    writeJson(res, 200, await context.service.decideInterview(session, submissionId, body), context.secrets);
    return;
  }

  if (req.method === "GET" && path === "/audit") {
    writeJson(
      res,
      200,
      { events: context.service.auditTrail(session, url.searchParams.get("traceId") ?? "") },
      context.secrets,
    );
    return;
  }

  throw new ApplicationError("Route not found.", 404, "not_found");
}

function writeJson(res: ServerResponse, status: number, body: unknown, secrets: readonly string[]): void {
  try {
    assertNoSecrets(body, secrets);
  } catch (error) {
    if (error instanceof ApplicationError) {
      writeError(res, error, []);
      return;
    }
    throw error;
  }
  const payload = JSON.stringify(body);
  if (!res.headersSent) {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  }
  res.end(payload);
}

function writeError(res: ServerResponse, error: unknown, secrets: readonly string[]): void {
  const known = error instanceof ApplicationError ? error : undefined;
  if (!known) {
    console.error("application request failed", error instanceof Error ? error.message : error);
  }
  const status = known?.status ?? 500;
  const body = {
    error: known?.code ?? "internal_error",
    message: known?.message ?? "Internal error.",
  };
  writeJson(res, status, body, secrets);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    req.on("data", (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > 1_000_000) {
        failed = true;
        reject(new ApplicationError("Payload too large.", 413, "payload_too_large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (failed) return;
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown);
      } catch {
        reject(new ApplicationError("Body must be JSON.", 400, "invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function resolveSession(req: IncomingMessage, body: unknown): unknown {
  if (isRecord(body) && "session" in body) return body.session;
  const header = req.headers["x-better-auth-session"];
  if (typeof header !== "string" || header.trim() === "") return undefined;
  try {
    return JSON.parse(header) as unknown;
  } catch {
    throw new ApplicationError("Better Auth session header must be JSON.", 400, "invalid_session");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
