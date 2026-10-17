'use client';

import { useState } from 'react';
import type { ContractType, TransportMode, WorkModality } from '@puente/domain';
import { CONTRACT_LABELS, DEFAULT_MAX_AGE_HOURS, MODALITY_LABELS, type ExplorationResult } from '@puente/catalog';

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

const EXCLUSION_LABELS: Record<string, string> = {
  stale: 'Desactualizada',
  modality: 'Modalidad',
  location: 'Ubicación',
  salary: 'Salario',
  contract: 'Contrato',
  schedule: 'Horario',
};

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

  function toggle<T>(list: T[], value: T, setter: (next: T[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ loading: true });

    const roles = targetRoles
      .split(',')
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    const payload = {
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

    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ExplorationResult | { error?: string; details?: string[] };
      if (!response.ok) {
        const details = 'details' in body && Array.isArray(body.details) ? body.details.join(' ') : '';
        setResult(null);
        setStatus({ loading: false, error: details || `No se pudo explorar vacantes (HTTP ${response.status}).` });
        return;
      }
      setResult(body as ExplorationResult);
      setStatus({ loading: false });
    } catch (error) {
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      });
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
