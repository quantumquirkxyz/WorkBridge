import { postAuthDestination, roleHomePath, sanitizeNext } from './auth-navigation';

export const ACCOUNT_TYPES = ['student', 'employer'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
}

export interface SessionIdentity {
  role?: string;
  isAnonymous?: boolean | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function needsAccount(user: SessionIdentity | null | undefined): boolean {
  return !user || user.isAnonymous === true;
}

export function parseRegisterBody(body: unknown): { ok: true; value: RegisterInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Revisa los datos e intenta otra vez.' };
  const record = body as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const password = typeof record.password === 'string' ? record.password : '';
  const accountType = record.accountType;
  if (name.length < 2) return { ok: false, error: 'Escribe tu nombre.' };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: 'Escribe un correo válido.' };
  if (password.length < 8) return { ok: false, error: 'La contraseña necesita al menos 8 caracteres.' };
  if (accountType !== 'student' && accountType !== 'employer') {
    return { ok: false, error: 'Elige si la cuenta es de estudiante o empresarial.' };
  }
  return { ok: true, value: { name, email, password, accountType } };
}

export function safeNextPath(value: string | string[] | undefined): string {
  return sanitizeNext(value, '/');
}

export function panelForRole(role: string | undefined): string {
  return roleHomePath(role);
}

export function startPathFor(user: SessionIdentity | null | undefined): string {
  if (needsAccount(user)) return '/cuenta';
  if (user?.role === 'employer') return '/empresa';
  if (user?.role === 'counselor') return '/orientador';
  return '/chat';
}

function isCandidateDestination(next: string): boolean {
  return next !== '/'
    && next !== '/ingresar'
    && next !== '/registrarse'
    && !next.startsWith('/empresa')
    && !next.startsWith('/orientador');
}

export function destinationAfterRegister(accountType: AccountType, next: string): string {
  if (accountType === 'employer') return '/empresa';
  return isCandidateDestination(next) ? next : '/chat';
}

export function destinationAfterSignIn(role: string | undefined, next: string): string {
  return postAuthDestination(role, next);
}

export function signUpErrorMessage(error: unknown): { status: number; message: string } {
  const record = typeof error === 'object' && error ? error as { status?: unknown; statusCode?: unknown; message?: unknown; body?: unknown } : {};
  const status = typeof record.status === 'number'
    ? record.status
    : typeof record.statusCode === 'number'
      ? record.statusCode
      : 400;
  const body = typeof record.body === 'object' && record.body ? record.body as { code?: unknown } : {};
  const code = typeof body.code === 'string' ? body.code : '';
  const message = typeof record.message === 'string' ? record.message : '';
  if (code === 'USER_ALREADY_EXISTS' || /already exists/i.test(message)) {
    return { status: 409, message: 'Ese correo ya tiene una cuenta. Ingresa con él.' };
  }
  if (status >= 500) return { status: 503, message: 'No pudimos crear la cuenta en este momento. Intenta otra vez.' };
  return { status: 400, message: 'No pudimos crear la cuenta. Revisa los datos e intenta otra vez.' };
}
