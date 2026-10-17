export const AUTH_ROLES = ['candidate', 'employer', 'counselor'] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export interface AppSessionUser {
  id: string;
  email: string;
  role: AuthRole;
  employerOrgId?: string | null;
  isAnonymous?: boolean | null;
}

export interface AppSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
  user: AppSessionUser;
}

export function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && AUTH_ROLES.includes(value as AuthRole);
}
