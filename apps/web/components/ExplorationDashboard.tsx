'use client';

import { useState } from 'react';
import type { ContractType, TransportMode, WorkModality } from '@puente/domain';
import {
  CONTRACT_LABELS,
  DEFAULT_MAX_AGE_HOURS,
  EXCLUSION_LABELS,
  MODALITY_LABELS,
  type ExplorationResult,
  type NearMatch,
  type NoMatchCause,
} from '@puente/catalog';
import type { Roadmap, TrainingGap } from '@puente/training';
import type { SavedSearchView } from '../lib/saved-searches-store';
import type { PreferencesDraft } from '../lib/preferences';

const DAY_LABELS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const MODALITY_OPTIONS: Array<{ value: WorkModality; label: string }> = [
  { value: 'onsite', label: MODALITY_LABELS.onsite },
  { value: 'hybrid', label: MODALITY_LABELS.hybrid },
  { value: 'remote', label: MODALITY_LABELS.remote },
];

const CONTRACT_OPTIONS: Array<{ value: ContractType; label: string }> = [
  { value: 'full_time', label: CONTRACT_LABELS.full_time },
  { value: 'part_time', label: CONTRACT_LABELS.part_time },
  { value: 'fixed_term', label: CONTRACT_LABELS.fixed_term },
  { value: 'internship', label: CONTRACT_LABELS.internship },
  { value: 'temporary', label: CONTRACT_LABELS.temporary },
  { value: 'freelance', label: CONTRACT_LABELS.freelance },
];

const TRANSPORT_OPTIONS: Array<{ value: TransportMode; label: string }> = [
  { value: 'transit', label: 'Transporte público' },
  { value: 'driving', label: 'Auto' },
  { value: 'walking', label: 'A pie' },
  { value: 'cycling', label: 'Bicicleta' },
];

function timeToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function money(value: number | null): string {
  return value === null ? 'No publica' : `USD ${value}`;
}

interface FormStatus {
  loading: boolean;
  error?: string;
}

/** The exact preference-draft shape the API validates; no local re-declaration. */
type PreferencesPayload = PreferencesDraft;

