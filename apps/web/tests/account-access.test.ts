import { describe, expect, it } from 'vitest';
import {
  destinationAfterRegister,
  destinationAfterSignIn,
  needsAccount,
  parseRegisterBody,
  startPathFor,
} from '../lib/account-access';

describe('account access', () => {
  it('requires an account before the conversation', () => {
    expect(startPathFor(null)).toBe('/cuenta');
    expect(startPathFor({ role: 'candidate', isAnonymous: true })).toBe('/cuenta');
    expect(startPathFor({ role: 'candidate', isAnonymous: false })).toBe('/chat');
    expect(startPathFor({ role: 'employer', isAnonymous: false })).toBe('/empresa');
  });

  it('rejects a register body without an account type', () => {
    expect(parseRegisterBody({ name: 'Ana', email: 'ana@example.com', password: 'secreto12' }).ok).toBe(false);
  });

  it('sends each account type to its panel', () => {
    const parsed = parseRegisterBody({
      name: 'Ana Pérez',
      email: 'Ana@Example.com',
      password: 'secreto12',
      accountType: 'employer',
    });
    expect(parsed).toEqual({
      ok: true,
      value: { name: 'Ana Pérez', email: 'ana@example.com', password: 'secreto12', accountType: 'employer' },
    });
    expect(destinationAfterRegister('student', '/')).toBe('/chat');
    expect(destinationAfterRegister('employer', '/chat')).toBe('/empresa');
    expect(destinationAfterSignIn('candidate', '/vacantes')).toBe('/vacantes');
    expect(destinationAfterSignIn('employer', '/chat')).toBe('/empresa');
    expect(needsAccount({ role: 'candidate', isAnonymous: false })).toBe(false);
  });
});
