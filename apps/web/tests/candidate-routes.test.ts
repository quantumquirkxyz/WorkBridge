import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateProfile } from '@workbridge/domain';

const state = vi.hoisted(() => ({ candidateId: 'candidate-1' as string | undefined }));
const repo = vi.hoisted(() => ({
  deleteCandidateData: vi.fn(async () => undefined),
  readCandidateProfile: vi.fn(async (): Promise<unknown> => undefined),
  readCandidatePreferences: vi.fn(async (): Promise<unknown> => undefined),
}));

vi.mock('../lib/candidate-session', () => ({
  candidateIdFromRequest: () => state.candidateId,
  candidateIdFromRequestOrSession: async () => state.candidateId,
  unauthorized: () => Response.json({ error: 'unauthorized' }, { status: 401 }),
}));
vi.mock('../lib/auth', () => ({ getServerSession: async () => null }));
vi.mock('../lib/neon-repository', () => repo);

import { DELETE as deleteCandidate } from '../app/api/candidate/route';
import { GET as getProfile } from '../app/api/profile/route';
import { GET as getPreferences } from '../app/api/preferences/route';
import { profileStore } from '../lib/profile-store';

const request = () => new Request('http://localhost/api/x');

describe('candidate routes resolve the browser session', () => {
  beforeEach(() => {
    state.candidateId = 'candidate-1';
    vi.clearAllMocks();
  });

  it('GET /api/profile returns the stored profile, 404 when none, 401 when signed out', async () => {
    repo.readCandidateProfile.mockResolvedValueOnce({ candidate_id: 'candidate-1' });
    expect((await getProfile(request())).status).toBe(200);
    expect((await getProfile(request())).status).toBe(404);
    state.candidateId = undefined;
    expect((await getProfile(request())).status).toBe(401);
  });

  it('GET /api/preferences returns 404 for a first visit and the document afterwards', async () => {
    expect((await getPreferences(request())).status).toBe(404);
    repo.readCandidatePreferences.mockResolvedValueOnce({ candidate_id: 'candidate-1', target_roles: [] });
    const response = await getPreferences(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ candidate_id: 'candidate-1' });
  });

  it('DELETE /api/candidate removes the durable data and the in-memory profile (CS-7)', async () => {
    profileStore.save({ candidate_id: 'candidate-1' } as CandidateProfile);
    const response = await deleteCandidate(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ deleted: true, candidateId: 'candidate-1' });
    expect(repo.deleteCandidateData).toHaveBeenCalledWith('candidate-1');
    expect(profileStore.get('candidate-1')).toBeUndefined();
  });

  it('DELETE /api/candidate keeps the profile when the durable delete fails', async () => {
    profileStore.save({ candidate_id: 'candidate-1' } as CandidateProfile);
    repo.deleteCandidateData.mockRejectedValueOnce(new Error('db down'));
    const response = await deleteCandidate(request());
    expect(response.status).toBe(503);
    expect(profileStore.get('candidate-1')).toBeDefined();
    profileStore.delete('candidate-1');
  });

  it('DELETE /api/candidate requires a session', async () => {
    state.candidateId = undefined;
    expect((await deleteCandidate(request())).status).toBe(401);
    expect(repo.deleteCandidateData).not.toHaveBeenCalled();
  });
});
