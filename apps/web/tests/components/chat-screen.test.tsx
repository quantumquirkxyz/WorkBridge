import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialSlotState } from '@/lib/chat/tracker';
import { SLOTS } from '@/lib/chat/slots';
import { ChatScreen } from '@/components/ChatScreen';
import { server, userEvent } from './setup';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function turn(overrides: Record<string, unknown> = {}) {
  return {
    intent: 'ask_slot',
    reply: '¿Cómo te llamo?',
    pendingSlot: 'greeting',
    slotUpdates: [],
    chips: [{ label: 'Prefiero no decirlo', kind: 'answer' }],
    phase: 'profile',
    source: 'fallback',
    ...overrides,
  };
}

describe('ChatScreen', () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
    server.use(http.get('/api/chat', () => HttpResponse.json({ transcript: [], slotState: initialSlotState() })));
  });

  it('sends the next chat turn with the version after a committed job', async () => {
    const versions: number[] = [];
    server.use(
      http.post('/api/v1/chat/turns', async ({ request }) => {
        const body = await request.json() as { sessionVersion?: number };
        versions.push(body.sessionVersion ?? -1);
        const jobId = `chatjob-${versions.length}`;
        return HttpResponse.json({ jobId, status: 'queued', statusUrl: `/api/v1/chat/turns/${jobId}`, sessionVersion: body.sessionVersion, pollAfterMs: 1 }, { status: 202 });
      }),
      http.get('/api/v1/chat/turns/:jobId', ({ params }) => HttpResponse.json({
        jobId: params.jobId,
        status: 'succeeded',
        sessionVersion: versions.at(-1) ?? 0,
        result: turn({ reply: `respuesta ${versions.length}` }),
      })),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'hola');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('respuesta 1')).toBeInTheDocument();
    await userEvent.type(input, 'sigo');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('respuesta 2')).toBeInTheDocument();
    expect(versions).toEqual([0, 1]);
  });

  it('renders an accessible transcript, quick replies, and keeps focus in the composer', async () => {
    server.use(http.post('/api/chat', () => HttpResponse.json(turn())));
    const { container } = render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    expect(screen.getByRole('log', { name: 'Conversación' })).toHaveAttribute('aria-live', 'polite');
    await userEvent.type(input, 'hola');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findAllByRole('button', { name: 'Prefiero no decirlo' })).toHaveLength(2);
    await waitFor(() => expect(input).toHaveFocus());
    expect(container.querySelector('.chat-steps')).toBeInTheDocument();
  });

  it('restores the server-reported phase after reload', async () => {
    const slotState = initialSlotState();
    slotState.zone = { state: 'missing' };
    server.use(http.get('/api/chat', () => HttpResponse.json({ transcript: [{ role: 'assistant', content: '¿En qué zona?' }], slotState, pendingSlot: 'zone', phase: 'preferences' })));
    render(<ChatScreen />);
    await screen.findByText('¿En qué zona?');
    expect(screen.getByLabelText('Fase preferencias')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'San Miguelito' })).toBeInTheDocument();
  });

  it('starts a seeded empty session at the next unanswered slot', async () => {
    const slotState = initialSlotState();
    for (const slot of SLOTS.filter((item) => item.phase === 'profile')) slotState[slot.id] = { state: 'filled', value: 'known' };
    slotState.target_roles = { state: 'filled', value: 'Ventas' };
    server.use(http.get('/api/chat', () => HttpResponse.json({ transcript: [], slotState, pendingSlot: 'zone', phase: 'preferences' })));
    render(<ChatScreen />);
    expect(await screen.findByText('¿En qué zona te queda bien trabajar?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'San Miguelito' })).toBeInTheDocument();
    expect(screen.queryByText('¿Cómo te llamo?')).not.toBeInTheDocument();
  });

  it('starts an entirely empty session with the greeting quick reply', async () => {
    let action: unknown;
    server.use(http.post('/api/chat', async ({ request }) => {
      action = (await request.json() as { action?: unknown }).action;
      return HttpResponse.json(turn({ reply: '¿Tienes un CV?', pendingSlot: 'cv_source' }));
    }));
    render(<ChatScreen />);
    expect(await screen.findByText(/¡Hola! Soy WorkBridge/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Prefiero no decirlo' }));
    await waitFor(() => expect(action).toEqual({ kind: 'chip', slot: 'greeting' }));
  });

  it('runs intake before exploration when profile completion reports done', async () => {
    const slotState = initialSlotState();
    for (const slot of SLOTS) slotState[slot.id] = { state: 'filled', value: 'known' };
    const calls: string[] = [];
    server.use(
      http.get('/api/chat', () => HttpResponse.json({ transcript: [{ role: 'assistant', content: 'Listo para buscar.' }], slotState, phase: 'profile' })),
      http.post('/api/chat', () => HttpResponse.json(turn({ phase: 'done', pendingSlot: null, chips: [], reply: 'Listo.' }))),
      http.post('/api/intake', () => { calls.push('intake'); return HttpResponse.json({ profile: { skills: [], experiences: [] } }); }),
      http.post('/api/explore', () => { calls.push('explore'); return HttpResponse.json({ preferences: {} }); }),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'continuemos');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vacantes'));
    expect(calls).toEqual(['intake', 'explore']);
  });

  it('resumes exploration after a successful intake retry', async () => {
    const slotState = initialSlotState();
    for (const slot of SLOTS) slotState[slot.id] = { state: 'filled', value: 'known' };
    let intakeCalls = 0;
    let exploreCalls = 0;
    server.use(
      http.get('/api/chat', () => HttpResponse.json({ transcript: [{ role: 'assistant', content: 'Listo para buscar.' }], slotState, phase: 'profile' })),
      http.post('/api/chat', () => HttpResponse.json(turn({ phase: 'done', pendingSlot: null, chips: [], reply: 'Listo.' }))),
      http.post('/api/intake', () => { intakeCalls += 1; return intakeCalls === 1 ? HttpResponse.json({ error: 'failed' }, { status: 503 }) : HttpResponse.json({ profile: { skills: [], experiences: [] } }); }),
      http.post('/api/explore', () => { exploreCalls += 1; return HttpResponse.json({ preferences: {} }); }),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'continuemos');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vacantes'));
    expect(intakeCalls).toBe(2);
    expect(exploreCalls).toBe(1);
  });

  it('shows confirmation chips and sends Sí for a proposed value', async () => {
    let calls = 0;
    server.use(
      http.post('/api/chat', async ({ request }) => {
        calls += 1;
        const body = await request.json() as { action?: { kind?: string } };
        if (body.action?.kind === 'confirm') return HttpResponse.json(turn({ reply: '¿En qué zona?', pendingSlot: 'zone' }));
        return HttpResponse.json(turn({ reply: '¿Vives en Panamá?', pendingSlot: 'greeting', slotUpdates: [{ slot: 'zone', value: 'Panamá', state: 'proposed' }], chips: [{ label: 'Sí', kind: 'confirm' }, { label: 'Cambiar', kind: 'change' }] }));
      }),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'Vivo en Panamá');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: 'Sí' }));
    await waitFor(() => expect(calls).toBe(2));
    expect(screen.getByText('¿En qué zona?')).toBeInTheDocument();
    expect(screen.getByText('Vivo en Panamá').closest('.chat-bubble-user')).toContainElement(screen.getByRole('button', { name: 'Cambiar' }));
  });

  it('answers an off-slot question and keeps the pending slot', async () => {
    server.use(http.post('/api/chat', () => HttpResponse.json(turn({ reply: 'En general, soporte técnico ayuda a resolver problemas. ¿Cómo te llamo?' }))));
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, '¿Qué hace soporte técnico?');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText(/En general, soporte técnico/)).toBeInTheDocument();
    expect(screen.getAllByText(/¿Cómo te llamo/)).toHaveLength(2);
  });

  it('shows up to four skill chips after intake completes', async () => {
    server.use(
      http.post('/api/chat', () => HttpResponse.json(turn({ phase: 'preferences', pendingSlot: 'zone', reply: '¿En qué zona?' }))),
      http.post('/api/intake', () => HttpResponse.json({ profile: { skills: [{ canonical_name: 'Ventas' }, { canonical_name: 'Caja' }, { canonical_name: 'Inventario' }, { canonical_name: 'Atención' }, { canonical_name: 'Extra' }], experiences: [] }, extraction: { needs_review: false } })),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'Tengo experiencia');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('Ventas')).toBeInTheDocument();
    expect(screen.queryByText('Extra')).not.toBeInTheDocument();
  });

  it('retries exploration without replaying the final chat turn', async () => {
    let exploreCalls = 0;
    server.use(
      http.post('/api/chat', () => HttpResponse.json(turn({ phase: 'done', pendingSlot: null, chips: [], reply: 'Listo.' }))),
      http.post('/api/intake', () => HttpResponse.json({ profile: { skills: [], experiences: [] } })),
      http.post('/api/explore', () => {
        exploreCalls += 1;
        return exploreCalls === 1 ? HttpResponse.json({ error: 'failed' }, { status: 503 }) : HttpResponse.json({ preferences: {} });
      }),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'hola');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vacantes'));
    expect(exploreCalls).toBe(2);
  });

  it('preserves the user transcript and offers retry after a failed request', async () => {
    let calls = 0;
    server.use(http.post('/api/chat', () => {
      calls += 1;
      return calls === 1 ? HttpResponse.json({ error: 'failed' }, { status: 503 }) : HttpResponse.json(turn());
    }));
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'hola');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(calls).toBe(2));
    expect(screen.getAllByText('hola')).toHaveLength(1);
  });

  it('goes to vacancies when the assistant says goodbye', async () => {
    server.use(
      http.post('/api/chat', () => HttpResponse.json(turn({ reply: '¡Éxito en tu búsqueda laboral!', pendingSlot: null, phase: 'done', chips: [] }))),
      http.post('/api/intake', () => HttpResponse.json({ profile: { skills: [], experiences: [] } })),
      http.post('/api/explore', () => HttpResponse.json({ preferences: {} })),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'hola');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vacantes'));
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
  });

  it('uploads a CV instead of sending the upload chip as text', async () => {
    const calls: string[] = [];
    server.use(
      http.get('/api/chat', () => {
        const slotState = initialSlotState();
        slotState.greeting = { state: 'filled', value: 'Mateo' };
        return HttpResponse.json({ transcript: [{ role: 'assistant', content: '¿Tienes un CV o una hoja de vida?' }], slotState, pendingSlot: 'cv_source', phase: 'profile' });
      }),
      http.post('/api/intake', async ({ request }) => {
        const body = await request.json() as { kind?: string; fileName?: string; contentBase64?: string };
        calls.push(`${body.kind}:${body.fileName}:${body.contentBase64?.length ?? 0}`);
        return HttpResponse.json({ profile: { skills: [{ canonical_name: 'C#' }], experiences: [{}] }, extraction: { needs_review: false } });
      }),
      http.post('/api/chat', async ({ request }) => {
        const body = await request.json() as { action?: { kind?: string; slot?: string; value?: string } };
        calls.push(`${body.action?.kind}:${body.action?.slot}:${body.action?.value ?? ''}`);
        return HttpResponse.json(turn({ reply: '¿Has trabajado o ayudado en algún lugar?', pendingSlot: 'experiences' }));
      }),
    );
    render(<ChatScreen />);
    expect(await screen.findByRole('button', { name: 'Sí, lo subo 📎' })).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText('Archivo de CV'), new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('progressbar', { name: 'Archivo listo para enviar' })).toBeInTheDocument();
    expect(calls).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText(/Encontré 1 habilidad y 1 experiencia/)).toBeInTheDocument();
    await waitFor(() => expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/^pdf:cv\.pdf:/), 'chip:cv_source:uploaded'])));
    expect(calls.some((call) => call.startsWith('chip:cv_source:Sí'))).toBe(false);
  });

  it('sends the typed comment together with the preloaded file', async () => {
    const intake: Array<{ text?: string; fileName?: string }> = [];
    server.use(
      http.post('/api/intake', async ({ request }) => {
        intake.push(await request.json() as { text?: string; fileName?: string });
        return HttpResponse.json({ profile: { skills: [], experiences: [] } });
      }),
      http.post('/api/chat', () => HttpResponse.json(turn({ reply: 'Recibí tu CV.', pendingSlot: 'experiences' }))),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.upload(screen.getByLabelText('Archivo de CV'), new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('progressbar', { name: 'Archivo listo para enviar' })).toBeInTheDocument();
    expect(intake).toEqual([]);
    await userEvent.type(input, 'Este CV es de ventas');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(intake).toEqual([expect.objectContaining({ fileName: 'cv.pdf', text: 'Este CV es de ventas' })]));
    expect(screen.getByText('Este CV es de ventas')).toBeInTheDocument();
  });

  it('rejects a CV that is too large or the wrong type', async () => {
    const intake = vi.fn();
    server.use(http.post('/api/intake', () => { intake(); return HttpResponse.json({}); }));
    render(<ChatScreen />);
    const input = await screen.findByLabelText('Archivo de CV') as HTMLInputElement;
    const select = (file: File) => {
      Object.defineProperty(input, 'files', { configurable: true, value: { 0: file, length: 1, item: () => file } });
      fireEvent.change(input);
    };
    select(new File(['not a cv'], 'notas.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Solo puedo leer PDF o fotos.')).toBeInTheDocument();
    const tooBig = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
    Object.defineProperty(tooBig, 'size', { value: 10 * 1024 * 1024 + 1 });
    select(tooBig);
    expect(await screen.findByText('Ese archivo pesa más de 10 MB. Prueba con otro.')).toBeInTheDocument();
    expect(intake).not.toHaveBeenCalled();
  });

  it('persists the exploration result before navigating to Vacantes', async () => {
    server.use(
      http.post('/api/chat', () => HttpResponse.json(turn({ phase: 'done', pendingSlot: null, chips: [], reply: 'Listo.' }))),
      http.post('/api/intake', () => HttpResponse.json({ profile: { skills: [], experiences: [] } })),
      http.post('/api/explore', () => HttpResponse.json({ candidateId: 'candidate-test', preferences: { target_roles: ['Ventas'] }, matches: [] })),
    );
    render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    await userEvent.type(input, 'hola');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/vacantes'));
    expect(window.localStorage.getItem('workbridge:exploration:candidate-test')).toContain('candidate-test');
  });

  it('shows a back link and Perfil/Preferencias/Resultados steps driven by slot state', async () => {
    const slotState = initialSlotState();
    for (const slot of SLOTS.filter((item) => item.phase === 'profile')) slotState[slot.id] = { state: 'filled', value: 'known' };
    server.use(http.get('/api/chat', () => HttpResponse.json({ transcript: [{ role: 'assistant', content: '¿En qué zona?' }], slotState, pendingSlot: 'zone', phase: 'preferences' })));
    render(<ChatScreen />);
    await screen.findByText('¿En qué zona?');
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    const steps = screen.getAllByRole('listitem').filter((item) => item.classList.contains('chat-step'));
    expect(steps.map((item) => item.textContent)).toEqual(['Perfil (completado)', 'Preferencias', 'Resultados']);
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
    expect(steps[2]).toHaveClass('is-upcoming');
  });

  it('greets by name in the result message and keeps a removable attachment chip after a failed upload', async () => {
    const slotState = initialSlotState();
    slotState.greeting = { state: 'filled', value: 'Ana' };
    server.use(
      http.get('/api/chat', () => HttpResponse.json({ transcript: [{ role: 'assistant', content: 'Hola' }], slotState })),
      http.post('/api/intake', () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    );
    render(<ChatScreen />);
    await screen.findByText('Hola');
    await userEvent.upload(screen.getByLabelText('Archivo de CV'), new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar archivo adjunto' }));
    expect(screen.queryByRole('button', { name: 'Eliminar archivo adjunto' })).not.toBeInTheDocument();
  });
});
