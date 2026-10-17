import { describe, expect, it } from 'vitest';
import { destinationAfterSignIn, safeNextPath } from '../lib/account-access';
import { validateRegisterFields } from '../lib/auth-forms';
import { noAccessHref, postAuthDestination, sanitizeNext, signInHref } from '../lib/auth-navigation';

describe('sanitizeNext', () => {
  it('keeps same-origin relative paths with query', () => {
    expect(sanitizeNext('/postulaciones/abc?tab=cv')).toBe('/postulaciones/abc?tab=cv');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%2F/evil.example',
    '/%5Cevil.example',
    'javascript:alert(1)',
    'evil',
    '/ok\r\nSet-Cookie: x=1',
    '/%0d%0a',
    '/ingresar?next=/x',
    '/registrarse',
    '/%E0%A4%A',
  ])('rejects %s', (value) => {
    expect(sanitizeNext(value)).toBe('/');
  });

  it('rejects arrays that start unsafe, overlong and missing values', () => {
    expect(sanitizeNext(['//x', '/ok'])).toBe('/');
    expect(sanitizeNext(`/${'a'.repeat(600)}`)).toBe('/');
    expect(sanitizeNext(undefined, '/vacantes')).toBe('/vacantes');
    expect(safeNextPath('//evil.example')).toBe('/');
  });
});

describe('post-auth destination', () => {
  it('resumes the interrupted action when the role may open it', () => {
    expect(postAuthDestination('candidate', '/postulaciones/42')).toBe('/postulaciones/42');
    expect(postAuthDestination('counselor', '/orientador/d1')).toBe('/orientador/d1');
    expect(postAuthDestination('employer', '/empresa/s1')).toBe('/empresa/s1');
  });

  it('lands each role on its home otherwise', () => {
    expect(postAuthDestination('candidate', undefined)).toBe('/cuenta/inicio');
    expect(postAuthDestination('candidate', '/')).toBe('/cuenta/inicio');
    expect(postAuthDestination('counselor', '/vacantes')).toBe('/orientador');
    expect(postAuthDestination('employer', '/vacantes')).toBe('/empresa');
    expect(postAuthDestination('candidate', '/empresa')).toBe('/cuenta/inicio');
    expect(postAuthDestination('candidate', 'https://evil.example')).toBe('/cuenta/inicio');
    expect(destinationAfterSignIn('candidate', '/cuenta')).toBe('/cuenta');
  });

  it('builds sign-in and no-access links', () => {
    expect(signInHref('/postulaciones')).toBe('/ingresar?next=%2Fpostulaciones');
    expect(signInHref('//evil.example')).toBe('/ingresar');
    expect(noAccessHref('employer')).toBe('/cuenta/sin-acceso?rol=employer');
  });
});

describe('register field validation', () => {
  it('reports every invalid field inline', () => {
    const errors = validateRegisterFields({ name: '', email: 'x', password: '123', confirmPassword: '1', accountType: '' });
    expect(Object.keys(errors).sort()).toEqual(['accountType', 'confirmPassword', 'email', 'name', 'password']);
  });

  it('accepts valid values', () => {
    expect(validateRegisterFields({ name: 'Ana', email: 'ana@correo.com', password: 'secreto12', confirmPassword: 'secreto12', accountType: 'student' })).toEqual({});
  });
});
