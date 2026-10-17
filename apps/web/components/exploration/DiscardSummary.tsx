import { EXCLUSION_LABELS, type ExplorationResult } from '@workbridge/catalog';

export function DiscardSummary({ result }: { result: ExplorationResult }) {
  if (result.excluded.length === 0) return null;
  return (
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
  );
}
