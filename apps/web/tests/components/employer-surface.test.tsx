import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { SubmissionDecision } from '@/components/employer/SubmissionDecision';
import { SubmissionQueue } from '@/components/employer/SubmissionQueue';
import { server, userEvent } from './setup';

const detail = {
  submissionId: 'sub-1',
  draftId: 'draft-1',
  replayed: false,
  interview: 'pending_employer_approval',
  employerOrgId: 'org-1',
  traceId: 'trace-1',
  documents: {
    cv: [{ source: 'evidence', evidenceIds: ['e1'], text: 'Atención al cliente (1 año)' }],
    coverLetter: [{ source: 'vacancy', evidenceIds: [], text: 'Postulación a Cajero/a.' }],
    application: [{ source: 'evidence', evidenceIds: ['e1'], text: 'Atención al cliente (1 año)' }],
  },
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('employer queue', () => {
  it('renders pending submissions as cards and links to the detail', async () => {
    server.use(
      http.get('/api/applications/submissions', () =>
        HttpResponse.json({ submissions: [{ submissionId: 'sub-1', draftId: 'draft-1', replayed: false, interview: 'pending_employer_approval', traceId: 'trace-1', vacancyTitle: 'Cajero' }] }),
      ),
    );
    const { container } = render(<SubmissionQueue />, { wrapper });

    const link = await screen.findByRole('link', { name: /Cajero/ });
    expect(link).toHaveAttribute('href', '/empresa/sub-1');
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);
  });

  it('shows the empty state when there are no pending submissions', async () => {
    server.use(http.get('/api/applications/submissions', () => HttpResponse.json({ submissions: [] })));
    render(<SubmissionQueue />, { wrapper });

    expect(await screen.findByText('No hay postulaciones pendientes')).toBeInTheDocument();
  });
});

describe('employer submission decision', () => {
  it('shows documents and approved evidence without protected attributes', async () => {
    server.use(http.get('/api/applications/submissions/sub-1', () => HttpResponse.json(detail)));
    const { container } = render(<SubmissionDecision submissionId="sub-1" />, { wrapper });

    expect(await screen.findByText('Evidencia aprobada por la persona')).toBeInTheDocument();
    expect(screen.getByText('Postulación a Cajero/a.')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/edad|género|genero|dirección|foto|rechazad|deseleccionad/i);
    expect((await axe(container)).violations).toEqual([]);
  });

  it('shows a read-only message instead of the form once decided', async () => {
    server.use(
      http.get('/api/applications/submissions/sub-1', () => HttpResponse.json({ ...detail, interview: 'rejected' })),
    );
    render(<SubmissionDecision submissionId="sub-1" />, { wrapper });

    expect(await screen.findByText('Esta postulación ya fue decidida.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'No avanzar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprobar entrevista' })).not.toBeInTheDocument();
  });

  it('requires a reason before deciding', async () => {
    let posted = false;
    server.use(
      http.get('/api/applications/submissions/sub-1', () => HttpResponse.json(detail)),
      http.post('/api/applications/submissions/sub-1/interview', () => {
        posted = true;
        return HttpResponse.json({});
      }),
    );
    render(<SubmissionDecision submissionId="sub-1" />, { wrapper });
    await screen.findByRole('button', { name: 'No avanzar' });

    await userEvent.click(screen.getByRole('button', { name: 'No avanzar' }));

    expect(await screen.findByText('Escribe un motivo para continuar.')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('records "No avanza" with the reason through the BFF', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get('/api/applications/submissions/sub-1', () => HttpResponse.json(detail)),
      http.post('/api/applications/submissions/sub-1/interview', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ submissionId: 'sub-1', interview: 'rejected' });
      }),
    );
    render(<SubmissionDecision submissionId="sub-1" />, { wrapper });
    await screen.findByRole('button', { name: 'No avanzar' });

    await userEvent.type(screen.getByLabelText(/Motivo de tu decisión/), 'Falta experiencia');
    await userEvent.click(screen.getByRole('button', { name: 'No avanzar' }));

    expect(await screen.findByText('Registramos que la postulación no avanza.')).toBeInTheDocument();
    expect(body).toMatchObject({ decision: 'rejected', reason: 'Falta experiencia', traceId: 'trace-1' });
  });

  it('shows the not-available message for another organization submission', async () => {
    server.use(
      http.get('/api/applications/submissions/sub-1', () =>
        HttpResponse.json({ error: 'forbidden', message: 'This submission belongs to another employer organization.' }, { status: 403 }),
      ),
    );
    render(<SubmissionDecision submissionId="sub-1" />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Esta postulación no está disponible para tu organización.'),
    );
    expect(screen.queryByRole('button', { name: 'Aprobar entrevista' })).not.toBeInTheDocument();
  });
});
