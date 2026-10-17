import { describe, expect, it, vi } from 'vitest';
import { validateIntakeResult } from '@workbridge/domain';
import { createResilientExtractor, heuristicProfileExtractor, type ProfileExtractor } from '@workbridge/profile';
import { createLlmProfileExtractor } from '../src/extractors/llm-extractor';
import type { ChatFn, ChatRequest } from '../src/llm/openrouter';
import { createOpenRouterChat, OpenRouterError } from '../src/llm/openrouter';
import { redactPii } from '../src/pii';
import { createProfileAgent } from '../src/profile-agent';

const fixedNow = () => new Date('2026-10-16T12:00:00.000Z');

const CV = [
  'Ayudaba en la tienda de mi familia los fines de semana, atendiendo clientes y manejando la caja.',
  'Habilidades: Excel, atención al cliente y trabajo en equipo.',
].join('\n');

describe('ProfileAgent', () => {
  it('runs the full intake to a validated profile', async () => {
    const agent = createProfileAgent({ now: fixedNow });
    const result = await agent.run(
      { kind: 'text', ref: 'candidate:statement', text: CV },
      { traceId: 'trace_agent', targetRoles: ['Atención al cliente'] },
    );
    expect(validateIntakeResult(result)).toEqual({ valid: true });
    expect(result.extraction.extractor).toBe('heuristic');
    expect(result.profile.experiences.some((experience) => experience.experience_type === 'family_business')).toBe(true);
  });

  it('accepts an image described by alt text', async () => {
    const agent = createProfileAgent({ now: fixedNow });
    const result = await agent.run(
      { kind: 'image', ref: 'intake:cv.jpg', bytes: new Uint8Array([1, 2]), altText: CV },
      { traceId: 'trace_image' },
    );
    expect(result.profile.sources[0]?.extraction_method).toBe('manual-transcription');
  });
});

describe('createLlmProfileExtractor', () => {
  it('parses and validates a JSON draft from the model', async () => {
    const chat: ChatFn = async () => ({
      content: JSON.stringify({
        skills: [{ original_term: 'Excel', level_hint: 2, evidence: [{ claim: 'CV', source: 'extracted' }] }],
      }),
      model: 'test-model',
    });
    const extractor = createLlmProfileExtractor({ chat });
    const outcome = await extractor.extract({ text: CV, sourceRef: 'x', provenance: 'extracted' });
    expect(outcome.kind).toBe('llm');
    expect(outcome.draft.skills?.[0]?.original_term).toBe('Excel');
  });

  it('redacts PII before sending text to the model', async () => {
    let seen: ChatRequest | undefined;
    const chat: ChatFn = async (request) => {
      seen = request;
      return { content: '{"skills":[]}', model: 'test-model' };
    };
    const extractor = createLlmProfileExtractor({ chat });
    await extractor.extract({
      text: 'Contacto ana.rodriguez@example.com o 6000-0000',
      sourceRef: 'x',
      provenance: 'declared',
    });
    const userMessage = seen?.messages.find((message) => message.role === 'user')?.content ?? '';
    expect(userMessage).not.toContain('ana.rodriguez@example.com');
    expect(userMessage).toContain('[EMAIL]');
  });

  it('throws when the model returns invalid JSON', async () => {
    const chat: ChatFn = async () => ({ content: 'not json', model: 'test-model' });
    const extractor = createLlmProfileExtractor({ chat });
    await expect(extractor.extract({ text: CV, sourceRef: 'x', provenance: 'declared' })).rejects.toThrow();
  });

  it('throws when the draft violates the contract', async () => {
    const chat: ChatFn = async () => ({ content: JSON.stringify({ skills: 'nope' }), model: 'test-model' });
    const extractor = createLlmProfileExtractor({ chat });
    await expect(extractor.extract({ text: CV, sourceRef: 'x', provenance: 'declared' })).rejects.toThrow(
      /contract validation/,
    );
  });
});

describe('createResilientExtractor', () => {
  it('falls back to the heuristic extractor and reports the truth', async () => {
    const failing: ProfileExtractor = {
      kind: 'llm',
      async extract() {
        throw new Error('provider down');
      },
    };
    const onFallback = vi.fn();
    const extractor = createResilientExtractor({ primary: failing, fallback: heuristicProfileExtractor, onFallback });
    const outcome = await extractor.extract({ text: CV, sourceRef: 'x', provenance: 'declared' });
    expect(outcome.kind).toBe('heuristic-fallback');
    expect(onFallback).toHaveBeenCalledOnce();
    expect(outcome.draft.skills?.length).toBeGreaterThan(0);
  });

  it('reports the strategy per call, not via shared state, under concurrency', async () => {
    let calls = 0;
    const primary: ProfileExtractor = {
      kind: 'llm',
      async extract() {
        const n = calls++;
        await new Promise((resolve) => setTimeout(resolve, n === 0 ? 20 : 0));
        if (n === 1) throw new Error('provider down');
        return { draft: { skills: [{ original_term: 'Excel' }] }, kind: 'llm' };
      },
    };
    const extractor = createResilientExtractor({ primary, fallback: heuristicProfileExtractor });
    const [a, b] = await Promise.all([
      extractor.extract({ text: CV, sourceRef: 'x', provenance: 'declared' }),
      extractor.extract({ text: CV, sourceRef: 'x', provenance: 'declared' }),
    ]);
    expect([a.kind, b.kind].sort()).toEqual(['heuristic-fallback', 'llm']);
  });
});

describe('createOpenRouterChat', () => {
  it('sends an authenticated structured-output request and parses the reply', async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.model).toBe('openai/gpt-4o-mini');
      expect(body.response_format.type).toBe('json_schema');
      return new Response(
        JSON.stringify({
          model: 'openai/gpt-4o-mini',
          choices: [{ message: { content: '{"skills":[]}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    const chat = createOpenRouterChat({
      apiKey: 'secret',
      model: 'openai/gpt-4o-mini',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await chat({
      messages: [{ role: 'user', content: 'hi' }],
      jsonSchema: { name: 'draft', schema: { type: 'object' } },
    });
    expect(result.content).toBe('{"skills":[]}');
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 });
  });

  it('throws a typed error on a non-OK response', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 }),
    );
    const chat = createOpenRouterChat({
      apiKey: 'secret',
      model: 'm',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(chat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toBeInstanceOf(OpenRouterError);
  });
});

describe('redactPii', () => {
  it('replaces emails, phones and id-like numbers and counts them', () => {
    const result = redactPii('Escribe a ana@example.com o llama al 6123-4567. Cédula 8-888-8888.');
    expect(result.text).not.toContain('ana@example.com');
    expect(result.replacements).toBeGreaterThanOrEqual(2);
    expect(result.kinds).toContain('email');
  });
});
