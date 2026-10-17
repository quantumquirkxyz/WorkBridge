import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NewApplication } from '../../../components/applications/NewApplication';
import { requireAccount } from '../../../lib/session-guard';

export const metadata: Metadata = { title: 'Preparar postulación · WorkBridge' };

export default async function NewApplicationPage({ searchParams }: { searchParams: Promise<{ vacancy?: string | string[] }> }) {
  const { vacancy } = await searchParams;
  const id = Array.isArray(vacancy) ? vacancy[0] : vacancy;
  await requireAccount(id ? `/postulaciones/nueva?vacancy=${encodeURIComponent(id)}` : '/postulaciones/nueva', 'candidate');
  return (
    <Suspense fallback={null}>
      <NewApplication />
    </Suspense>
  );
}
