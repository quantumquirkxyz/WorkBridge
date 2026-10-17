import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationDetail } from '@/components/applications/ApplicationDetail';
import { ApplicationsList } from '@/components/applications/ApplicationsList';
import type { DraftView } from '@/lib/applications-status';
import { server, userEvent } from './setup';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/postulaciones/d1',
  useSearchParams: () => new URLSearchParams(),
}));

function draft(overrides: Partial<DraftView> = {}): DraftView {
  return {
    draftId: 'd1', candidateId: 'c1', vacancyId: 'v1', traceId: 'trace-1', vacancyTitle: 'Cajero/a',
    evidence: [
      { id: 'e1', kind: 'certification', text: 'Curso Excel', credentialStatus: 'unverified' },
      { id: 'e2', kind: 'experience', text: 'Tienda familiar', credentialStatus: 'not_applicable' },
    ],
    status: 'open',
    documents: {
      cv: [{ source: 'evidence', evidenceIds: ['e2'], text: 'Tienda familiar' }],
      coverLetter: [{ source: 'vacancy', evidenceIds: [], text: 'Postulación a Cajero/a.' }],
      application: [],
    },
    counselorGate: [], candidateApproved: false, counselorApproved: false, history: [],
    ...overrides,
  };
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

const memory = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
  },
});

beforeEach(() => { replace.mockClear(); memory.clear(); });

describe('applications list', () => {
  it('shows status stickers, newest first', async () => {
    server.use(
      http.get('/api/candidate', () => HttpResponse.json({ candidateId: 'c1' })),
      http.get('/api/applications/drafts', ({ request }) => {
        expect(new URL(request.url).searchParams.get('candidateId')).toBe('c1');
        return HttpResponse.json({ drafts: [
          draft({ draftId: 'a', vacancyTitle: 'Viejo', history: [{ action: 'approval', actorRole: 'candidate', timestamp: '2026-10-10T10:00:00Z', reason: 'x' }] }),
          draft({ draftId: 'b', vacancyTitle: 'Nuevo', candidateApproved: true, counselorGate: [{ code: 'bias_alert', detail: 'x' }], history: [{ action: 'approval', actorRole: 'candidate', timestamp: '2026-10-16T10:00:00Z', reason: 'x' }] }),
        ] });
      }),
    );
    const { container } = wrap(<ApplicationsList />);
    const links = await screen.findAllByRole('link');
    expect(links[0]).toHaveTextContent('Nuevo');
    expect(links[0]).toHaveTextContent('En revisión del orientador');
    expect(links[1]).toHaveTextContent('Borrador');
    expect(links[0]).toHaveAttribute('href', '/postulaciones/b');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the empty state with a link to vacantes', async () => {
    server.use(
      http.get('/api/candidate', () => HttpResponse.json({ candidateId: 'c1' })),
      http.get('/api/applications/drafts', () => HttpResponse.json({ drafts: [] })),
    );
    wrap(<ApplicationsList />);
    expect(await screen.findByText('Todavía no has preparado ninguna postulación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver vacantes' })).toHaveAttribute('href', '/vacantes');
  });

  it('shows an inline error with retry', async () => {
    let calls = 0;
    server.use(
      http.get('/api/candidate', () => HttpResponse.json({ candidateId: 'c1' })),
      http.get('/api/applications/drafts', () => (++calls === 1 ? HttpResponse.json({ error: 'boom' }, { status: 500 }) : HttpResponse.json({ drafts: [] }))),
    );
    const user = userEvent.setup();
    wrap(<ApplicationsList />);
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Todavía no has preparado ninguna postulación')).toBeInTheDocument();
  });

  it('redirects to sign-in with ?next= on 401', async () => {
    server.use(http.get('/api/candidate', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })));
    wrap(<ApplicationsList />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/ingresar?next=%2Fpostulaciones%2Fd1'));
  });
});