export function ExplorationDashboard() {
  const [targetRoles, setTargetRoles] = useState('Atención al cliente');
  const [modality, setModality] = useState<WorkModality>('onsite');
  const [province, setProvince] = useState('Panamá');
  const [district, setDistrict] = useState('Panamá');
  const [maxTravel, setMaxTravel] = useState(60);
  const [budget, setBudget] = useState(40);
  const [minSalary, setMinSalary] = useState(600);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [contracts, setContracts] = useState<ContractType[]>(['full_time']);
  const [modes, setModes] = useState<TransportMode[]>(['transit']);
  const [willingTrain, setWillingTrain] = useState(true);
  const [willingIntern, setWillingIntern] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ loading: false });
  const [result, setResult] = useState<ExplorationResult | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [searchLabel, setSearchLabel] = useState('');
  const [searches, setSearches] = useState<SavedSearchView[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function toggle<T>(list: T[], value: T, setter: (next: T[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function currentPayload(): PreferencesPayload {
    const roles = targetRoles
      .split(',')
      .map((role) => role.trim())
      .filter((role) => role.length > 0);
    return {
      locale: 'es-PA',
      target_roles: roles,
      modality,
      max_location: {
        country: 'PA',
        province: province.trim() || null,
        district: district.trim() || null,
        raw: [district, province].filter((part) => part.trim().length > 0).join(', ') || null,
      },
      max_travel_minutes: Number(maxTravel),
      monthly_transport_budget_usd: Number(budget),
      minimum_salary_usd: Number(minSalary),
      availability: {
        days,
        start_minute: timeToMinutes(start),
        end_minute: timeToMinutes(end),
        weekly_hours: Number(weeklyHours),
      },
      contract_types: contracts,
      transport_modes: modes,
      willing_to_train: willingTrain,
      willing_to_intern: willingIntern,
    };
  }

  async function loadSearches(candidateId: string) {
    try {
      const response = await fetch(`/api/searches?candidateId=${encodeURIComponent(candidateId)}`);
      if (!response.ok) return;
      const body = (await response.json()) as { searches: SavedSearchView[] };
      setSearches(body.searches);
    } catch {
      // A listing failure must not break the primary exploration view.
    }
  }

  async function requestRoadmap(explored: ExplorationResult) {
    setRoadmap(null);
    if (explored.matches.length > 0) return;
    try {
      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(explored),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { roadmap: Roadmap | null };
      setRoadmap(body.roadmap);
    } catch {
      // The roadmap is advisory; a failure leaves the no-match explanation intact.
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ loading: true });
    setRoadmap(null);
    setSavedMessage(null);

    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(currentPayload()),
      });
      const body = (await response.json()) as ExplorationResult | { error?: string; details?: string[] };
      if (!response.ok) {
        const details = 'details' in body && Array.isArray(body.details) ? body.details.join(' ') : '';
        setResult(null);
        setStatus({ loading: false, error: details || `No se pudo explorar vacantes (HTTP ${response.status}).` });
        return;
      }
      const explored = body as ExplorationResult;
      setResult(explored);
      setStatus({ loading: false });
      // Trigger the training-roadmap path only when nothing viable was found.
      await requestRoadmap(explored);
      await loadSearches(explored.candidateId);
    } catch (error) {
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      });
    }
  }

  async function onSaveSearch() {
    if (!result) return;
    try {
      const response = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: searchLabel, preferences: currentPayload() }),
      });
      if (!response.ok) {
        setSavedMessage('No se pudo guardar la búsqueda.');
        return;
      }
      setSavedMessage('Búsqueda guardada. Volverás a verla aquí cuando haya coincidencias nuevas.');
      setSearchLabel('');
      await loadSearches(result.candidateId);
    } catch {
      setSavedMessage('No se pudo guardar la búsqueda.');
    }
  }

  async function onDeleteData() {
    if (!result) return;
    try {
      const response = await fetch(`/api/preferences?candidateId=${encodeURIComponent(result.candidateId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setSavedMessage('No se pudieron eliminar tus datos.');
        return;
      }
      setResult(null);
      setSearches([]);
      setRoadmap(null);
      setSavedMessage('Tus preferencias y búsquedas guardadas fueron eliminadas.');
    } catch {
      setSavedMessage('No se pudieron eliminar tus datos.');
    }
  }

  return (
    <section className="card" aria-labelledby="exploration-heading">
      <h2 id="exploration-heading">Preferencias y exploración de vacantes</h2>
      <p className="hint">
        Estas preferencias las declaras tú: el sistema no las infiere con un modelo. Se guardan como un
        documento validado y se usan para buscar vacantes compatibles en el catálogo en caché.
      </p>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="pref-roles">Puestos objetivo (separados por coma)</label>
          <input
            id="pref-roles"
            type="text"
            value={targetRoles}
            onChange={(event) => setTargetRoles(event.target.value)}
            placeholder="Atención al cliente, Ventas"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="pref-modality">Modalidad</label>
            <select
              id="pref-modality"
              value={modality}
              onChange={(event) => setModality(event.target.value as WorkModality)}
            >
              {MODALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pref-province">Provincia</label>
            <input id="pref-province" type="text" value={province} onChange={(event) => setProvince(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pref-district">Distrito</label>
            <input id="pref-district" type="text" value={district} onChange={(event) => setDistrict(event.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="pref-travel">Traslado máximo (minutos)</label>
            <input
              id="pref-travel"
              type="number"
              min={0}
              max={600}
              value={maxTravel}
              onChange={(event) => setMaxTravel(Number(event.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="pref-budget">Presupuesto de transporte (USD/mes)</label>
            <input
              id="pref-budget"
              type="number"
              min={0}
              value={budget}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="pref-salary">Salario mínimo (USD/mes)</label>
            <input
              id="pref-salary"
              type="number"
              min={0}
              value={minSalary}
              onChange={(event) => setMinSalary(Number(event.target.value))}
            />
          </div>
        </div>

        <fieldset className="field">
          <legend>Días disponibles</legend>
          <div className="checkbox-group">
            {DAY_LABELS.map((day) => (
              <label key={day.value}>
                <input
                  type="checkbox"
                  checked={days.includes(day.value)}
                  onChange={() => toggle(days, day.value, setDays)}
                />
                {day.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-row">
          <div className="field">
            <label htmlFor="pref-start">Hora de inicio</label>
            <input id="pref-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pref-end">Hora de fin</label>
            <input id="pref-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pref-weekly">Horas semanales</label>
            <input
              id="pref-weekly"
              type="number"
              min={0}
              max={168}
              value={weeklyHours}
              onChange={(event) => setWeeklyHours(Number(event.target.value))}
            />
          </div>
        </div>

        <fieldset className="field">
          <legend>Tipo de contrato</legend>
          <div className="checkbox-group">
            {CONTRACT_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  type="checkbox"
                  checked={contracts.includes(option.value)}
                  onChange={() => toggle(contracts, option.value, setContracts)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Modos de transporte</legend>
          <div className="checkbox-group">
            {TRANSPORT_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  type="checkbox"
                  checked={modes.includes(option.value)}
                  onChange={() => toggle(modes, option.value, setModes)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Disposición</legend>
          <div className="checkbox-group">
            <label>
              <input type="checkbox" checked={willingTrain} onChange={(event) => setWillingTrain(event.target.checked)} />
              Dispuesto a tomar cursos
            </label>
            <label>
              <input type="checkbox" checked={willingIntern} onChange={(event) => setWillingIntern(event.target.checked)} />
              Dispuesto a hacer pasantías
            </label>
          </div>
        </fieldset>

        <button type="submit" disabled={status.loading}>
          {status.loading ? 'Buscando…' : 'Guardar y buscar vacantes'}
        </button>
      </form>

      <div aria-live="polite" role="status">
        {status.error ? (
          <p className="error" role="alert">
            {status.error}
          </p>
        ) : null}
      </div>

      {result ? <ExplorationResultView result={result} /> : null}

      {result ? <NoMatchPanel result={result} roadmap={roadmap} /> : null}

      {result ? (
        <SavedSearchesPanel
          searches={searches}
          searchLabel={searchLabel}
          onLabelChange={setSearchLabel}
          onSave={onSaveSearch}
          onDelete={onDeleteData}
          message={savedMessage}
        />
      ) : null}
    </section>
  );
}

function ExplorationResultView({ result }: { result: ExplorationResult }) {
  const { summary } = result;
  return (
    <div className="result">
      <h3>Vacantes para ti</h3>
      <p className="hint">
        Revisadas: {summary.considered} · Compatibles: {summary.matched} · Descartadas: {summary.excluded} ·
        Desactualizadas (más de {DEFAULT_MAX_AGE_HOURS} h): {summary.stale}
      </p>

      {result.matches.length === 0 ? (
        <p className="hint">No encontramos vacantes compatibles con tus preferencias.</p>
      ) : (
        <table>
          <caption className="hint">Vacantes compatibles con procedencia, frescura y motivo de coincidencia.</caption>
          <thead>
            <tr>
              <th scope="col">Vacante</th>
              <th scope="col">Modalidad</th>
              <th scope="col">Ubicación</th>
              <th scope="col">Salario</th>
              <th scope="col">Frescura</th>
              <th scope="col">Fuente</th>
              <th scope="col">Puntaje</th>
            </tr>
          </thead>
          <tbody>
            {result.matches.map((match) => (
              <tr key={match.vacancy.jobId}>
                <td>
                  <strong>{match.vacancy.title}</strong>
                  <div className="hint">{match.vacancy.company ?? 'Empresa no indicada'}</div>
                  <ul className="warnings">
                    {match.matchReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </td>
                <td>{MODALITY_LABELS[match.vacancy.modality] ?? match.vacancy.modality}</td>
                <td>{match.vacancy.location.raw ?? match.vacancy.location.district ?? '—'}</td>
                <td>
                  {money(match.vacancy.salary.minUsd)} – {money(match.vacancy.salary.maxUsd)}
                </td>
                <td>{match.freshness.label}</td>
                <td>
                  {match.provenance.provider}
                  <div className="hint">
                    <a href={match.provenance.sourceUrl} target="_blank" rel="noreferrer">
                      Ver vacante original
                    </a>
                  </div>
                </td>
                <td>{match.matchScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result.excluded.length > 0 ? (
        <>
          <h4>Vacantes descartadas</h4>
          <table>
            <caption className="hint">Cada vacante descartada con el motivo explícito.</caption>
            <thead>
              <tr>
                <th scope="col">Vacante</th>
                <th scope="col">Motivo</th>
                <th scope="col">Detalle</th>
                <th scope="col">Frescura</th>
              </tr>
            </thead>
            <tbody>
              {result.excluded.map((entry) => (
                <tr key={entry.jobId}>
                  <td>{entry.jobId}</td>
                  <td>{EXCLUSION_LABELS[entry.reason] ?? entry.reason}</td>
                  <td>{entry.detail}</td>
                  <td>{entry.freshness.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <h4>Preferencias guardadas</h4>
      <p className="hint">
        Contrato(s): {result.preferences.contract_types.map((type) => CONTRACT_LABELS[type] ?? type).join(', ')} ·
        Transporte: {result.preferences.transport_modes.join(', ')} · Curso:{' '}
        {result.preferences.willing_to_train ? 'sí' : 'no'} · Pasantía:{' '}
        {result.preferences.willing_to_intern ? 'sí' : 'no'}
      </p>
    </div>
  );
}

function CauseList({ causes }: { causes: NoMatchCause[] }) {
  if (causes.length === 0) return null;
  return (
    <ul className="warnings">
      {causes.map((cause) => (
        <li key={cause.reason}>
          {EXCLUSION_LABELS[cause.reason] ?? cause.reason}: {cause.count} vacante(s) — {cause.detail}
        </li>
      ))}
    </ul>
  );
}

function NearMatchesTable({ nearMatches }: { nearMatches: NearMatch[] }) {
  if (nearMatches.length === 0) return null;
  return (
    <>
      <h5>Opciones cercanas (bloqueadas por una sola restricción)</h5>
      <p className="hint">
        No son compatibles: cada una incumple exactamente una restricción declarada, que se muestra como advertencia.
      </p>
      <table>
        <caption className="hint">Vacantes cercanas con la restricción que las bloqueó.</caption>
        <thead>
          <tr>
            <th scope="col">Vacante</th>
            <th scope="col">Restricción</th>
            <th scope="col">Advertencia</th>
            <th scope="col">Cercanía</th>
          </tr>
        </thead>
        <tbody>
          {nearMatches.map((near) => (
            <tr key={near.vacancy.jobId}>
              <td>
                <strong>{near.vacancy.title}</strong>
                <div className="hint">{near.vacancy.company ?? 'Empresa no indicada'}</div>
              </td>
              <td>{EXCLUSION_LABELS[near.blockedBy] ?? near.blockedBy}</td>
              <td>
                <ul className="warnings">
                  {near.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </td>
              <td>{near.proximity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function RoadmapPanel({ roadmap, gaps }: { roadmap: Roadmap; gaps: TrainingGap[] }) {
  return (
    <div className="result" aria-labelledby="roadmap-heading">
      <h4 id="roadmap-heading">Ruta de capacitación</h4>
      <p className="hint">
        No hay una vacante viable ahora. Esta ruta se construyó con el catálogo de capacitación en caché para cerrar
        las brechas detectadas.
      </p>
      {gaps.length > 0 ? (
        <p className="hint">Brechas consideradas: {gaps.map((gap) => gap.label ?? gap.skillId).join(', ')}.</p>
      ) : null}
      {roadmap.recommendations.length > 0 ? (
        <table>
          <caption className="hint">Oportunidades recomendadas, con la brecha que cubren y su fuente.</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Oportunidad</th>
              <th scope="col">Proveedor</th>
              <th scope="col">Cubre</th>
              <th scope="col">Costo</th>
              <th scope="col">Duración</th>
            </tr>
          </thead>
          <tbody>
            {roadmap.recommendations.map((recommendation) => (
              <tr key={recommendation.rank}>
                <td>{recommendation.rank}</td>
                <td>
                  <strong>{recommendation.opportunity.title}</strong>
                  <div className="hint">{recommendation.explanationEs}</div>
                </td>
                <td>{recommendation.opportunity.provider}</td>
                <td>{recommendation.coveredGaps.map((gap) => gap.skillId).join(', ')}</td>
                <td>USD {recommendation.opportunity.costUsd}</td>
                <td>{recommendation.opportunity.durationHours} h</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="hint">
          El catálogo no ofrece una oportunidad elegible para las brechas detectadas todavía.
        </p>
      )}
      {roadmap.unresolvedGaps.length > 0 ? (
        <p className="hint">
          Brechas sin cubrir en el catálogo: {roadmap.unresolvedGaps.map((gap) => gap.label ?? gap.skillId).join(', ')}.
        </p>
      ) : null}
    </div>
  );
}

function NoMatchPanel({ result, roadmap }: { result: ExplorationResult; roadmap: Roadmap | null }) {
  if (result.matches.length > 0 || !result.noMatch) return null;
  return (
    <div role="alert" className="warning-panel">
      <h4>No encontramos una vacante viable</h4>
      <p>{result.noMatch.explanation}</p>
      <CauseList causes={result.noMatch.causes} />
      <NearMatchesTable nearMatches={result.noMatch.nearMatches} />
      {roadmap ? <RoadmapPanel roadmap={roadmap} gaps={roadmap.gaps} /> : null}
    </div>
  );
}

function SavedSearchesPanel({
  searches,
  searchLabel,
  onLabelChange,
  onSave,
  onDelete,
  message,
}: {
  searches: SavedSearchView[];
  searchLabel: string;
  onLabelChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  message: string | null;
}) {
  return (
    <div className="result" aria-labelledby="saved-searches-heading">
      <h4 id="saved-searches-heading">Búsquedas guardadas</h4>
      <p className="hint">
        Guarda esta búsqueda y vuelve más tarde: aquí verás las coincidencias nuevas que aparecieron después.
      </p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="search-label">Nombre de la búsqueda</label>
          <input
            id="search-label"
            type="text"
            value={searchLabel}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder="Atención al cliente en Panamá"
          />
        </div>
        <button type="button" onClick={onSave} disabled={searchLabel.trim().length === 0}>
          Guardar búsqueda
        </button>
        <button type="button" onClick={onDelete} className="danger">
          Eliminar mis datos
        </button>
      </div>
      <div aria-live="polite" role="status">
        {message ? <p className="hint">{message}</p> : null}
      </div>

      {searches.length === 0 ? (
        <p className="hint">Todavía no tienes búsquedas guardadas.</p>
      ) : (
        <ul>
          {searches.map((view) => (
            <li key={view.search.searchId}>
              <strong>{view.search.label}</strong>
              <div className="hint">
                Guardada el {view.search.savedAt} · Coincidencias actuales: {view.matches.length} · Nuevas desde
                entonces: {view.newSinceSaved.length}
              </div>
              {view.newSinceSaved.length > 0 ? (
                <ul className="warnings">
                  {view.newSinceSaved.map((match) => (
                    <li key={match.vacancy.jobId}>
                      Nueva: {match.vacancy.title} ({match.vacancy.company ?? 'Empresa no indicada'})
                    </li>
                  ))}
                </ul>
              ) : null}
              {view.matches.length > 0 ? (
                <div className="hint">Coincidencias: {view.matches.map((match) => match.vacancy.title).join(', ')}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
