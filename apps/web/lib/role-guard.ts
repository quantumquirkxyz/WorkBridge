import type { AppSession, AuthRole } from './auth-types';
import { isAuthRole } from './auth-types';
import { noAccessHref, sanitizeNext } from './auth-navigation';

export const ROLE_HOME: Record<AuthRole, string> = {
  candidate: '/vacantes',
  counselor: '/orientador',
  employer: '/empresa',
};

export type RoleGuardDecision =
  | { action: 'allow' }
  | { action: 'redirect'; location: string };

export interface RoleGuardInput {
  session: Pick<AppSession, 'user'> | null;
  requiredRole: AuthRole;
  currentPath: string;
  allowAnonymous?: boolean;
}

export function signInRedirect(currentPath: string): string {
  const next = sanitizeNext(currentPath, '/');
  return `/ingresar?next=${encodeURIComponent(next)}`;
}

export function decideRoleGuard({
  session,
  requiredRole,
  currentPath,
  allowAnonymous = false,
}: RoleGuardInput): RoleGuardDecision {
  if (!session) {
    return allowAnonymous ? { action: 'allow' } : { action: 'redirect', location: signInRedirect(currentPath) };
  }

  const role = session.user.role;
  if (!isAuthRole(role)) return { action: 'redirect', location: '/' };
  if (session.user.isAnonymous === true && !allowAnonymous) {
    return { action: 'redirect', location: signInRedirect(currentPath) };
  }
  if (role !== requiredRole) return { action: 'redirect', location: noAccessHref(requiredRole) };
  return { action: 'allow' };
}
