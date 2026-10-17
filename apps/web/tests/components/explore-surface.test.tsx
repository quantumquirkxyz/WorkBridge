import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExplorationResult } from '@workbridge/catalog';
import { server, userEvent } from './setup';

vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { name: 'Ana Pérez' } } }),
  signOut: vi.fn(async () => undefined),
}));

import { VacantesView } from '@/components/VacantesView';
import { ProfileView } from '@/components/ProfileView';
import { SavedSearches } from '@/components/exploration/SavedSearches';
import { NoMatchPanel } from '@/components/exploration/NoMatchPanel';

const CANDIDATE = 'candidate-ana';

function vacancy(jobId: string, title: string) {
  return {
    schemaVersion: '1.0.0', jobId, jobUrl: `https://example.test/${jobId}`, title, company: 'Super 99',
    location: { country: 'PA', province: 'Panamá', district: 'Bethania', raw: 'Panamá, Bethania' },
    modality: 'onsite', contractType: 'full_time', salary: { minUsd: 600, maxUsd: 700 },
    schedule: { days: [1], startMinute: 480, endMinute: 1020, weeklyHours: 40 },
    skills: [{ skillId: null, labelEs: 'Atención al cliente', labelEn: null, required: true }],
    postedAt: '2026-10-16T00:00:00Z', queriedAt: '2026-10-16T00:00:00Z',
    provenance: { provider: 'Computrabajo', source: 'seed', sourceUrl: `https://example.test/${jobId}`, retrievedAt: '2026-10-16T00:00:00Z' },
    scrapingInfo: { provider: 'x', query: 'x', scrapedAt: '2026-10-16T00:00:00Z' },
  };
}

function exploration(overrides: Partial<ExplorationResult> = {}): ExplorationResult {
  const match = (jobId: string, title: string) => ({
    vacancy: vacancy(jobId, title),
    freshness: { ageHours: 24, maxAgeHours: 72, stale: false, label: 'Publicada hace 1 día' },
    provenance: vacancy(jobId, title).provenance,
    matchScore: 80,
    matchReasons: [],
  });
  return {
    schemaVersion: '1.0.0', candidateId: CANDIDATE, generatedAt: new Date().toISOString(),
    preferences: { candidate_id: CANDIDATE, willing_to_train: true, target_roles: ['Atención al cliente'] },
    matches: [match('job-1', 'Cajero/a'), match('job-2', 'Soporte técnico')],
    excluded: [{ jobId: 'job-9', reason: 'schedule', detail: '', failedConstraints: [], freshness: {} }],
    summary: { considered: 24, matched: 2, excluded: 1, stale: 0 },
    ...overrides,
  } as unknown as ExplorationResult;
}

const decisions = [
  { vacancyId: 'job-1', score: 80, hardConstraints: [{ id: 'schedule', satisfied: true, reason: 'Horario compatible' }, { id: 'mandatory_skills', satisfied: false, reason: 'Excel básico' }], scoreBreakdown: [] },
  { vacancyId: 'job-2', score: 40, hardConstraints: [], scoreBreakdown: [] },
];

function serveCandidate(result: ExplorationResult | null) {
  server.use(
    http.get('/api/candidate', () => HttpResponse.json({ candidateId: CANDIDATE })),
    http.post('/api/match', () => HttpResponse.json({ decisions, preferencesVersion: 'v1' })),
    http.get('/api/searches', () => HttpResponse.json({ searches: [] })),
    http.put('/api/searches', () => new HttpResponse(null, { status: 204 })),
  );
  if (result) window.localStorage.setItem(`workbridge:exploration:${CANDIDATE}`, JSON.stringify(result));
}

// Radix Checkbox (inside the preferences form) measures itself with ResizeObserver, which jsdom lacks.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const memory = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    get length() { return memory.size; },
    key: (index: number) => [...memory.keys()][index] ?? null,
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
  },
});

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/vacantes');
});
afterEach(() => window.localStorage.clear());

