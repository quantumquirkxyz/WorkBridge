import { isAuthRole, type AuthRole } from './auth-types';

export interface LinkedAuthUserFields {
  role?: unknown;
  employerOrgId?: unknown;
}

export interface PreservedLinkedAuthFields {
  role: AuthRole;
  employerOrgId: string | null;
}

export function preservedLinkedAuthFields(linkedUser: LinkedAuthUserFields): PreservedLinkedAuthFields {
  const role = isAuthRole(linkedUser.role) ? linkedUser.role : 'candidate';
  return {
    role,
    employerOrgId: role === 'employer' && typeof linkedUser.employerOrgId === 'string'
      ? linkedUser.employerOrgId
      : null,
  };
}
