import {
  CONTRACT_LABELS,
  DEFAULT_MAX_AGE_HOURS,
  MODALITY_LABELS,
  type ExplorationResult,
} from '@puente/catalog';
import { DiscardSummary } from './DiscardSummary';
import { money } from './utils';

export function VacancyList({ result }: { result: ExplorationResult }) {
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
