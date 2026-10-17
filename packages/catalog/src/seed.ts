import { createVacancyCatalog, type VacancyCatalog } from './catalog';
import type { CachedVacancy } from './types';
import records from '../fixtures/vacancy-catalog.json';

/**
 * The bundled cached catalogue used until the Apify LinkedIn Jobs refresh is
 * wired in. It is the same fixture the package tests exercise, so the demo and
 * the contract tests never drift.
 */
export function seedVacancies(): CachedVacancy[] {
  return records as CachedVacancy[];
}

export function createSeedCatalog(): VacancyCatalog {
  return createVacancyCatalog(seedVacancies());
}
