/**
 * Thin OpenRouter client used by the Profile agent. Only the request/response
 * shapes this ticket needs are implemented; retries, model fallback chains and
 * token budgets are owned by the workflow/safety plane (ticket #9).
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface JsonSchemaRequest {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

export interface ChatRequest {
  messages: ChatMessage[];
  jsonSchema?: JsonSchemaRequest;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export type ChatFn = (request: ChatRequest) => Promise<ChatResult>;

export interface OpenRouterOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  referer?: string;
  title?: string;
}

export class OpenRouterError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OpenRouterError';
    if (status !== undefined) this.status = status;
  }
}

interface OpenRouterChoice {
  message?: { content?: string };
}
interface OpenRouterResponse {
  model?: string;
  choices?: OpenRouterChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export function createOpenRouterChat(options: OpenRouterOptions): ChatFn {
  const baseUrl = (options.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const doFetch = options.fetchImpl ?? fetch;

  return async (request) => {
    const body: Record<string, unknown> = {
      model: options.model,
      messages: request.messages,
    };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: request.jsonSchema.name,
          strict: request.jsonSchema.strict ?? true,
          schema: request.jsonSchema.schema,
        },
      };
    }

    const response = await doFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.apiKey}`,
        ...(options.referer ? { 'HTTP-Referer': options.referer } : {}),
        ...(options.title ? { 'X-Title': options.title } : {}),
      },
      body: JSON.stringify(body),
    });

    const parsed = (await response.json()) as OpenRouterResponse;
    if (!response.ok) {
      throw new OpenRouterError(parsed.error?.message ?? `OpenRouter request failed (${response.status})`, response.status);
    }
    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new OpenRouterError('OpenRouter returned no message content');
    }
    const result: ChatResult = { content, model: parsed.model ?? options.model };
    if (parsed.usage) {
      result.usage = {
        promptTokens: parsed.usage.prompt_tokens ?? 0,
        completionTokens: parsed.usage.completion_tokens ?? 0,
      };
    }
    return result;
  };
}

export interface VisionOptions extends OpenRouterOptions {}

interface VisionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

/** Describe/transcribe an image through an OpenRouter vision model. */
export function createOpenRouterVision(options: VisionOptions): (input: { bytes: Uint8Array; mimeType?: string }) => Promise<{ text: string }> {
  const baseUrl = (options.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const doFetch = options.fetchImpl ?? fetch;

  return async ({ bytes, mimeType }) => {
    const dataUrl = `data:${mimeType ?? 'image/png'};base64,${Buffer.from(bytes).toString('base64')}`;
    const response = await doFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.apiKey}`,
        ...(options.referer ? { 'HTTP-Referer': options.referer } : {}),
        ...(options.title ? { 'X-Title': options.title } : {}),
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe todo el texto legible de esta imagen de CV o documento. Devuelve solo el texto.',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    const parsed = (await response.json()) as VisionResponse;
    if (!response.ok) {
      throw new OpenRouterError(parsed.error?.message ?? `OpenRouter vision request failed (${response.status})`, response.status);
    }
    const text = parsed.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text.length === 0) {
      throw new OpenRouterError('OpenRouter vision returned no content');
    }
    return { text };
  };
}
