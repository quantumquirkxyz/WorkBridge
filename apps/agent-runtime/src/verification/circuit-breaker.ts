export interface CircuitBreaker {
  isOpen(provider: string): boolean;
  recordSuccess(provider: string): void;
  recordFailure(provider: string): void;
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
