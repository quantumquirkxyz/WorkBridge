export interface ApiError {
  status: number;
  code: string;
  details?: string[];
  message: string;
}

export class ApiClientError extends Error {
  readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiClientError';
    this.apiError = apiError;
  }

  static async fromResponse(response: Response): Promise<ApiClientError> {
    return new ApiClientError(await normalizeApiError(response));
  }
}

/** Map a failed fetch Response to a stable ApiError shape for UI and queries. */
export async function normalizeApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const record =
    body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};

  const code = typeof record.error === 'string' ? record.error : 'unknown_error';
  const details = Array.isArray(record.details)
    ? record.details.filter((entry): entry is string => typeof entry === 'string')
    : undefined;
  const explicitMessage = typeof record.message === 'string' ? record.message : undefined;
  const message =
    explicitMessage ??
    (details && details.length > 0 ? details.join(' ') : undefined) ??
    `Request failed (HTTP ${response.status}).`;

  return { status: response.status, code, details, message };
}
