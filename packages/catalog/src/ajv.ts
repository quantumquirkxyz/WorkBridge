import { createAjv } from '@puente/domain';
import type { ValidateFunction } from 'ajv';
import cachedVacancySchema from './schemas/cached-vacancy.schema.json';
import explorationResultSchema from './schemas/exploration-result.schema.json';
import type { CachedVacancy, ExplorationResult } from './types';

/** Canonical `$id` for every catalogue contract, JSON Schema 2020-12. */
export const CATALOG_SCHEMA_IDS = {
  cachedVacancy: 'https://puente-laboral.pa/schemas/cached-vacancy/1.0.0',
  explorationResult: 'https://puente-laboral.pa/schemas/exploration-result/1.0.0',
} as const;

let cachedAjv: ReturnType<typeof createAjv> | undefined;

/**
 * The catalogue shares the domain Ajv instance so its contracts can `$ref` the
 * common definitions and the CandidatePreferences contract without a second
 * schema registry drifting out of sync.
 */
function catalogAjv() {
  if (!cachedAjv) {
    const ajv = createAjv();
    ajv.addSchema(cachedVacancySchema);
    ajv.addSchema(explorationResultSchema);
    cachedAjv = ajv;
  }
  return cachedAjv;
}

function validator(id: string): ValidateFunction {
  const compiled = catalogAjv().getSchema(id);
  if (!compiled) throw new Error(`Schema not registered: ${id}`);
  return compiled;
}

export class CatalogContractError extends Error {
  readonly contract: string;
  readonly errors: string[];

  constructor(contract: string, errors: string[]) {
    super(`Invalid ${contract}: ${errors.join('; ')}`);
    this.name = 'CatalogContractError';
    this.contract = contract;
    this.errors = errors;
  }
}

function format(errors: ValidateFunction['errors']): string[] {
  return (errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`);
}

export function validateCachedVacancy(data: unknown): boolean {
  return validator(CATALOG_SCHEMA_IDS.cachedVacancy)(data) as boolean;
}

export function assertCachedVacancy(data: unknown): asserts data is CachedVacancy {
  const validate = validator(CATALOG_SCHEMA_IDS.cachedVacancy);
  if (!validate(data)) throw new CatalogContractError('CachedVacancy', format(validate.errors));
}

export function validateExplorationResult(data: unknown): boolean {
  return validator(CATALOG_SCHEMA_IDS.explorationResult)(data) as boolean;
}

export function assertExplorationResult(data: unknown): asserts data is ExplorationResult {
  const validate = validator(CATALOG_SCHEMA_IDS.explorationResult);
  if (!validate(data)) throw new CatalogContractError('ExplorationResult', format(validate.errors));
}
