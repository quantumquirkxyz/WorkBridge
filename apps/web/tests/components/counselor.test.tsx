import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { CounselorQueue } from '@/components/counselor/CounselorQueue';
import { CounselorReview } from '@/components/counselor/CounselorReview';
import type { CounselorDraft } from '@/lib/api/applications';
import { server, userEvent } from './setup';



function draft(overrides: Partial<CounselorDraft> = {}): CounselorDraft {
  return {
    draftId: 'd1',
    traceId: 'trace-1',
    candidateId: 'c1',
    candidateDisplayName: 'Ana P.',
    vacancyTitle: 'Cajero/a',
    status: 'open',
    documents: {
      cv: [{ source: 'evidence', evidenceIds: ['e1'], text: 'Curso Excel' }],
      coverLetter: [{ source: 'vacancy', evidenceIds: [], text: 'Postulación a Cajero/a.' }],
      application: [],
    },
    evidence: [
      { id: 'e1', kind: 'certification', text: 'Curso Excel', credentialStatus: 'unverified' },
      { id: 'e2', kind: 'experience', text: 'Tienda familiar', credentialStatus: 'not_applicable' },
    ],
    counselorGate: [{ code: 'unverified_credential', detail: 'x' }],
    counselorApproved: false,
    history: [{ action: 'approval', actorRole: 'candidate', timestamp: '2026-10-16T18:00:00.000Z', reason: 'Listo' }],
    ...overrides,
  };
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe('counselor queue', () => {
  it('lists newest first with gate labels', async () => {
    server.use(
      http.get('/api/applications/drafts', () =>
        HttpResponse.json({ drafts: [draft({ draftId: 'old', vacancyTitle: 'Viejo' }), draft({ draftId: 'new', vacancyTitle: 'Nuevo', counselorGate: [{ code: 'bias_alert', detail: 'y' }] })] }),
      ),
    );
    const { container } = wrap(<CounselorQueue />);
    const items = await screen.findAllByRole('link');
    expect(items[0]).toHaveTextContent('Nuevo');
    expect(items[0]).toHaveTextContent('Alerta de sesgo');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('requests the pending counselor gate queue', async () => {
    let requested = '';
    server.use(
      http.get('/api/applications/drafts', ({ request }) => {
        requested = request.url;
        return HttpResponse.json({ drafts: [] });
      }),
    );
    wrap(<CounselorQueue />);
    await screen.findByText('No hay postulaciones esperando tu revisión 🎉');
    expect(new URL(requested).searchParams.get('gate')).toBe('counselor');
    expect(new URL(requested).searchParams.get('pending')).toBe('true');
  });

  it('shows the empty state', async () => {
    server.use(http.get('/api/applications/drafts', () => HttpResponse.json({ drafts: [] })));
    wrap(<CounselorQueue />);
    expect(await screen.findByText('No hay postulaciones esperando tu revisión 🎉')).toBeInTheDocument();
  });
});

describe('counselor review', () => {
  it('shows evidence badges, history without trace ids, and requires a 10-char reason', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft())),
      http.post('/api/applications/drafts/d1/rejections', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(draft({ status: 'rejected' }));
      }),
    );
    const user = userEvent.setup();
    const { container } = wrap(<CounselorReview draftId="d1" />);
    await screen.findByRole('heading', { name: /Ana P\./ });
    await user.click(screen.getByRole('tab', { name: 'Evidencia' }));
    expect(screen.getByText('Sin verificar')).toBeInTheDocument();
    expect(screen.getByText('Declarada')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('trace-1');
    expect(screen.getByText(/Historial/)).toBeInTheDocument();
    expect(container).toHaveTextContent('“Listo”');

    const reject = screen.getByRole('button', { name: 'Rechazar' });
    expect(reject).toBeDisabled();
    await user.type(screen.getByLabelText(/Motivo de tu decisión/), 'corto');
    expect(reject).toBeDisabled();
    await user.type(screen.getByLabelText(/Motivo de tu decisión/), ' motivo suficiente');
    await user.click(reject);
    await waitFor(() => expect(body?.reason).toBe('corto motivo suficiente'));
    expect(body?.traceId).toBe('trace-1');
    expect(await screen.findByText('Rechazaste esta postulación.')).toBeInTheDocument();
  });
  it('derives the decided message from the draft state', async () => {
    server.use(http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft({ status: 'submitted' }))));
    const submitted = wrap(<CounselorReview draftId="d1" />);
    expect(await screen.findByText('Esta postulación ya fue enviada.')).toBeInTheDocument();
    submitted.unmount();

    server.use(http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft({ counselorApproved: true }))));
    const approved = wrap(<CounselorReview draftId="d1" />);
    expect(await screen.findByText('Aprobaste esta postulación.')).toBeInTheDocument();
    approved.unmount();
  });
});
