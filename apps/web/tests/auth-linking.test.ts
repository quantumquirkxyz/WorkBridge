import { describe, expect, it } from 'vitest';
import { preservedLinkedAuthFields } from '../lib/auth-linking';

describe('preservedLinkedAuthFields', () => {
  it('defaults linked candidate accounts to candidate without an employer org', () => {
    expect(preservedLinkedAuthFields({})).toEqual({ role: 'candidate', employerOrgId: null });
  });

  it('preserves a linked counselor role', () => {
    expect(preservedLinkedAuthFields({ role: 'counselor', employerOrgId: 'ignored' })).toEqual({
      role: 'counselor',
      employerOrgId: null,
    });
  });

  it('preserves a linked employer role and organization', () => {
    expect(preservedLinkedAuthFields({ role: 'employer', employerOrgId: 'employer_org_development' })).toEqual({
      role: 'employer',
      employerOrgId: 'employer_org_development',
    });
  });
});
