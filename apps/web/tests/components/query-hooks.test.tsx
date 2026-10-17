import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useExploreVacancies } from '@/lib/queries/exploration';
import { useDbHealth } from '@/lib/queries/health';
import { usePostIntake } from '@/lib/queries/intake';
import { useDeleteCandidateData, useSavePreferences } from '@/lib/queries/preferences';
import { useRequestRoadmap } from '@/lib/queries/roadmap';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('TanStack Query hooks', () => {
  it('exposes mutation and query functions for the typed client', () => {
    expect(renderHook(() => useExploreVacancies(), { wrapper }).result.current.mutate).toBeTypeOf('function');
    expect(renderHook(() => usePostIntake(), { wrapper }).result.current.mutate).toBeTypeOf('function');
    expect(renderHook(() => useSavePreferences(), { wrapper }).result.current.mutate).toBeTypeOf('function');
    expect(renderHook(() => useDeleteCandidateData(), { wrapper }).result.current.mutate).toBeTypeOf('function');
    expect(renderHook(() => useRequestRoadmap(), { wrapper }).result.current.mutate).toBeTypeOf('function');
    expect(renderHook(() => useDbHealth(false), { wrapper }).result.current.isPending).toBe(true);
  });
});
