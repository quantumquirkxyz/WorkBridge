/**
 * Deterministic identifier helpers.
 *
 * Ids must be stable across runs so classification, dedup and tie-breaking are
 * reproducible and testable. We use FNV-1a (32-bit) over a seed string and
 * prefix the result with a short type tag.
 */

export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Build a schema-safe id: letters, digits, `_`, `.`, `:`, `-` only. */
export function makeId(prefix: string, seed: string): string {
  const safePrefix = prefix.replace(/[^A-Za-z0-9_.:-]/g, '');
  return `${safePrefix}_${fnv1a(seed)}`;
}

export function makeTraceId(seed: string): string {
  return makeId('trace', seed);
}

export function makeCandidateId(seed: string): string {
  return makeId('candidate', seed);
}
