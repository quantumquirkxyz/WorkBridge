import type { ProviderName } from "./status";

export interface HttpSuccess {
  kind: "response";
  status: number;
  body: unknown;
}

export interface HttpFailure {
  kind: "unavailable";
  reason: string;
  outage: boolean;
}

const DEFAULT_TIMEOUT_MS = 5_000;

export async function fetchJsonWithRetry(
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
  provider: ProviderName,
  url: string,
  init: { method: "GET" | "POST"; headers: Headers; body?: string },
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<HttpSuccess | HttpFailure> {
  let sawOutage = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 404) {
        return { kind: "unavailable", reason: `${provider}_not_found`, outage: false };
      }
      if (response.status >= 500) {
        sawOutage = true;
        continue;
      }
      const body = await readJson(response);
      if (!response.ok) {
        return { kind: "unavailable", reason: `${provider}_unavailable`, outage: false };
      }
      if (body === undefined) {
        return { kind: "unavailable", reason: `${provider}_invalid_response`, outage: false };
      }
      return { kind: "response", status: response.status, body };
    } catch {
      sawOutage = true;
    }
  }

  return {
    kind: "unavailable",
    reason: `${provider}_unavailable`,
    outage: sawOutage,
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function traceHeaders(
  traceId: string,
  tokenHeader?: { name: string; value: string },
): Headers {
  const headers = new Headers({ accept: "application/json", "x-trace-id": traceId });
  if (tokenHeader) headers.set(tokenHeader.name, tokenHeader.value);
  return headers;
}
