/**
 * Deterministic string ordering by UTF-16 code unit. `localeCompare` is avoided
 * so results never depend on the process locale or ICU data.
 */
export function compareCodeUnits(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
