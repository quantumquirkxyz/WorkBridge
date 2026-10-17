import type { Metadata } from 'next';
import { ApplicationsList } from '../../components/applications/ApplicationsList';
import { requireAccount } from '../../lib/session-guard';

export const metadata: Metadata = { title: 'Mis postulaciones · WorkBridge' };

export default async function ApplicationsPage() {
  await requireAccount('/postulaciones', 'candidate');
  return <ApplicationsList />;
}
