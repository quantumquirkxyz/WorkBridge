import { describe, expect, it } from 'vitest';
import type { ExplorationResult } from '@workbridge/catalog';
import { resolveVacancyTitle } from '../lib/vacancy-title';

const exploration = (jobId: string, title: string) => ({ matches: [{ vacancy: { jobId, title } }] }) as ExplorationResult;

describe('resolveVacancyTitle', () => {
  it('prefers the catalog, then the stored exploration, then the session', () => {
    const stored = exploration('job-1', 'Desde el navegador');
    const session = exploration('job-1', 'Desde la sesión');
    expect(resolveVacancyTitle('job-1', { catalogTitle: 'Agente de Servicio al Cliente', storedExploration: stored, sessionExploration: session })).toBe('Agente de Servicio al Cliente');
    expect(resolveVacancyTitle('job-1', { catalogTitle: '  ', storedExploration: stored, sessionExploration: session })).toBe('Desde el navegador');
    expect(resolveVacancyTitle('job-1', { storedExploration: null, sessionExploration: session })).toBe('Desde la sesión');
  });

  it('returns null when none of the sources know the vacancy', () => {
    expect(resolveVacancyTitle('missing', { catalogTitle: null, storedExploration: exploration('other', 'Otra'), sessionExploration: null })).toBeNull();
    expect(resolveVacancyTitle('job-1', {})).toBeNull();
  });
});
