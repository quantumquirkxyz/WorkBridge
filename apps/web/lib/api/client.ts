import type { IntakeRequest, IntakeResult, CandidateProfile, CandidatePreferences } from '@workbridge/domain';
import type { ExplorationResult } from '@workbridge/catalog';
import type { Roadmap, TrainingGap } from '@workbridge/training';
import type { MatchDecision } from '@workbridge/solver';
import type { PreferencesDraft } from '../preferences';
import { ApiClientError } from './errors';
import type { SavedSearch, SavedSearchView } from './contracts';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await ApiClientError.fromResponse(response);
  }
  return (await response.json()) as T;
}

export interface RoadmapResponse {
  roadmap: Roadmap | null;
  gaps: TrainingGap[];
  reason: string;
}

export interface DeletePreferencesResponse {
  deleted?: boolean;
  candidateId?: string;
  preferencesDeleted?: boolean;
  searchesDeleted?: number;
  error?: string;
}

export interface DbHealthResponse {
  ok: boolean;
  database?: string;
  error?: string;
}

export interface SaveSearchPayload {
  label: string;
  preferences: PreferencesDraft;
}

export interface ListSearchesResponse {
  searches: SavedSearchView[];
}

export interface MatchResponse {
  decisions: MatchDecision[];
  preferencesVersion: string;
}

export async function getCandidateProfile(candidateId: string): Promise<CandidateProfile> {
  const response = await fetch(`/api/intake?candidateId=${encodeURIComponent(candidateId)}`);
  return readJson<CandidateProfile>(response);
}

export async function postIntake(payload: IntakeRequest): Promise<IntakeResult> {
  const response = await fetch('/api/intake', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  return readJson<IntakeResult>(response);
}

export async function getPreferences(candidateId: string): Promise<CandidatePreferences> {
  const response = await fetch(`/api/preferences?candidateId=${encodeURIComponent(candidateId)}`);
  return readJson<CandidatePreferences>(response);
}

export async function postPreferences(draft: PreferencesDraft): Promise<CandidatePreferences> {
  const response = await fetch('/api/preferences', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(draft),
  });
  return readJson<CandidatePreferences>(response);
}

export async function deleteCandidatePreferences(_candidateId: string): Promise<DeletePreferencesResponse> {
  const response = await fetch('/api/candidate', {
    method: 'DELETE',
  });
  return readJson<DeletePreferencesResponse>(response);
}

export async function exploreVacancies(preferences: PreferencesDraft): Promise<ExplorationResult> {
  const response = await fetch('/api/explore', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(preferences),
  });
  return readJson<ExplorationResult>(response);
}

export async function matchVacancies(vacancyIds: string[]): Promise<MatchResponse> {
  const response = await fetch('/api/match', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ vacancyIds }) });
  return readJson<MatchResponse>(response);
}

export async function requestRoadmap(exploration: ExplorationResult): Promise<RoadmapResponse> {
  const response = await fetch('/api/roadmap', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(exploration),
  });
  return readJson<RoadmapResponse>(response);
}

export async function listSavedSearches(candidateId: string): Promise<SavedSearchView[]> {
  const response = await fetch(`/api/searches?candidateId=${encodeURIComponent(candidateId)}`);
  const body = await readJson<ListSearchesResponse>(response);
  return body.searches;
}

export async function saveSearch(payload: SaveSearchPayload): Promise<SavedSearch> {
  const response = await fetch('/api/searches', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  return readJson<SavedSearch>(response);
}

export async function checkDbHealth(): Promise<DbHealthResponse> {
  const response = await fetch('/api/health/db');
  if (!response.ok) {
    return readJson<DbHealthResponse>(response);
  }
  return readJson<DbHealthResponse>(response);
}
