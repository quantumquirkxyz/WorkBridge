import {
  CONTRACT_LABELS,
  DEFAULT_MAX_AGE_HOURS,
  MODALITY_LABELS,
  type ExplorationResult,
} from '@puente/catalog';
import { DiscardSummary } from './DiscardSummary';
import { money, orderMatchesByDecision } from './utils';
import type { MatchDecision } from '@puente/solver';
import { Progress } from '../ui/progress';

export function VacancyList({ result, decisions = [], decisionsLoading = false }: { result: ExplorationResult; decisions?: MatchDecision[]; decisionsLoading?: boolean }) {
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
            {orderMatchesByDecision(result.matches, decisions, decisionsLoading).map((match) => (
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
                <td>{decisionsLoading ? <span aria-label="Cargando preparación" className="readiness-skeleton" /> : (() => { const decision = decisions.find((item) => item.vacancyId === match.vacancy.jobId); return decision ? <Readiness decision={decision} /> : '—'; })()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <DiscardSummary result={result} />

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

function Readiness({ decision }: { decision: MatchDecision }) {
  const missing = decision.hardConstraints.filter((constraint) => !constraint.satisfied).slice(0, 2);
  return <div className="readiness"><span>Preparación {decision.score}%</span><Progress value={decision.score} aria-label={`Preparación ${decision.score}%`} /><ul className="warnings">{missing.map((item) => <li key={item.id}>Te falta: {item.reason}</li>)}</ul></div>;
}
