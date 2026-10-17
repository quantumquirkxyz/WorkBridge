import { describe, expect, it } from 'vitest';
import { relativeWait, waitingSince } from '@/lib/counselor-ui';
import { applySubmissionView, employerVisibleHistory } from '@/lib/employer-ui';

describe('queue helpers', () => {
  it('computes waiting time from the candidate approval', () => {
    const history = [
      { action: 'approval', actorRole: 'candidate' as const, timestamp: '2026-10-17T10:00:00.000Z', reason: '' },
      { action: 'correction', actorRole: 'candidate' as const, timestamp: '2026-10-17T11:00:00.000Z', reason: '' },
    ];
    expect(waitingSince(history)).toBe('2026-10-17T10:00:00.000Z');
    expect(relativeWait('2026-10-17T10:00:00.000Z', Date.parse('2026-10-17T13:00:00.000Z'))).toBe('hace 3 h');
    expect(relativeWait(undefined)).toBe('');
  });

  it('filters employer submissions and hides non-employer history', () => {
    const rows = [
      { submissionId: 'a', vacancyTitle: 'Cajero', interview: 'pending_employer_approval' as const, traceId: 't' },
      { submissionId: 'b', vacancyTitle: 'Soporte', interview: 'pending_employer_approval' as const, traceId: 't' },
    ];
    expect(applySubmissionView(rows, { search: 'caj', sort: 'oldest' })).toHaveLength(1);
    expect(applySubmissionView(rows, { search: '', sort: 'newest' })[0]?.submissionId).toBe('b');
    expect(employerVisibleHistory([{ action: 'rejection', actorRole: 'counselor', timestamp: '', reason: 'x' }])).toEqual([]);
  });
});
