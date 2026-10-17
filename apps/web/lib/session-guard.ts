import { redirect } from 'next/navigation';
import { needsAccount } from './account-access';
import { getServerSession } from './auth';
import type { AppSession, AuthRole } from './auth-types';
import { noAccessHref, signInHref } from './auth-navigation';

/**
 * Server-side guard for pages that need a signed-in (non-anonymous) account, e.g. /postulaciones,
 * saving searches, "Preparar mi postulación". Redirects to /ingresar?next=<currentPath> so the
 * interrupted action resumes after sign-in. The server session stays authoritative.
 */
export async function requireAccount(currentPath: string, requiredRole?: AuthRole): Promise<AppSession> {
  const session = await getServerSession();
  if (!session || needsAccount(session.user)) redirect(signInHref(currentPath));
  if (requiredRole && session.user.role !== requiredRole) redirect(noAccessHref(requiredRole));
  return session;
}
