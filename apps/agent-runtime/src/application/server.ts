import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createPgQuery, resolveDatabaseMode, type DatabaseMode } from "./database";
import { ApplicationError } from "./errors";
import { assertNoSecrets, collectSecretValues } from "./secrets";
import { ApplicationService } from "./service";
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
  const service =
    options.service ??
    new ApplicationService({
      secrets,
      clock: options.clock,
      sessionSecret: env.BETTER_AUTH_SECRET ?? "",
      idempotency: useSql ? createSqlIdempotencyStore(options.query ?? createPgQuery(databaseUrl)) : undefined,
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

  if (req.method === "POST" && path === "/drafts") {
    writeJson(res, 201, context.service.createDraft(session, body), context.secrets);
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
    writeJson(res, 200, context.service.decideInterview(session, submissionId, body), context.secrets);
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
  const payload = JSON.stringify(body);
  const leaked = secrets.find((secret) => payload.includes(secret));
  if (leaked) {
    writeError(res, new ApplicationError("A secret was rejected and was not stored.", 422, "secret_rejected"), []);
    return;
  }
  if (!res.headersSent) {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  }
  res.end(payload);
}

function writeError(res: ServerResponse, error: unknown, secrets: readonly string[]): void {
  const known = error instanceof ApplicationError ? error : undefined;
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