describe('Vacantes (J2)', () => {
  it('greets, counts, shows readiness and what is missing, and hides internal ids', async () => {
    serveCandidate(exploration());
    render(<VacantesView />);

    expect(await screen.findByRole('heading', { level: 1, name: '2 vacantes para ti' })).toBeInTheDocument();
    expect(screen.getByText('Hola, Ana')).toBeInTheDocument();
    expect(screen.getByText(/Revisamos 24 · actualizado/)).toBeInTheDocument();
    const cajero = await screen.findByRole('button', { name: 'Ver detalles de Cajero/a' });
    await waitFor(() => expect(within(cajero).getByRole('progressbar', { name: 'Preparación' })).toHaveAttribute('aria-valuenow', '80'));
    expect(within(cajero).getByText('Excel básico')).toBeInTheDocument();
    expect(screen.getByText('1 vacante no encaja, sobre todo por: horario (1).')).toBeInTheDocument();
    expect(screen.queryByText('job-9')).not.toBeInTheDocument();
  });

  it('opens the detail sheet with ?v=, offers the application CTA and closes removing the param', async () => {
    serveCandidate(exploration());
    const user = userEvent.setup();
    render(<VacantesView />);

    const card = await screen.findByRole('button', { name: 'Ver detalles de Cajero/a' });
    await user.click(card);

    const dialog = await screen.findByRole('dialog');
    expect(window.location.search).toBe('?v=job-1');
    expect(await within(dialog).findByText('Lo que ya tienes')).toBeInTheDocument();
    expect(within(dialog).getByText('Lo que te falta')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Preparar mi postulación' })).toHaveAttribute('href', '/postulaciones/nueva?vacancy=job-1');
    expect(within(dialog).getByRole('link', { name: /Ver vacante original/ })).toHaveAttribute('href', 'https://example.test/job-1');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(window.location.search).toBe(''));
    await waitFor(() => expect(card).toHaveFocus());
  });

  it('drops an unknown ?v= with a notice', async () => {
    serveCandidate(exploration());
    window.history.replaceState({}, '', '/vacantes?v=gone');
    render(<VacantesView />);
    expect(await screen.findByText('Esa vacante ya no está disponible')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('shows an inline error with retry when nothing can be loaded', async () => {
    server.use(http.get('/api/candidate', () => HttpResponse.json({ error: 'x' }, { status: 500 })));
    render(<VacantesView />);
    expect(await screen.findByText('No pudimos cargar tus vacantes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('sends signed-out visitors to the chat', async () => {
    server.use(http.get('/api/candidate', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })));
    render(<VacantesView />);
    expect(await screen.findByRole('link', { name: 'Empezar' })).toHaveAttribute('href', '/chat');
  });
});

describe('No viable vacancy (J3)', () => {
  const noMatch = exploration({
    matches: [],
    summary: { considered: 10, matched: 0, excluded: 10, stale: 0 },
    noMatch: { explanation: 'Ninguna vacante cumple.', causes: [{ reason: 'schedule', count: 6, detail: 'El horario no coincide.' }], nearMatches: [], roadmapRequested: true },
  });

  it('explains the blockers and links to the training route', () => {
    render(<NoMatchPanel result={noMatch} />);
    expect(screen.getByText('Ninguna vacante cumple.')).toBeInTheDocument();
    expect(screen.getByText(/Lo que más te bloqueó/)).toBeInTheDocument();
    expect(screen.getByText(/6 vacantes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi ruta →' })).toHaveAttribute('href', '/ruta');
    expect(screen.getByRole('link', { name: 'Ajustar mis preferencias' })).toHaveAttribute('href', '/perfil');
  });

  it('offers to enable training when it was declined', async () => {
    const onEnable = vi.fn();
    const declined = { ...noMatch, preferences: { ...noMatch.preferences, willing_to_train: false } } as ExplorationResult;
    render(<NoMatchPanel result={declined} onEnableTraining={onEnable} />);
    await userEvent.click(screen.getByRole('button', { name: 'Me interesa tomar cursos' }));
    expect(onEnable).toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Ver mi ruta →' })).not.toBeInTheDocument();
  });
});

describe('Mi perfil (J4/J5)', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
  }

  it('shows saved searches with "N nuevas"', () => {
    render(<SavedSearches searches={[{ search: { searchId: 's1', label: 'Atención en Panamá' }, matches: [{}, {}], newSinceSaved: [{}, {}] } as never]} />);
    expect(screen.getByText('Atención en Panamá')).toBeInTheDocument();
    expect(screen.getByText('2 nuevas')).toBeInTheDocument();
  });

  it('confirms before deleting and keeps the dialog open when deletion fails', async () => {
    server.use(
      http.get('/api/intake', () => HttpResponse.json({ error: 'not_found' }, { status: 404 })),
      http.get('/api/preferences', () => HttpResponse.json({ error: 'not_found' }, { status: 404 })),
      http.get('/api/searches', () => HttpResponse.json({ searches: [] })),
      http.delete('/api/candidate', () => HttpResponse.json({ error: 'persistence_unavailable' }, { status: 503 })),
    );
    const user = userEvent.setup();
    render(<ProfileView candidateId="user-1" />, { wrapper });

    await user.click(await screen.findByRole('button', { name: 'Eliminar mis datos' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('¿Eliminar todos tus datos?')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Sí, eliminar' }));
    expect(await within(dialog).findByText('No pudimos eliminar tus datos. Intenta de nuevo.')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
