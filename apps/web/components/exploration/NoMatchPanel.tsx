import { EXCLUSION_LABELS, type ExplorationResult, type NoMatchCause } from '@workbridge/catalog';
import type { Roadmap } from '@workbridge/training';
import { NearMatchList } from './NearMatchList';
import { RoadmapList } from './RoadmapList';
import Link from 'next/link';

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

export function NoMatchPanel({
  result,
  roadmap,
  onEnableTraining,
}: {
  result: ExplorationResult;
  roadmap: Roadmap | null;
  onEnableTraining?: () => void;
}) {
  if (result.matches.length > 0 || !result.noMatch) return null;
  const trainingDisabled = !result.preferences.willing_to_train;
  return (
    <div role="alert" className="warning-panel">
      <h4>No encontramos una vacante viable</h4>
      <p>{result.noMatch.explanation}</p>
      <CauseList causes={result.noMatch.causes} />
      <NearMatchList nearMatches={result.noMatch.nearMatches} />
      {trainingDisabled ? (
        <div className="no-match-actions">
          <p>
            Indicaste que no deseas tomar cursos, por eso no generamos una ruta de capacitación. Puedes cambiar esta
            preferencia y volver a buscar para recibir recomendaciones.
          </p>
          {onEnableTraining ? (
            <button type="button" className="ruta-action" onClick={onEnableTraining}>
              Activar capacitación y buscar de nuevo
            </button>
          ) : null}
        </div>
      ) : roadmap ? <RoadmapList roadmap={roadmap} gaps={roadmap.gaps} /> : null}
      <p className="no-match-route-link">
        <Link href="#preferencias">Ajustar mis preferencias</Link>
        {result.noMatch.roadmapRequested ? (
          <> · <Link href="/ruta">Ver mi ruta de capacitación</Link></>
        ) : null}
      </p>
    </div>
  );
}