describe('application detail', () => {
  it('approves a draft, then offers a confirmed submit with an idempotency key', async () => {
    let current = draft();
    let submitBody: Record<string, unknown> | undefined;
    let submitHeader: string | null = null;
    server.use(
      http.get('/api/applications/drafts/d1', () => HttpResponse.json(current)),
      http.post('/api/applications/drafts/d1/approvals', () => {
        current = draft({ candidateApproved: true });
        return HttpResponse.json(current);
      }),
      http.post('/api/applications/drafts/d1/submissions', async ({ request }) => {
        submitBody = (await request.json()) as Record<string, unknown>;
        submitHeader = request.headers.get('idempotency-key');
        current = draft({
          status: 'submitted',
          candidateApproved: true,
          interview: 'pending_employer_approval',
          history: [{ action: 'submission', actorRole: 'candidate', timestamp: '2026-10-16T18:00:00Z', reason: 'envío' }],
        });
        return HttpResponse.json({ submissionId: 's1', draftId: 'd1', replayed: false, interview: 'pending_employer_approval' });
      }),
    );
    const user = userEvent.setup();
    const { container } = wrap(<ApplicationDetail draftId="d1" />);
    await screen.findByRole('heading', { name: 'Cajero/a' });
    expect(screen.getByText('Borrador', { selector: '.app-status-badge' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar postulación' })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'Aprobar mi postulación' }));
    const send = await screen.findByRole('button', { name: /Enviar postulación/ });

    await user.click(send);
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/¿Enviar tu postulación a Cajero\/a\?/)).toBeInTheDocument();
    expect(submitBody).toBeUndefined();
    await user.click(within(dialog).getByRole('button', { name: 'Sí, enviar' }));

    await waitFor(() => expect(submitBody).toBeDefined());
    expect(submitHeader).toBeTruthy();
    expect(submitBody?.idempotencyKey).toBe(submitHeader);
    expect(submitBody?.traceId).toBe('trace-1');
    expect(await screen.findByText(/Enviada el/)).toBeInTheDocument();
  });

  it('shows gate reasons and the counselor-pending banner without a send action', async () => {
    server.use(http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft({
      candidateApproved: true,
      counselorGate: [{ code: 'unverified_credential', detail: 'e1' }, { code: 'critical_gap', detail: 'Inglés avanzado' }],
    }))));
    wrap(<ApplicationDetail draftId="d1" />);
    expect(await screen.findByText('Una de tus certificaciones todavía no se pudo verificar.')).toBeInTheDocument();
    expect(screen.getByText('Te falta un requisito importante para este puesto: Inglés avanzado.')).toBeInTheDocument();
    expect(screen.getByText(/Tu orientador\/a está revisando/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar postulación/ })).not.toBeInTheDocument();
  });

  it('sends a correction with the remaining evidence ids and asks to re-approve', async () => {
    let body: Record<string, unknown> | undefined;
    let current = draft({ candidateApproved: true });
    server.use(
      http.get('/api/applications/drafts/d1', () => HttpResponse.json(current)),
      http.post('/api/applications/drafts/d1/corrections', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        current = draft({
          candidateApproved: false,
          evidence: [current.evidence[1]!],
          availableEvidence: current.availableEvidence ?? current.evidence,
        });
        return HttpResponse.json(current);
      }),
    );
    const user = userEvent.setup();
    wrap(<ApplicationDetail draftId="d1" />);
    await screen.findByRole('heading', { name: 'Cajero/a' });
    await user.click(screen.getByRole('tab', { name: 'Evidencia' }));
    await user.click(screen.getByRole('checkbox', { name: /Curso Excel/ }));
    expect(screen.getByText('Al guardar, tendrás que aprobar de nuevo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(body?.includeEvidenceIds).toEqual(['e2']));
    expect(await screen.findByRole('button', { name: 'Aprobar mi postulación' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Curso Excel/ })).not.toBeChecked();
  });

  it('maps a runtime 422 to plain Spanish', async () => {
    server.use(
      http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft())),
      http.post('/api/applications/drafts/d1/approvals', () => HttpResponse.json({ error: 'draft_rejected' }, { status: 422 })),
    );
    const user = userEvent.setup();
    wrap(<ApplicationDetail draftId="d1" />);
    await user.click(await screen.findByRole('button', { name: 'Aprobar mi postulación' }));
    expect(await screen.findByText('Esta postulación fue rechazada y no se puede enviar.')).toBeInTheDocument();
  });

  it('requires a reason to reject', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft())),
      http.post('/api/applications/drafts/d1/rejections', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(draft({ status: 'rejected', history: [{ action: 'rejection', actorRole: 'candidate', timestamp: '2026-10-16T10:00:00Z', reason: 'Ya no me interesa' }] }));
      }),
    );
    const user = userEvent.setup();
    wrap(<ApplicationDetail draftId="d1" />);
    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const confirm = screen.getByRole('button', { name: 'Rechazar postulación' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText('Motivo*'), 'Ya no me interesa');
    await user.click(confirm);
    await waitFor(() => expect(body?.reason).toBe('Ya no me interesa'));
    expect(await screen.findByText(/La rechazaste tú/)).toBeInTheDocument();
  });

  it('links a not-advanced application to /ruta', async () => {
    server.use(http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft({
      status: 'submitted',
      candidateApproved: true,
      interview: 'rejected',
    }))));
    wrap(<ApplicationDetail draftId="d1" />);
    expect(await screen.findByRole('link', { name: /Ver mi ruta/ })).toHaveAttribute('href', '/ruta');
  });

  it('shows an approved interview from the draft, without browser storage', async () => {
    server.use(http.get('/api/applications/drafts/d1', () => HttpResponse.json(draft({
      status: 'submitted',
      candidateApproved: true,
      interview: 'approved',
    }))));
    wrap(<ApplicationDetail draftId="d1" />);
    expect(await screen.findByText('Entrevista aprobada', { selector: '.app-status-badge' })).toBeInTheDocument();
  });

  it('shows an error state with retry when loading fails', async () => {
    server.use(http.get('/api/applications/drafts/d1', () => HttpResponse.json({ error: 'not_found' }, { status: 404 })));
    wrap(<ApplicationDetail draftId="d1" />);
    expect(await screen.findByText('No encontramos esta postulación.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
