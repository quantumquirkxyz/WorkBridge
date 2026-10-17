import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { needsAccount } from '../../lib/account-access';
import { getServerSession } from '../../lib/auth';
import { POST_AUTH_ENTRY, postAuthDestination, sanitizeNext } from '../../lib/auth-navigation';
import { SignInForm } from './SignInForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ingresar' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = sanitizeNext(params.next, '/');
  const session = await getServerSession();
  if (session && !needsAccount(session.user)) {
    redirect(postAuthDestination(session.user.role, next === '/' ? POST_AUTH_ENTRY : next));
  }
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  return <SignInForm next={next} linkError={error === 'enlace'} />;
}
