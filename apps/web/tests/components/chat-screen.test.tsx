import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialSlotState } from '@/lib/chat/tracker';
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
    server.use(http.get('/api/chat', () => HttpResponse.json({ transcript: [], slotState: initialSlotState() })));
  });

  it('renders an accessible transcript, quick replies, and keeps focus in the composer', async () => {
    server.use(http.post('/api/chat', () => HttpResponse.json(turn())));
    const { container } = render(<ChatScreen />);
    const input = await screen.findByRole('textbox', { name: 'Escribe tu respuesta' });
    expect(screen.getByRole('log', { name: 'Conversación' })).toHaveAttribute('aria-live', 'polite');
    await userEvent.type(input, 'hola');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('button', { name: 'Prefiero no decirlo' })).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
    expect(container.querySelector('.chat-progress')).toBeInTheDocument();
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
});
