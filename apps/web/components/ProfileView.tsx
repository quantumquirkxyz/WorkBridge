'use client';

import type { CandidatePreferences, CandidateProfile } from '@puente/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PreferencesDraft } from '../lib/preferences';
import { ApiClientError } from '../lib/api/errors';
import { signOut } from '../lib/auth-client';
import { useCandidateProfile } from '../lib/queries/intake';
import { preferencesQueryKey, useCandidatePreferences, useDeleteCandidateData, useSavePreferences } from '../lib/queries/preferences';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { PreferencesForm, type PreferencesFormState } from './exploration/PreferencesForm';
import { toast } from 'sonner';
import { SignOutButton } from './SignOutButton';

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

function preferencesToForm(preferences: CandidatePreferences): PreferencesFormState {
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

function formToDraft(form: PreferencesFormState): PreferencesDraft {
  return {
    locale: 'es-PA', target_roles: form.targetRoles.split(',').map((role) => role.trim()).filter(Boolean), modality: form.modality,
    max_location: { country: 'PA', province: form.province.trim() || null, district: form.district.trim() || null,
      raw: [form.district, form.province].filter((part) => part.trim()).join(', ') || null },
    max_travel_minutes: Number(form.maxTravel), monthly_transport_budget_usd: Number(form.budget), minimum_salary_usd: Number(form.minSalary),
    availability: { days: form.days, start_minute: timeToMinutes(form.start), end_minute: timeToMinutes(form.end), weekly_hours: Number(form.weeklyHours) },
    contract_types: form.contracts, transport_modes: form.modes, willing_to_train: form.willingTrain, willing_to_intern: form.willingIntern,
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function ProfileView({ candidateId }: { candidateId?: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const profileQuery = useCandidateProfile(candidateId);
  const preferencesQuery = useCandidatePreferences(candidateId);
  const saveMutation = useSavePreferences();
  const deleteMutation = useDeleteCandidateData();

  useEffect(() => {
    if (preferencesQuery.data) setForm(preferencesToForm(preferencesQuery.data));
  }, [preferencesQuery.data]);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidateId) return;
    setMessage(undefined);
    setErrors([]);
    try {
      await saveMutation.mutateAsync(formToDraft(form));
      await queryClient.invalidateQueries({ queryKey: preferencesQueryKey(candidateId) });
       setMessage('Actualizamos tus vacantes');
       toast.success('Actualizamos tus vacantes');
    } catch (error) {
       const details = error instanceof ApiClientError ? error.apiError.details : undefined;
       setErrors(details?.length ? details : ['No se pudieron guardar tus preferencias.']);
    }
  }

  async function onDelete() {
    if (!candidateId) return;
    setMessage(undefined);
    try {
      await deleteMutation.mutateAsync(candidateId);
      queryClient.clear();
      await signOut({ fetchOptions: { onSuccess: () => window.location.assign('/') } });
    } catch {
      setMessage('No se pudieron eliminar tus datos.');
    }
  }

  if (!candidateId) return <main><Card className="p-5"><h1>Mi perfil</h1><p className="hint">Inicia sesión para ver y editar tu perfil.</p></Card></main>;

  return (
    <main className="profile-page">
      <div className="profile-heading"><div><p className="eyebrow">Tu información</p><h1>Mi perfil</h1><p className="lead">Revisa lo que sabemos de ti y ajusta tus preferencias de búsqueda.</p></div><div className="flex gap-2"><Button asChild variant="secondary"><Link href="/chat?mode=profile">Actualizar con el chat</Link></Button><SignOutButton /></div></div>
      {profileQuery.data ? <ProfileSummary profile={profileQuery.data} /> : profileQuery.isLoading ? <p role="status">Cargando tu perfil…</p> : <Card className="p-5"><h2>Aún no tienes un perfil</h2><p className="hint">Regresa a Vacantes para analizar tu CV o describir tu experiencia.</p></Card>}
      <Card className="mt-5 p-5" role="region" aria-labelledby="profile-preferences-heading">
        <h2 id="profile-preferences-heading">Preferencias de trabajo</h2>
        <p className="hint">Puedes cambiar estas preferencias en cualquier momento.</p>
         <PreferencesForm state={form} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} onSubmit={onSave} loading={saveMutation.isPending} />
         {errors.length ? <ul className="error" role="alert" aria-label="Errores de validación">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
        <div aria-live="polite" role="status">{message ? <p className="success">{message}</p> : null}</div>
      </Card>
      <Card className="mt-5 border-danger p-5" role="region" aria-labelledby="delete-data-heading">
        <h2 id="delete-data-heading">Eliminar mis datos</h2>
        <p className="hint">Elimina tu perfil, preferencias y búsquedas guardadas de forma permanente.</p>
         <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
           <AlertDialogTrigger asChild><Button type="button" variant="destructive" disabled={deleteMutation.isPending}>Eliminar mis datos</Button></AlertDialogTrigger>
           <AlertDialogContent onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }}>
             <AlertDialogHeader><AlertDialogTitle>¿Eliminar tus datos?</AlertDialogTitle><AlertDialogDescription>Se eliminarán tu perfil, preferencias y búsquedas guardadas de forma permanente. Las postulaciones enviadas se conservarán.</AlertDialogDescription></AlertDialogHeader>
             <AlertDialogFooter><AlertDialogCancel ref={cancelRef}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void onDelete()}>Eliminar mis datos</AlertDialogAction></AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
      </Card>
    </main>
  );
}

function ProfileSummary({ profile }: { profile: CandidateProfile }) {
  return <Card className="p-5" role="region" aria-labelledby="profile-summary-heading">
    <h2 id="profile-summary-heading">Resumen del perfil</h2>
    <p className="hint">Última actualización: {new Date(profile.updated_at).toLocaleDateString('es-PA')}</p>
    <div className="profile-stats"><strong>{profile.skills.length}<span> habilidades</span></strong><strong>{profile.experiences.length}<span> experiencias</span></strong><strong>{profile.education.length}<span> estudios</span></strong></div>
    {profile.target_roles?.length ? <p><b>Puestos objetivo:</b> {profile.target_roles.join(', ')}</p> : null}
    {profile.skills.length ? <p><b>Habilidades:</b> {profile.skills.slice(0, 8).map((skill) => skill.canonical_name).join(', ')}</p> : null}
    {profile.experiences.length ? <div><h3>Experiencias</h3>{profile.experiences.map((experience) => <article key={experience.id}><p><b>Título:</b> {experience.title}</p><p><b>Tipo:</b> {EXPERIENCE_TYPE_LABELS[experience.experience_type] ?? experience.experience_type}</p><p><b>Relevancia:</b> {RELEVANCE_LABELS[experience.relevance] ?? experience.relevance}</p></article>)}</div> : null}
  </Card>;
}
