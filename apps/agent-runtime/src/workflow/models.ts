import type { AgentId } from "@workbridge/domain";

export type ModelCapability = "extraction" | "matching" | "planning";

export interface ModelChain {
  capability: ModelCapability;
  models: readonly string[];
  budgetTokens: number;
}

export const CAPABILITY_CHAINS = {
  extraction: {
    capability: "extraction",
    models: ["google/gemma-2-9b-it:free", "meta-llama/llama-3.2-3b-instruct:free"],
    budgetTokens: 1500,
  },
  matching: {
    capability: "matching",
    models: ["google/gemma-2-9b-it:free", "mistralai/mistral-7b-instruct:free"],
    budgetTokens: 1500,
  },
  planning: {
    capability: "planning",
    models: ["google/gemma-2-9b-it:free", "qwen/qwen-2.5-7b-instruct:free"],
    budgetTokens: 1500,
  },
} as const satisfies Record<ModelCapability, ModelChain>;

export const AGENT_CAPABILITIES: Record<AgentId, ModelCapability> = {
  exploration: "planning",
  profile_and_evidence: "extraction",
  market_and_matching: "matching",
  training: "planning",
};

export interface ModelFallback {
  from: string;
  to: string;
}

export interface ModelCompletion {
  modelId: string;
  text: string;
  fallbacks: ModelFallback[];
  capability: ModelCapability;
}

export class BudgetExceededError extends Error {
  readonly code = "budget_exceeded";

  constructor(capability: ModelCapability, estimatedTokens: number, budgetTokens: number) {
    super(
      `Estimated ${estimatedTokens} tokens exceed the ${capability} budget of ${budgetTokens}`,
    );
    this.name = "BudgetExceededError";
  }
}

export class ModelChainExhaustedError extends Error {
  readonly code = "model_chain_exhausted";
  readonly attempted: readonly string[];

  constructor(capability: ModelCapability, attempted: readonly string[], cause: string) {
    super(`OpenRouter chain for ${capability} was exhausted: ${cause}`);
    this.name = "ModelChainExhaustedError";
    this.attempted = attempted;
  }
}

export type ModelInvoke = (modelId: string, prompt: string) => Promise<{ text: string }>;

export class ModelRouter {
  private readonly disabled = new Map<string, string>();

  constructor(
    private readonly chains: Record<ModelCapability, ModelChain> = CAPABILITY_CHAINS,
    private readonly invoke: ModelInvoke,
  ) {}

  /** Drop models that preflight did not find in the OpenRouter catalog. */
  preflight(catalog: readonly string[]): string[] {
    const removed: string[] = [];
    for (const chain of Object.values(this.chains)) {
      for (const modelId of chain.models) {
        if (!catalog.includes(modelId) && !this.disabled.has(modelId)) {
          this.disabled.set(modelId, "absent from OpenRouter catalog");
          removed.push(modelId);
        }
      }
    }
    return removed;
  }

  isAvailable(modelId: string): boolean {
    return !this.disabled.has(modelId);
  }

  async complete(request: {
    capability: ModelCapability;
    prompt: string;
    estimatedTokens: number;
  }): Promise<ModelCompletion> {
    const chain = this.chains[request.capability];
    if (request.estimatedTokens > chain.budgetTokens) {
      throw new BudgetExceededError(
        request.capability,
        request.estimatedTokens,
        chain.budgetTokens,
      );
    }

    const fallbacks: ModelFallback[] = [];
    const attempted: string[] = [];
    let previous: string | null = null;
    let lastError = "no model available";

    for (const modelId of chain.models) {
      if (this.disabled.has(modelId)) {
        previous = modelId;
        continue;
      }
      if (previous) fallbacks.push({ from: previous, to: modelId });
      attempted.push(modelId);
      try {
        const result = await this.invoke(modelId, request.prompt);
        return {
          modelId,
          text: result.text,
          fallbacks,
          capability: request.capability,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "model call failed";
        this.disabled.set(modelId, lastError);
        previous = modelId;
      }
    }

    throw new ModelChainExhaustedError(request.capability, attempted, lastError);
  }
}

export function estimateTokens(prompt: string): number {
  return Math.max(1, Math.ceil(prompt.length / 4));
}

interface OpenRouterModelList {
  data?: Array<{ id?: string }>;
}

interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export function createOpenRouterClient(options: {
  apiKey: string;
  fetchImpl: typeof fetch;
  baseUrl?: string;
}): { catalog: () => Promise<string[]>; complete: ModelInvoke } {
  const trimmedBaseUrl = options.baseUrl?.trim();
  const baseUrl = (trimmedBaseUrl ? trimmedBaseUrl : "https://openrouter.ai/api/v1").replace(/\/$/, "");

  return {
    async catalog() {
      const response = await options.fetchImpl(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${options.apiKey}` },
      });
      if (!response.ok) {
        throw new Error(`OpenRouter preflight failed: ${response.status}`);
      }
      const body = (await response.json()) as OpenRouterModelList;
      return (body.data ?? []).flatMap((model) => (model.id ? [model.id] : []));
    },
    async complete(modelId, prompt) {
      const response = await options.fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 256,
        }),
      });
      const body = (await response.json()) as OpenRouterChatResponse;
      if (!response.ok) {
        throw new Error(body.error?.message ?? `OpenRouter completion failed: ${response.status}`);
      }
      const text = body.choices?.[0]?.message?.content;
      if (!text) throw new Error(`OpenRouter model ${modelId} returned an empty completion`);
      return { text };
    },
  };
}
