'use client';

import type { CandidatePreferences, CandidateProfile } from '@workbridge/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { PreferencesDraft } from '../lib/preferences';
import { ApiClientError } from '../lib/api/errors';
import { exploreVacancies } from '../lib/api/client';
import { signOut } from '../lib/auth-client';
import { useCandidateProfile } from '../lib/queries/intake';
import { preferencesQueryKey, useCandidatePreferences, useDeleteCandidateData } from '../lib/queries/preferences';
import { useSavedSearches } from '../lib/queries/searches';
import { clearLocalCandidateData } from '../lib/profile-view';
import { persistExploration } from './exploration/useExploration';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { PreferencesForm, type PreferencesFormState } from './exploration/PreferencesForm';
import { SavedSearches } from './exploration/SavedSearches';
import { SignOutButton } from './SignOutButton';
import '../app/styles/explore.css';

const DEFAULT_FORM: PreferencesFormState = {
  targetRoles: '', modality: 'onsite', province: '', district: '', maxTravel: 60, budget: 40, minSalary: 600,
  days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', weeklyHours: 40,
  contracts: ['full_time'], modes: ['transit'], willingTrain: true, willingIntern: false,
};

const EXPERIENCE_TYPE_LABELS: Record<string, string> = {
  formal_employment: 'Empleo formal', informal_work: 'Trabajo informal', family_business: 'Negocio familiar',
  volunteering: 'Voluntariado', project: 'Proyecto', academic: 'Académico', internship: 'Pasantía',
};
const RELEVANCE_LABELS: Record<string, string> = {
  relevant: 'Relevante', partially_relevant: 'Parcialmente relevante', not_relevant: 'No relevante',
  requires_additional_evidence: 'Requiere más evidencia',
};

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function preferencesToForm(preferences: CandidatePreferences): PreferencesFormState {
  return {
    targetRoles: preferences.target_roles.join(', '), modality: preferences.modality,
    province: preferences.max_location.province ?? '', district: preferences.max_location.district ?? '',
    maxTravel: preferences.max_travel_minutes, budget: preferences.monthly_transport_budget_usd,
    minSalary: preferences.minimum_salary_usd, days: preferences.availability.days,
    start: minutesToTime(preferences.availability.start_minute), end: minutesToTime(preferences.availability.end_minute),
    weeklyHours: preferences.availability.weekly_hours, contracts: preferences.contract_types,
    modes: preferences.transport_modes, willingTrain: preferences.willing_to_train, willingIntern: preferences.willing_to_intern,
  };
}

export function formToDraft(form: PreferencesFormState): PreferencesDraft {
  return {
    locale: 'es-PA', target_roles: form.targetRoles.split(',').map((role) => role.trim()).filter(Boolean), modality: form.modality,
    max_location: { country: 'PA', province: form.province.trim() || null, district: form.district.trim() || null,
      raw: [form.district, form.province].filter((part) => part.trim()).join(', ') || null },
    max_travel_minutes: Number(form.maxTravel), monthly_transport_budget_usd: Number(form.budget), minimum_salary_usd: Number(form.minSalary),
    availability: { days: form.days, start_minute: timeToMinutes(form.start), end_minute: timeToMinutes(form.end), weekly_hours: Number(form.weeklyHours) },
    contract_types: form.contracts, transport_modes: form.modes, willing_to_train: form.willingTrain, willing_to_intern: form.willingIntern,
  };
}

const isStatus = (error: unknown, status: number) => error instanceof ApiClientError && error.apiError.status === status;

