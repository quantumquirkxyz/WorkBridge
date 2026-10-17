import { describe, expect, it } from 'vitest';
import { decideRoleGuard, signInRedirect } from '../lib/role-guard';
import type { AppSession } from '../lib/auth-types';

function session(role: AppSession['user']['role']): Pick<AppSession, 'user'> {
  return {
    user: {
      id: `user_${role}`,
      email: `${role}@example.test`,
      role,
    },
  };
}

describe('role guards', () => {
  it('redirects signed-out protected routes to ingresar with next', () => {
    expect(decideRoleGuard({ session: null, requiredRole: 'counselor', currentPath: '/orientador' })).toEqual({
      action: 'redirect',
      location: '/ingresar?next=%2Forientador',
    });
  });

  it('allows anonymous visitors on the candidate home', () => {
    expect(
      decideRoleGuard({
        session: null,
        requiredRole: 'candidate',
        currentPath: '/',
        allowAnonymous: true,
      }),
    ).toEqual({ action: 'allow' });
  });

  it('allows the matching signed-in role', () => {
    expect(
      decideRoleGuard({ session: session('employer'), requiredRole: 'employer', currentPath: '/empresa' }),
    ).toEqual({ action: 'allow' });
  });

  it('redirects a candidate away from the counselor route to the candidate home', () => {
    expect(
      decideRoleGuard({ session: session('candidate'), requiredRole: 'counselor', currentPath: '/orientador' }),
    ).toEqual({ action: 'redirect', location: '/' });
  });

  it('redirects a wrong signed-in role to its own home', () => {
    expect(
      decideRoleGuard({ session: session('counselor'), requiredRole: 'employer', currentPath: '/empresa' }),
    ).toEqual({ action: 'redirect', location: '/orientador' });
  });

  it('encodes the next path for sign-in redirects', () => {
    expect(signInRedirect('/empresa?tab=vacantes')).toBe('/ingresar?next=%2Fempresa%3Ftab%3Dvacantes');
  });
});
