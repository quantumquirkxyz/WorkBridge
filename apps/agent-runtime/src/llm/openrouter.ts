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
  /** Aborts the underlying HTTP request (e.g. on a caller-side timeout). */
  signal?: AbortSignal;
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

const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/** Empty env overrides (`OPENROUTER_BASE_URL=`) must not replace the default host. */
function resolveBaseUrl(baseUrl?: string): string {
  const trimmed = baseUrl?.trim();
  return (trimmed ? trimmed : DEFAULT_OPENROUTER_BASE_URL).replace(/\/$/, '');
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
interface OpenRouterErrorBody {
  error?: { message?: string };
}
interface OpenRouterResponse extends OpenRouterErrorBody {
  model?: string;
  choices?: OpenRouterChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** Shared auth/attribution headers for every OpenRouter call. */
function authHeaders(options: OpenRouterOptions): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${options.apiKey}`,
    ...(options.referer ? { 'HTTP-Referer': options.referer } : {}),
    ...(options.title ? { 'X-Title': options.title } : {}),
  };
}

/** POST a JSON body and surface OpenRouter errors as typed `OpenRouterError`s. */
async function postJson<T extends OpenRouterErrorBody>(
  doFetch: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  errorLabel: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await doFetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  const parsed = (await response.json()) as T;
  if (!response.ok) {
    throw new OpenRouterError(parsed.error?.message ?? `${errorLabel} (${response.status})`, response.status);
  }
  return parsed;
}

export function createOpenRouterChat(options: OpenRouterOptions): ChatFn {
  const baseUrl = resolveBaseUrl(options.baseUrl);
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

    const parsed = await postJson<OpenRouterResponse>(
      doFetch,
      `${baseUrl}/chat/completions`,
      authHeaders(options),
      body,
      'OpenRouter request failed',
      request.signal,
    );

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

interface VisionResponse extends OpenRouterErrorBody {
  choices?: Array<{ message?: { content?: string } }>;
}

/** Describe/transcribe an image through an OpenRouter vision model. */
export function createOpenRouterVision(options: OpenRouterOptions): (input: { bytes: Uint8Array; mimeType?: string }) => Promise<{ text: string }> {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const doFetch = options.fetchImpl ?? fetch;

  return async ({ bytes, mimeType }) => {
    const dataUrl = `data:${mimeType ?? 'image/png'};base64,${Buffer.from(bytes).toString('base64')}`;
    const parsed = await postJson<VisionResponse>(
      doFetch,
      `${baseUrl}/chat/completions`,
      authHeaders(options),
      {
        model: options.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcribe el texto de esta imagen de CV exactamente como está escrito. Incluye cada habilidad listada, técnicas y blandas. No resumas, no corrijas y no agregues datos que no estén en la imagen.',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      },
      'OpenRouter vision request failed',
    );
    const text = parsed.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text.length === 0) {
      throw new OpenRouterError('OpenRouter vision returned no content');
    }
    return { text };
  };
}