export function ProfileView({ candidateId }: { candidateId?: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [signedOut, setSignedOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const profileQuery = useCandidateProfile(candidateId);
  const preferencesQuery = useCandidatePreferences(candidateId);
  const searchesQuery = useSavedSearches(candidateId);
  const deleteMutation = useDeleteCandidateData();

  useEffect(() => {
    if (preferencesQuery.data) setForm(preferencesToForm(preferencesQuery.data));
  }, [preferencesQuery.data]);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setErrors([]);
    setSignedOut(false);
    setSaving(true);
    try {
      // Saving re-runs the exploration so the next visit to Vacantes already reflects the change.
      const fresh = await exploreVacancies(formToDraft(form));
      persistExploration(fresh.candidateId, fresh);
      if (candidateId) await queryClient.invalidateQueries({ queryKey: preferencesQueryKey(candidateId) });
      setSaved(true);
      toast.success('Actualizamos tus vacantes');
    } catch (error) {
      if (isStatus(error, 401)) setSignedOut(true);
      else {
        const details = error instanceof ApiClientError ? error.apiError.details : undefined;
        setErrors(details?.length ? details : ['No pudimos guardar tus preferencias. Intenta de nuevo.']);
      }
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(candidateId ?? '');
    } catch {
      setDeleteError('No pudimos eliminar tus datos. Intenta de nuevo.');
      return;
    }
    clearLocalCandidateData();
    queryClient.clear();
    const goHome = () => window.location.assign('/');
    try {
      await signOut({ fetchOptions: { onSuccess: goHome } });
    } finally {
      goHome();
    }
  }

  if (!candidateId) {
    return (
      <main className="profile-page xp-page">
        <section className="xp-panel xp-empty">
          <h1 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', margin: 0 }}>Mi perfil</h1>
          <p>Inicia sesión para ver y editar tu perfil.</p>
          <Button asChild><Link href="/ingresar?next=/perfil">Ingresar</Link></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page xp-page">
      <header className="page-head page-head-sky">
        <p className="eyebrow">Tu información</p>
        <h1>Mi perfil</h1>
        <p className="lead">Revisa lo que sabemos de ti y ajusta lo que buscas. Tus vacantes se actualizan al guardar.</p>
        <div className="xp-head-actions"><SignOutButton /></div>
      </header>

      <div className="xp-profile-cols">
        <section className="xp-panel" aria-labelledby="skills-heading">
          <h2 id="skills-heading" className="xp-section-title">Lo que sabes hacer</h2>
          <ProfileSummary query={profileQuery} />
          <div style={{ marginTop: '1rem' }}>
            <Button asChild variant="secondary"><Link href="/chat?mode=profile">Actualizar con el chat</Link></Button>
          </div>
        </section>

        <section className="xp-panel" aria-labelledby="prefs-heading">
          <h2 id="prefs-heading" className="xp-section-title">Lo que buscas</h2>
          {preferencesQuery.isLoading ? (
            <div role="status" aria-label="Cargando tus preferencias"><Skeleton className="xp-skel-line" style={{ height: '8rem' }} /></div>
          ) : preferencesQuery.isError && !isStatus(preferencesQuery.error, 404) ? (
            <div role="alert" className="xp-inline-error">
              No pudimos cargar tus preferencias. <button type="button" className="xp-course-link" onClick={() => void preferencesQuery.refetch()}>Reintentar</button>
            </div>
          ) : (
            <>
              {isStatus(preferencesQuery.error, 404) ? <p className="xp-muted" style={{ marginBottom: '.75rem' }}>Todavía no nos dijiste qué buscas. Cuéntanoslo aquí o en el chat.</p> : null}
              <PreferencesForm state={form} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} onSubmit={onSave} loading={saving} />
            </>
          )}
          {errors.length > 0 ? <ul className="xp-inline-error" role="alert" aria-label="Errores de validación" style={{ listStyle: 'none', margin: '1rem 0 0' }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
          {signedOut ? <p role="alert" className="xp-inline-error" style={{ marginTop: '1rem' }}>Tu sesión terminó. <Link className="xp-course-link" href="/ingresar?next=/perfil">Ingresa de nuevo</Link></p> : null}
          <div aria-live="polite" role="status">
            {saved ? <p className="success">Actualizamos tus vacantes. <Link className="xp-course-link" href="/vacantes">Ver mis vacantes</Link></p> : null}
          </div>
        </section>
      </div>

      <section className="xp-panel" aria-labelledby="searches-heading">
        <h2 id="searches-heading" className="xp-section-title">Búsquedas guardadas</h2>
        {searchesQuery.isLoading ? (
          <div role="status" aria-label="Cargando tus búsquedas"><Skeleton className="xp-skel-line" /></div>
        ) : searchesQuery.isError ? (
          <div role="alert" className="xp-inline-error">
            No pudimos cargar tus búsquedas. <button type="button" className="xp-course-link" onClick={() => void searchesQuery.refetch()}>Reintentar</button>
          </div>
        ) : (
          <SavedSearches searches={searchesQuery.data ?? []} />
        )}
      </section>

      <section className="xp-panel xp-danger" aria-labelledby="delete-data-heading">
        <h2 id="delete-data-heading" className="xp-section-title">Tus datos</h2>
        <p className="xp-muted" style={{ marginBottom: '1rem' }}>Puedes borrar tu perfil, tus preferencias y tus búsquedas guardadas cuando quieras.</p>
        <AlertDialog open={deleteOpen} onOpenChange={(next) => { setDeleteOpen(next); if (!next) setDeleteError(null); }}>
          <AlertDialogTrigger asChild><Button type="button" variant="destructive">Eliminar mis datos</Button></AlertDialogTrigger>
          <AlertDialogContent onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }}>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar todos tus datos?</AlertDialogTitle>
              <AlertDialogDescription>Vamos a borrar tu perfil, tus preferencias y tus búsquedas guardadas. No se puede deshacer. Las postulaciones que ya enviaste se conservan como registro.</AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError ? <p role="alert" className="xp-inline-error">{deleteError}</p> : null}
            <AlertDialogFooter>
              <AlertDialogCancel ref={cancelRef}>Cancelar</AlertDialogCancel>
              <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => void onDelete()}>{deleteMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );
}

