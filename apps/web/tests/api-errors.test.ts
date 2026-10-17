import { describe, expect, it } from 'vitest';
import { ApiClientError, normalizeApiError } from '../lib/api/errors';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('normalizeApiError', () => {
  it('maps validation details to message when message is absent', async () => {
    const error = await normalizeApiError(
      jsonResponse(400, { error: 'invalid_preferences', details: ['Falta modalidad.', 'Falta provincia.'] }),
    );
    expect(error).toEqual({
      status: 400,
      code: 'invalid_preferences',
      details: ['Falta modalidad.', 'Falta provincia.'],
      message: 'Falta modalidad. Falta provincia.',
    });
  });

  it('prefers an explicit message field', async () => {
    const error = await normalizeApiError(
      jsonResponse(422, { error: 'intake_failed', message: 'El agente no respondió.' }),
    );
    expect(error.message).toBe('El agente no respondió.');
    expect(error.code).toBe('intake_failed');
  });

  it('falls back to HTTP status when the body is not JSON', async () => {
    const error = await normalizeApiError(new Response('not json', { status: 503 }));
    expect(error.code).toBe('unknown_error');
    expect(error.message).toBe('Request failed (HTTP 503).');
  });
});

describe('ApiClientError', () => {
  it('wraps normalizeApiError for failed responses', async () => {
    const error = await ApiClientError.fromResponse(jsonResponse(404, { error: 'not_found' }));
    expect(error).toBeInstanceOf(Error);
    expect(error.apiError.status).toBe(404);
    expect(error.message).toBe('Request failed (HTTP 404).');
  });
});
