import { describe, expect, it } from 'vitest';
import {
  deriveStatus,
  errorCopy,
  evidenceFromProfile,
  gateCopy,
  lastActivity,
  rejectionInfo,
  relativeTime,
  signInHref,
  type DraftView,
} from '../lib/applications-status';

function draft(overrides: Partial<DraftView> = {}): DraftView {
  return {
    draftId: 'd1', candidateId: 'c1', vacancyId: 'v1', traceId: 't1', vacancyTitle: 'Cajero/a',
    evidence: [], status: 'open',
    documents: { cv: [], coverLetter: [], application: [] },
    counselorGate: [], candidateApproved: false, counselorApproved: false, history: [],
    ...overrides,
  };
}
const gate = [{ code: 'bias_alert' as const, detail: 'x' }];

describe('deriveStatus (ux-flows status table, first match wins)', () => {
  it('rejected beats everything', () => {
    expect(deriveStatus(draft({ status: 'rejected', candidateApproved: true }), { interview: 'approved' })).toBe('rejected');
  });
  it('submitted maps the interview state', () => {
    expect(deriveStatus(draft({ status: 'submitted' }), { interview: 'approved' })).toBe('interview_approved');
    expect(deriveStatus(draft({ status: 'submitted' }), { interview: 'rejected' })).toBe('interview_rejected');
    expect(deriveStatus(draft({ status: 'submitted' }), { interview: 'pending_employer_approval' })).toBe('sent');
    expect(deriveStatus(draft({ status: 'submitted' }))).toBe('sent');
  });
  it('open drafts', () => {
    expect(deriveStatus(draft())).toBe('draft');
    expect(deriveStatus(draft({ candidateApproved: true, counselorGate: gate }))).toBe('counselor_review');
    expect(deriveStatus(draft({ candidateApproved: true, counselorGate: gate, counselorApproved: true }))).toBe('ready');
    expect(deriveStatus(draft({ candidateApproved: true }))).toBe('ready');
  });
});

describe('copy', () => {
  it('maps gate reasons to plain Spanish', () => {
    expect(gateCopy({ code: 'critical_gap', detail: 'Inglés avanzado.' })).toBe('Te falta un requisito importante para este puesto: Inglés avanzado.');
    expect(gateCopy({ code: 'unverified_credential', detail: 'e1' })).toMatch(/certificaciones/);
    expect(gateCopy({ code: 'bias_alert', detail: '' })).toMatch(/justo contigo/);
    expect(gateCopy({ code: 'infeasible_transport', detail: '' })).toMatch(/traslado/);
  });
  it('maps runtime error codes and network failures', () => {
    const api = (code: string, status = 422) => ({ apiError: { code, status, message: '' } });
    expect(errorCopy(api('candidate_approval_required')).action).toBe('focus_approve');
    expect(errorCopy(api('already_submitted', 409)).message).toBe('Esta postulación ya fue enviada.');
    expect(errorCopy(api('unknown_evidence')).action).toBe('revert');
    expect(errorCopy(api('whatever', 401)).action).toBe('sign_in');
    expect(errorCopy(api('whatever', 403)).action).toBe('home');
    expect(errorCopy(new TypeError('fetch failed')).message).toMatch(/conexión/);
  });
  it('builds a safe sign-in link', () => {
    expect(signInHref('/postulaciones/nueva?vacancy=j1')).toBe('/ingresar?next=%2Fpostulaciones%2Fnueva%3Fvacancy%3Dj1');
    expect(signInHref('https://evil.test')).toBe('/ingresar?next=%2F');
  });
  it('formats relative time', () => {
    const now = new Date('2026-10-17T12:00:00Z');
    expect(relativeTime('2026-10-17T10:00:00Z', now)).toBe('hace 2 h');
    expect(relativeTime('2026-10-17T11:30:00Z', now)).toBe('hace 30 min');
    expect(relativeTime(null, now)).toBe('');
  });
});

describe('history helpers', () => {
  it('finds the latest rejection and activity', () => {
    const d = draft({ history: [
      { action: 'approval', actorRole: 'candidate', timestamp: '2026-10-16T10:00:00Z', reason: 'ok' },
      { action: 'rejection', actorRole: 'counselor', timestamp: '2026-10-16T12:00:00Z', reason: 'Falta experiencia' },
    ] });
    expect(rejectionInfo(d)).toEqual({ role: 'counselor', reason: 'Falta experiencia' });
    expect(lastActivity(d)).toBe('2026-10-16T12:00:00Z');
    expect(rejectionInfo(draft())).toBeNull();
  });
});

describe('evidenceFromProfile', () => {
  it('maps declared profile items and certification verification', () => {
    const evidence = evidenceFromProfile({
      experiences: [{ id: 'x1', title: 'Cajera', organization: 'Tienda', description: 'Atención al cliente' }],
      education: [{ id: 'e1', program: 'Bachiller', institution: 'IPT' }],
      certifications: [
        { id: 'c1', name: 'Excel', issuer: 'INADEH', status: 'verified' },
        { id: 'c2', name: 'Inglés', status: 'declared' },
      ],
      skills: [
        { skill_id: 'plp:excel', canonical_name: 'Excel', level: 3 },
        { skill_id: 'plp:communication', canonical_name: 'Comunicación', level: 0 },
        { skill_id: '', canonical_name: 'Sin id', level: 2 },
      ],
    } as never);
    expect(evidence.map((item) => [item.id, item.kind, item.credentialStatus])).toEqual([
      ['x1', 'experience', 'not_applicable'],
      ['e1', 'education', 'not_applicable'],
      ['c1', 'certification', 'verified'],
      ['c2', 'certification', 'unverified'],
      ['plp:excel', 'skill', 'not_applicable'],
      ['plp:communication', 'skill', 'not_applicable'],
    ]);
    expect(evidence.find((item) => item.id === 'plp:excel')?.text).toBe('Excel · nivel 3');
    expect(evidence.find((item) => item.id === 'plp:communication')?.text).toBe('Comunicación');
    expect(evidence[0]!.text).toBe('Cajera · Tienda: Atención al cliente');
  });
});