type ProfileQuery = ReturnType<typeof useCandidateProfile>;

function ProfileSummary({ query }: { query: ProfileQuery }) {
  if (query.isLoading) {
    return (
      <div role="status" aria-label="Cargando tu perfil" style={{ display: 'grid', gap: '.5rem' }}>
        <Skeleton className="xp-skel-line" /><Skeleton className="xp-skel-line" style={{ width: '70%' }} /><Skeleton className="xp-skel-line" style={{ width: '85%' }} />
      </div>
    );
  }
  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.apiError.status === 404) {
      return <p className="xp-muted">Aún no tienes un perfil. Cuéntanos tu experiencia en el chat y lo armamos juntos.</p>;
    }
    return (
      <div role="alert" className="xp-inline-error">
        No pudimos cargar tu perfil. <button type="button" className="xp-course-link" onClick={() => void query.refetch()}>Reintentar</button>
      </div>
    );
  }
  if (!query.data) return null;
  return <ProfileDetails profile={query.data} />;
}

function ProfileDetails({ profile }: { profile: CandidateProfile }) {
  return (
    <>
      {profile.skills.length > 0 ? (
        <ul className="xp-skill-list" aria-label="Tus habilidades">
          {profile.skills.map((skill, index) => <li key={`${skill.canonical_name}-${index}`} className="xp-chip xp-chip-yellow">{skill.canonical_name}</li>)}
        </ul>
      ) : <p className="xp-muted">Todavía no registramos habilidades.</p>}
      {profile.experiences.length > 0 ? (
        <>
          <h3 className="xp-section-title" style={{ fontSize: '1rem', marginTop: '1.25rem' }}>Experiencias</h3>
          <ul className="xp-exp-list">
            {profile.experiences.map((experience) => (
              <li key={experience.id}>
                <strong>{experience.title}</strong>
                <span className="xp-muted">{EXPERIENCE_TYPE_LABELS[experience.experience_type] ?? experience.experience_type} · {RELEVANCE_LABELS[experience.relevance] ?? experience.relevance}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
