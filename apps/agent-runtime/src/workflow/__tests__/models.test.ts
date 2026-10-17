import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  CAPABILITY_CHAINS,
  ModelChainExhaustedError,
  ModelRouter,
  createOpenRouterClient,
} from "../models";

const PRIMARY = CAPABILITY_CHAINS.planning.models[0];
const FALLBACK = CAPABILITY_CHAINS.planning.models[1];

describe("ModelRouter", () => {
  it("rejects a prompt that exceeds the capability budget before calling a model", async () => {
    const calls: string[] = [];
    const router = new ModelRouter(CAPABILITY_CHAINS, async (modelId) => {
      calls.push(modelId);
      return { text: "ok" };
    });
    await expect(
      router.complete({ capability: "planning", prompt: "hola", estimatedTokens: 50_000 }),
    ).rejects.toBeInstanceOf(BudgetExceededError);
    expect(calls).toEqual([]);
  });

  it("promotes the next model after a failure and disables the failed one", async () => {
    const calls: string[] = [];
    const router = new ModelRouter(CAPABILITY_CHAINS, async (modelId) => {
      calls.push(modelId);
      if (modelId === PRIMARY) throw new Error("forced model failure");
      return { text: "plan de practica" };
    });
    const result = await router.complete({
      capability: "planning",
      prompt: "hola",
      estimatedTokens: 10,
    });
    expect(result.modelId).toBe(FALLBACK);
    expect(result.fallbacks).toEqual([{ from: PRIMARY, to: FALLBACK }]);
    expect(router.isAvailable(PRIMARY)).toBe(false);
    expect(calls).toEqual([PRIMARY, FALLBACK]);
  });

  it("disables models missing from the OpenRouter catalog during preflight", async () => {
    const calls: string[] = [];
    const router = new ModelRouter(CAPABILITY_CHAINS, async (modelId) => {
      calls.push(modelId);
      return { text: "plan" };
    });
    const removed = router.preflight([FALLBACK]);
    expect(removed).toContain(PRIMARY);
    const result = await router.complete({
      capability: "planning",
      prompt: "hola",
      estimatedTokens: 10,
    });
    expect(result.modelId).toBe(FALLBACK);
    expect(result.fallbacks).toEqual([{ from: PRIMARY, to: FALLBACK }]);
    expect(calls).toEqual([FALLBACK]);
  });

  it("dead-letters the chain when every model fails", async () => {
    const router = new ModelRouter(CAPABILITY_CHAINS, async () => {
      throw new Error("provider down");
    });
    await expect(
      router.complete({ capability: "planning", prompt: "hola", estimatedTokens: 10 }),
    ).rejects.toBeInstanceOf(ModelChainExhaustedError);
  });
});

describe("createOpenRouterClient", () => {
  it("reads the catalog and a completion from the injected fetch", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        return new Response(JSON.stringify({ data: [{ id: "google/gemma-2-9b-it:free" }] }), {
          status: 200,
        });
      }
      expect(init?.method).toBe("POST");
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "nota corta" } }] }),
        { status: 200 },
      );
    };
    const client = createOpenRouterClient({
      apiKey: "test-key",
      fetchImpl,
      baseUrl: "https://openrouter.test/api/v1",
    });
    await expect(client.catalog()).resolves.toEqual(["google/gemma-2-9b-it:free"]);
    await expect(client.complete("google/gemma-2-9b-it:free", "hola")).resolves.toEqual({
      text: "nota corta",
    });
  });

  it("surfaces a failed preflight status", async () => {
    const client = createOpenRouterClient({
      apiKey: "test-key",
      fetchImpl: async () => new Response("no", { status: 503 }),
      baseUrl: "https://openrouter.test/api/v1",
    });
    await expect(client.catalog()).rejects.toThrow(/503/);
  });
});
