import type { ProviderName } from "./status";

export interface CircuitBreaker {
  isOpen(provider: ProviderName): boolean;
  recordSuccess(provider: ProviderName): void;
  recordFailure(provider: ProviderName): void;
}

export function createCircuitBreaker(threshold = 3): CircuitBreaker {
  const failures = new Map<string, number>();
  return {
    isOpen(provider) {
      return (failures.get(provider) ?? 0) >= threshold;
    },
    recordSuccess(provider) {
      failures.set(provider, 0);
    },
    recordFailure(provider) {
      failures.set(provider, (failures.get(provider) ?? 0) + 1);
    },
  };
}
