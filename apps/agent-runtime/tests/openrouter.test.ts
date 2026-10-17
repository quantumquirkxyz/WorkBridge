import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterChat } from '../src/llm/openrouter';

describe('createOpenRouterChat', () => {
  it('forwards the caller abort signal to fetch', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 }));
    const chat = createOpenRouterChat({ apiKey: 'k', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch });
    const controller = new AbortController();
    await chat({ messages: [{ role: 'user', content: 'hola' }], signal: controller.signal });
    expect(((fetchImpl.mock.calls[0] as unknown) as [RequestInfo, RequestInit])[1].signal).toBe(controller.signal);
  });
});
