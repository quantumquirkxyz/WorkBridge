import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
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
      coverLetter: [],
      application: [],
    },
    evidence: [{ id: 'e1', kind: 'certification', text: 'Curso Excel', credentialStatus: 'unverified' }],
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

const REASON = 'Credencial revisada con la persona';

describe('counselor queue controls', () => {
  const two = () =>
    HttpResponse.json({
      drafts: [
        draft({ draftId: 'old', vacancyTitle: 'Viejo', counselorGate: [{ code: 'critical_gap', detail: 'Falta licencia' }] }),
        draft({ draftId: 'new', vacancyTitle: 'Nuevo', counselorGate: [{ code: 'bias_alert', detail: 'y' }] }),
      ],
    });

  it('filters by gate type and shows counts', async () => {
    server.use(http.get('/api/applications/drafts', two));
    const user = userEvent.setup();
    wrap(<CounselorQueue />);
    await screen.findByRole('list', { name: 'Pendientes de revisión' });
    await user.click(screen.getByRole('button', { name: /Alerta de sesgo/ }));
    const rows = screen.getByRole('list', { name: 'Pendientes de revisión' }).querySelectorAll('a');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Nuevo');
    expect(screen.getByRole('button', { name: /Todas/ })).toHaveTextContent('2');
  });

  it('sorts by waiting time', async () => {
    server.use(http.get('/api/applications/drafts', two));
    const user = userEvent.setup();
    wrap(<CounselorQueue />);
    await screen.findByRole('list', { name: 'Pendientes de revisión' });
    await user.selectOptions(screen.getByLabelText('Ordenar'), 'oldest');
    expect(screen.getAllByRole('link')[0]).toHaveTextContent('Viejo');
  });

  it('offers retry when the queue fails to load', async () => {
    server.use(http.get('/api/applications/drafts', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));
    wrap(<CounselorQueue />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las postulaciones');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('points to sign-in when the session is gone', async () => {
    server.use(http.get('/api/applications/drafts', () => HttpResponse.json({ error: 'unauthenticated' }, { status: 401 })));
    wrap(<CounselorQueue />);
    expect(await screen.findByRole('link', { name: 'Ir a ingresar' })).toHaveAttribute('href', '/ingresar?next=%2Forientador');
  });
});

describe('counselor review actions', () => {
  it('sends a double-clicked approval once and shows the Aprobada state', async () => {
    let posts = 0;
    server.use(
      http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft())),
      http.post('/api/applications/drafts/d1/approvals', async () => {
        posts += 1;
        return HttpResponse.json(draft({ counselorApproved: true }));
      }),
    );
    const user = userEvent.setup();
    wrap(<CounselorReview draftId="d1" />);
    await screen.findByRole('heading', { name: /Ana P\./ });
    await user.type(screen.getByLabelText(/Motivo de tu decisión/), REASON);
    await user.dblClick(screen.getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByText('Aprobaste esta postulación.')).toBeInTheDocument();
    expect(screen.getByText('Aprobada')).toBeInTheDocument();
    expect(posts).toBe(1);
  });

  it('keeps the form and the reason when saving fails', async () => {
    server.use(
      http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft())),
      http.post('/api/applications/drafts/d1/approvals', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    );
    const user = userEvent.setup();
    wrap(<CounselorReview draftId="d1" />);
    await screen.findByRole('heading', { name: /Ana P\./ });
    await user.type(screen.getByLabelText(/Motivo de tu decisión/), REASON);
    await user.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu decisión');
    expect(screen.getByLabelText(/Motivo de tu decisión/)).toHaveValue(REASON);
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeEnabled();
  });

  it('explains forbidden access', async () => {
    server.use(http.get('/api/applications/drafts/d1', () => HttpResponse.json({ error: 'forbidden' }, { status: 403 })));
    wrap(<CounselorReview draftId="d1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene permiso');
  });

  it('labels gate reasons per the gate table', async () => {
    server.use(
      http.get('/api/applications/drafts/d1', () =>
        HttpResponse.json(draft({ counselorGate: [{ code: 'infeasible_transport', detail: 'Dos buses' }] })),
      ),
    );
    wrap(<CounselorReview draftId="d1" />);
    expect(await screen.findByText('Dos buses')).toBeInTheDocument();
    expect(screen.getAllByText('Transporte inviable').length).toBeGreaterThan(0);
  });
});
