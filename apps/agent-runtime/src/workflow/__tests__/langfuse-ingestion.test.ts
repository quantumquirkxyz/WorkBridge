import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkflowRunRequest } from "@workbridge/domain";
import { createWorkflowRuntime } from "../graph";

const BASE_URL = "https://langfuse.test";
const CLOCK = "2026-10-16T12:00:00.000Z";

function request(): WorkflowRunRequest {
  return {
    trace_id: "trace-0096",
    idempotency_key: "idem-0096",
    candidateText: "Experiencia en caja y atención al cliente.",
    vacancyText: "Se busca cajero con atención al cliente.",
    declaredCredentials: [],
    actor: { id: "cand-96", role: "candidate" },
    requestedTools: [],
  };
}

describe("Langfuse ingestion from environment config", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("posts one ingestion batch to the configured base URL when the keys are set", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response("ok", { status: 200 });
    };
    const engine = createWorkflowRuntime({
      clock: () => CLOCK,
      complete: async () => ({ text: "Plan de practica en caja" }),
      langfuseEnv: {
        LANGFUSE_PUBLIC_KEY: "pk-test",
        LANGFUSE_SECRET_KEY: "sk-test",
        LANGFUSE_BASE_URL: BASE_URL,
      },
      fetchImpl,
    });

    const result = await engine.run(request());

    expect(result.status).toBe("success");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${BASE_URL}/api/public/ingestion`);
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      batch: Array<{ id: string; type: string }>;
    };
    expect(body.batch.some((item) => item.type === "trace-create" && item.id === "trace-0096")).toBe(true);
    expect(calls[0]?.init?.headers).toMatchObject({
      Authorization: "Basic cGstdGVzdDpzay10ZXN0",
      "Content-Type": "application/json",
    });
  });

  it("only flushes the completed run when the runtime is reused", async () => {
    const batches: Array<{ batch: Array<{ body: { id: string; traceId?: string; endTime?: string } }> }> = [];
    const engine = createWorkflowRuntime({
      clock: () => CLOCK,
      complete: async () => ({ text: "Plan de practica en caja" }),
      langfuseEnv: { LANGFUSE_PUBLIC_KEY: "pk-test", LANGFUSE_SECRET_KEY: "sk-test" },
      fetchImpl: async (_input, init) => {
        batches.push(JSON.parse(String(init?.body)));
        return new Response("ok");
      },
    });
    await engine.run(request());
    const second = { ...request(), trace_id: "trace-0097", idempotency_key: "idem-0097" };
    await engine.run(second);
    const replay = await engine.run(second);

    expect(replay.idempotentReplay).toBe(true);
    expect(batches).toHaveLength(2);
    expect(batches[1]?.batch.every(({ body }) => (body.traceId ?? body.id) === second.trace_id)).toBe(true);
    const spans = batches[1]?.batch.filter(({ body }) => body.traceId);
    expect(spans?.length).toBeGreaterThan(0);
    expect(spans?.every(({ body }) => body.endTime === CLOCK)).toBe(true);
  });

  it.each([
    {},
    { LANGFUSE_PUBLIC_KEY: "pk-test" },
    { LANGFUSE_SECRET_KEY: "sk-test" },
    { LANGFUSE_PUBLIC_KEY: " ", LANGFUSE_SECRET_KEY: "sk-test" },
  ])("makes no network call when a key is unset: %j", async (langfuseEnv) => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response("ok", { status: 200 });
    };
    const engine = createWorkflowRuntime({
      clock: () => CLOCK,
      complete: async () => ({ text: "Plan de practica en caja" }),
      langfuseEnv,
      fetchImpl,
    });

    const result = await engine.run(request());

    expect(result.status).toBe("success");
    expect(calls).toEqual([]);
  });

  it.each(["http", "network"])("still succeeds on Langfuse %s failure", async (failure) => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      if (failure === "network") throw new Error("connection reset");
      return new Response("unavailable", { status: 503 });
    };
    const engine = createWorkflowRuntime({
      clock: () => CLOCK,
      complete: async () => ({ text: "Plan de practica en caja" }),
      langfuseEnv: {
        LANGFUSE_PUBLIC_KEY: "pk-test",
        LANGFUSE_SECRET_KEY: "sk-test",
        LANGFUSE_BASE_URL: BASE_URL,
      },
      fetchImpl,
    });

    const result = await engine.run(request());

    expect(result.status).toBe("success");
    expect(calls).toBe(1);
  });

  it("uses process environment and the default base URL", async () => {
    vi.stubEnv("LANGFUSE_PUBLIC_KEY", " pk-test ");
    vi.stubEnv("LANGFUSE_SECRET_KEY", " sk-test ");
    vi.stubEnv("LANGFUSE_BASE_URL", " ");
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok"));
    const engine = createWorkflowRuntime({
      clock: () => CLOCK,
      complete: async () => ({ text: "Plan de practica en caja" }),
      fetchImpl,
    });
    expect((await engine.run(request())).status).toBe("success");
    expect(fetchImpl).toHaveBeenCalledWith("https://cloud.langfuse.com/api/public/ingestion", expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));
  });
});
