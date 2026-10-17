import type { Roadmap, TrainingGap } from '@puente/training';

export function RoadmapList({ roadmap, gaps }: { roadmap: Roadmap; gaps: TrainingGap[] }) {
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
