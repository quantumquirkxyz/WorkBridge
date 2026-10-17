import { ApiClientError } from './errors';

export type GateCode = 'critical_gap' | 'unverified_credential' | 'bias_alert' | 'infeasible_transport';
export type CredentialStatus = 'verified' | 'unverified' | 'not_applicable' | 'declared' | 'rejected';

export interface GateReason {
  code: GateCode;
  detail: string;
}

export interface DraftFragment {
  source: 'evidence' | 'vacancy' | 'match';
  evidenceIds: string[];
  text: string;
}

export interface DraftEvidence {
  id: string;
  kind: string;
  text: string;
  credentialStatus: CredentialStatus;
}

export interface HistoryEntry {
  action: string;
  actorRole: 'candidate' | 'employer' | 'counselor';
  timestamp: string;
  reason: string;
}

export interface CounselorDraft {
  draftId: string;
  traceId: string;
  candidateId: string;
  candidateDisplayName?: string;
  vacancyTitle: string;
  status: 'open' | 'rejected' | 'submitted';
  documents: { cv: DraftFragment[]; coverLetter: DraftFragment[]; application: DraftFragment[] };
  evidence: DraftEvidence[];
  counselorGate: GateReason[];
  counselorApproved: boolean;
  history: HistoryEntry[];
}

export type CounselorDecision = 'approvals' | 'rejections';

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await ApiClientError.fromResponse(response);
  return (await response.json()) as T;
}

export async function listPendingCounselorDrafts(): Promise<CounselorDraft[]> {
  const response = await fetch('/api/applications/drafts?gate=counselor&pending=true');
  return (await readJson<{ drafts: CounselorDraft[] }>(response)).drafts;
}

export async function getCounselorDraft(draftId: string): Promise<CounselorDraft> {
  return readJson<CounselorDraft>(await fetch(`/api/applications/drafts/${encodeURIComponent(draftId)}`));
}

export async function decideDraft(
  draft: Pick<CounselorDraft, 'draftId' | 'traceId'>,
  decision: CounselorDecision,
  reason: string,
): Promise<CounselorDraft> {
  const idempotencyKey = crypto.randomUUID();
  const response = await fetch(`/api/applications/drafts/${encodeURIComponent(draft.draftId)}/${decision}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
    body: JSON.stringify({
      traceId: draft.traceId,
      idempotencyKey,
      reason,
      envelope: {
        traceId: draft.traceId,
        idempotencyKey,
        agent: 'market_and_matching',
        schemaId: 'https://puentelaboral.pa/schemas/assumed-match-decision.schema.json',
        guardrails: [{ stage: 'output', allowed: true, code: 'ok' }],
        dqlState: 'validated',
      },
    }),
  });
  return readJson<CounselorDraft>(response);
}
