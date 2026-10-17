import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { SubmissionDecision } from '@/components/employer/SubmissionDecision';
import { SubmissionQueue } from '@/components/employer/SubmissionQueue';
import { server, userEvent } from './setup';

const detail = {
  submissionId: 'sub-1',
  draftId: 'draft-1',
  replayed: false,
  interview: 'pending_employer_approval',
  traceId: 'trace-1',
  vacancyTitle: 'Cajero/a',
  documents: {
    cv: [{ source: 'evidence', evidenceIds: ['e1'], text: 'Atención al cliente (1 año)' }],
    coverLetter: [],
    application: [],
  },
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('employer queue controls', () => {
  const rows = [
    { submissionId: 'a', vacancyTitle: 'Cajero', interview: 'pending_employer_approval', traceId: 't' },
    { submissionId: 'b', vacancyTitle: 'Soporte', interview: 'pending_employer_approval', traceId: 't' },
  ];

  it('filters by vacancy text and sorts', async () => {
    server.use(http.get('/api/applications/submissions', () => HttpResponse.json({ submissions: rows })));
    render(<SubmissionQueue />, { wrapper });
    await screen.findByRole('list', { name: 'Postulaciones pendientes' });
    expect(screen.getAllByRole('link')[0]).toHaveTextContent('Soporte');
    await userEvent.selectOptions(screen.getByLabelText('Ordenar'), 'oldest');
    expect(screen.getAllByRole('link')[0]).toHaveTextContent('Cajero');
    await userEvent.type(screen.getByLabelText('Buscar vacante'), 'sop');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('offers retry when the queue fails', async () => {
    server.use(http.get('/api/applications/submissions', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));
    render(<SubmissionQueue />, { wrapper });
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('employer decision flow', () => {
  it('approves the interview once even on double click and shows the new state', async () => {
    let interviewPosts = 0;
    server.use(
      http.get('/api/applications/submissions/sub-1', () => HttpResponse.json(detail)),
      http.post('/api/applications/submissions/sub-1/approvals', () => HttpResponse.json({})),
      http.post('/api/applications/submissions/sub-1/interview', () => {
        interviewPosts += 1;
        return HttpResponse.json({ submissionId: 'sub-1', interview: 'approved' });
      }),
    );
    render(<SubmissionDecision submissionId="sub-1" />, { wrapper });
    await screen.findByRole('button', { name: 'Aprobar entrevista' });
    await userEvent.type(screen.getByLabelText(/Motivo de tu decisión/), 'Cumple el perfil');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Aprobar entrevista' }));

    expect(await screen.findByText('La postulación pasó a entrevista.')).toBeInTheDocument();
    expect(screen.getByText('Entrevista aprobada')).toBeInTheDocument();
    expect(interviewPosts).toBe(1);
  });

  it('shows a retryable error when the decision fails', async () => {
    server.use(
      http.get('/api/applications/submissions/sub-1', () => HttpResponse.json(detail)),
      http.post('/api/applications/submissions/sub-1/interview', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    );
    render(<SubmissionDecision submissionId="sub-1" />, { wrapper });
    await screen.findByRole('button', { name: 'No avanzar' });
    await userEvent.type(screen.getByLabelText(/Motivo de tu decisión/), 'Falta experiencia');
    await userEvent.click(screen.getByRole('button', { name: 'No avanzar' }));
    expect(await screen.findByText('No pudimos guardar tu decisión. Intenta de nuevo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No avanzar' })).toBeEnabled();
  });

  it('shows only employer movements in the history', async () => {
    server.use(
      http.get('/api/applications/submissions/sub-1', () =>
        HttpResponse.json({
          ...detail,
          interview: 'approved',
          history: [
            { action: 'rejection', actorRole: 'counselor', timestamp: '2026-10-16T18:00:00.000Z', reason: 'Nota interna' },
            { action: 'submission', actorRole: 'candidate', timestamp: '2026-10-16T19:00:00.000Z', reason: 'Enviada' },
            { action: 'approval', actorRole: 'employer', timestamp: '2026-10-17T10:00:00.000Z', reason: 'Buen perfil' },
          ],
        }),
      ),
    );
    const { container } = render(<SubmissionDecision submissionId="sub-1" />, { wrapper });
    await screen.findByText('“Buen perfil”');
    expect(container).not.toHaveTextContent('Nota interna');
    expect(screen.getByText('Postulación enviada')).toBeInTheDocument();
  });
});
