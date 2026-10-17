import type { Metadata } from 'next';
import { ApplicationDetail } from '../../../components/applications/ApplicationDetail';
import { requireAccount } from '../../../lib/session-guard';

export const metadata: Metadata = { title: 'Postulación · WorkBridge' };

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAccount(`/postulaciones/${encodeURIComponent(id)}`, 'candidate');
  return <ApplicationDetail draftId={id} />;
}
