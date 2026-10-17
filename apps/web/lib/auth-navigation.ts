import type { AuthRole } from './auth-types';

/** Where a signed-in user lands when no (valid) ?next= is present. Candidates resolve /chat vs /vacantes server-side. */
export const POST_AUTH_ENTRY = '/cuenta/inicio';

const AUTH_PAGES = ['/ingresar', '/registrarse', '/cuenta/inicio'];
const MAX_NEXT_LENGTH = 512;

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function isAuthPage(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  return AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

/**
 * Validates a `?next=` value. Only same-origin relative paths are accepted
 * (no scheme, no protocol-relative `//host`, no backslash tricks, no control chars).
 * Anything else, and auth pages themselves (loop risk), falls back.
 */
export function sanitizeNext(value: string | string[] | undefined | null, fallback = '/'): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_NEXT_LENGTH) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || hasControlChars(raw)) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (decoded.startsWith('//') || decoded.includes('\\') || hasControlChars(decoded)) return fallback;
  if (isAuthPage(raw)) return fallback;
  return raw;
}

export function roleHomePath(role: string | undefined | null): string {
  if (role === 'employer') return '/empresa';
  if (role === 'counselor') return '/orientador';
  return '/vacantes';
}

export function roleLabel(role: string | undefined | null): string {
  if (role === 'employer') return 'Empresa';
  if (role === 'counselor') return 'Orientador/a';
  return 'Estudiante';
}

function allowedForRole(role: AuthRole | string | undefined, next: string): boolean {
  if (role === 'employer') return next === '/empresa' || next.startsWith('/empresa/') || next.startsWith('/empresa?');
  if (role === 'counselor') return next === '/orientador' || next.startsWith('/orientador/') || next.startsWith('/orientador?');
  return !(/^\/(empresa|orientador)([/?#]|$)/.test(next));
}

/**
 * Destination after a successful sign-in / account upgrade. Resumes the interrupted action
 * (`next`) when the role may open it; otherwise the role home entry.
 */
export function postAuthDestination(role: string | undefined | null, next: string | string[] | undefined | null): string {
  const safe = sanitizeNext(next, '');
  const r = role ?? 'candidate';
  if (safe && safe !== '/' && allowedForRole(r, safe)) return safe;
  if (r === 'employer') return '/empresa';
  if (r === 'counselor') return '/orientador';
  return POST_AUTH_ENTRY;
}

/** Builds `/ingresar?next=…` (or with a path to resume). */
export function signInHref(next?: string): string {
  const safe = sanitizeNext(next, '');
  return safe && safe !== '/' ? `/ingresar?next=${encodeURIComponent(safe)}` : '/ingresar';
}

export function registerHref(next?: string): string {
  const safe = sanitizeNext(next, '');
  return safe && safe !== '/' ? `/registrarse?next=${encodeURIComponent(safe)}` : '/registrarse';
}

export function noAccessHref(requiredRole?: string): string {
  return requiredRole ? `/cuenta/sin-acceso?rol=${encodeURIComponent(requiredRole)}` : '/cuenta/sin-acceso';
}
