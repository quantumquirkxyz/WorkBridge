'use client';

import type { ExplorationResult } from '@puente/catalog';
import type { Roadmap } from '@puente/training';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiClientError } from '../lib/api/errors';
import type { PreferencesDraft } from '../lib/preferences';
import { useExploreVacancies } from '../lib/queries/exploration';
import { useDeleteCandidateData } from '../lib/queries/preferences';
import { useRequestRoadmap } from '../lib/queries/roadmap';
import { searchesQueryKey, useSaveSearchMutation, useSavedSearches } from '../lib/queries/searches';
import { Card } from './ui/card';
import { NoMatchPanel } from './exploration/NoMatchPanel';
import { PreferencesForm, type PreferencesFormState } from './exploration/PreferencesForm';
import { SavedSearches } from './exploration/SavedSearches';
import { VacancyList } from './exploration/VacancyList';
import { timeToMinutes } from './exploration/utils';

const INITIAL_FORM: PreferencesFormState = {
  targetRoles: 'Atención al cliente',
  modality: 'onsite',
  province: 'Panamá',
  district: 'Panamá',
  maxTravel: 60,
  budget: 40,
  minSalary: 600,
  days: [1, 2, 3, 4, 5],
  start: '08:00',
  end: '17:00',
  weeklyHours: 40,
  contracts: ['full_time'],
  modes: ['transit'],
  willingTrain: true,
  willingIntern: false,
};

function buildPayload(state: PreferencesFormState): PreferencesDraft {
  const roles = state.targetRoles
    .split(',')
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
  return {
    locale: 'es-PA',
    target_roles: roles,
    modality: state.modality,
    max_location: {
      country: 'PA',
      province: state.province.trim() || null,
      district: state.district.trim() || null,
      raw: [state.district, state.province].filter((part) => part.trim().length > 0).join(', ') || null,
    },
    max_travel_minutes: Number(state.maxTravel),
    monthly_transport_budget_usd: Number(state.budget),
    minimum_salary_usd: Number(state.minSalary),
    availability: {
      days: state.days,
      start_minute: timeToMinutes(state.start),
      end_minute: timeToMinutes(state.end),
      weekly_hours: Number(state.weeklyHours),
    },
    contract_types: state.contracts,
    transport_modes: state.modes,
    willing_to_train: state.willingTrain,
    willing_to_intern: state.willingIntern,
  };
}

function exploreErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const details = error.apiError.details?.join(' ');
    return details || `No se pudo explorar vacantes (HTTP ${error.apiError.status}).`;
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export function ExplorationDashboard() {
  const [form, setForm] = useState<PreferencesFormState>(INITIAL_FORM);
  const [result, setResult] = useState<ExplorationResult | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [searchLabel, setSearchLabel] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const exploreMutation = useExploreVacancies();
  const roadmapMutation = useRequestRoadmap();
  const deleteMutation = useDeleteCandidateData();
  const saveSearchMutation = useSaveSearchMutation(result?.candidateId);

  const searchesQuery = useSavedSearches(result?.candidateId);
  const searches = searchesQuery.data ?? [];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(undefined);
    setRoadmap(null);
    setSavedMessage(null);

    try {
      const explored = await exploreMutation.mutateAsync(buildPayload(form));
      setResult(explored);
      if (explored.noMatch?.roadmapRequested) {
        try {
          const body = await roadmapMutation.mutateAsync(explored);
          setRoadmap(body.roadmap);
        } catch {
          // The roadmap is advisory; a failure leaves the no-match explanation intact.
        }
      }
      void queryClient.invalidateQueries({ queryKey: searchesQueryKey(explored.candidateId) });
    } catch (error) {
      setResult(null);
      setSubmitError(exploreErrorMessage(error));
    }
  }

  async function onSaveSearch() {
    if (!result) return;
    try {
      await saveSearchMutation.mutateAsync({ label: searchLabel, preferences: buildPayload(form) });
      setSavedMessage('Búsqueda guardada. Volverás a verla aquí cuando haya coincidencias nuevas.');
      setSearchLabel('');
    } catch {
      setSavedMessage('No se pudo guardar la búsqueda.');
    }
  }

  async function onDeleteData() {
    if (!result) return;
    try {
      const candidateId = result.candidateId;
      await deleteMutation.mutateAsync(candidateId);
      queryClient.removeQueries({ queryKey: searchesQueryKey(candidateId) });
      setResult(null);
      setRoadmap(null);
      setSavedMessage('Tus preferencias y búsquedas guardadas fueron eliminadas.');
    } catch {
      setSavedMessage('No se pudieron eliminar tus datos.');
    }
  }

  const loading = exploreMutation.isPending;

  return (
    <Card className="mb-5 p-5" role="region" aria-labelledby="exploration-heading">
      <h2 id="exploration-heading">Preferencias y exploración de vacantes</h2>
      <p className="hint">
        Estas preferencias las declaras tú: el sistema no las infiere con un modelo. Se guardan como un documento
        validado y se usan para buscar vacantes compatibles en el catálogo en caché.
      </p>
      <PreferencesForm
        state={form}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onSubmit={onSubmit}
        loading={loading}
      />

      <div aria-live="polite" role="status">
        {submitError ? (
          <p className="error" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      {result ? <VacancyList result={result} /> : null}
      {result ? <NoMatchPanel result={result} roadmap={roadmap} /> : null}
      {result ? (
        <SavedSearches
          searches={searches}
          searchLabel={searchLabel}
          onLabelChange={setSearchLabel}
          onSave={onSaveSearch}
          onDelete={onDeleteData}
          message={savedMessage}
        />
      ) : null}
    </Card>
  );
}
