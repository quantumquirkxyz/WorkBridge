import { loadCatalog } from './catalog';
import type { TrainingCatalog } from './types';
import snapshot from '../fixtures/catalog/panama-training-catalog.json';

/**
 * The bundled cached training catalogue used until the out-of-band refresh is
 * wired in. Mirrors `@puente/catalog`'s seed: the fixture the package tests
 * exercise is the same one the demo serves, so the demo and the contract tests
 * never drift. Validated with `loadCatalog` so a corrupted snapshot fails loudly.
 */
export function createSeedTrainingCatalog(): TrainingCatalog {
  return loadCatalog(snapshot);
}
