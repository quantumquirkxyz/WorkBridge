import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { needsAccount } from '../../lib/account-access';
import { getServerSession } from '../../lib/auth';
import { postAuthDestination, sanitizeNext } from '../../lib/auth-navigation';
import { RegisterForm } from './RegisterForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Crear cuenta' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = sanitizeNext(params.next, '/');
  const session = await getServerSession();
  if (session && !needsAccount(session.user)) redirect(postAuthDestination(session.user.role, next));
  return <RegisterForm next={next} />;
}
