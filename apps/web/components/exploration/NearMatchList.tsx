import { EXCLUSION_LABELS, type NearMatch } from '@puente/catalog';

export function NearMatchList({ nearMatches }: { nearMatches: NearMatch[] }) {
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
