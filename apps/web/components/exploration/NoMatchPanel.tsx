import Link from 'next/link';
import { EXCLUSION_LABELS, type ExplorationResult } from '@workbridge/catalog';
import { Button } from '../ui/button';
import '../../app/styles/explore.css';

/** S5: nothing viable. Explains why, offers the training route (J3) or turning training on. */
export function NoMatchPanel({
  result,
  onEnableTraining,
  enabling = false,
  enableError = null,
}: {
  result: ExplorationResult;
  onEnableTraining?: () => void;
  enabling?: boolean;
  enableError?: string | null;
}) {
  const noMatch = result.noMatch;
  const trainingOff = !result.preferences.willing_to_train;
  return (
    <section className="xp-panel xp-empty" aria-labelledby="nomatch-heading">
      <span className="xp-empty-icon" aria-hidden="true">🧭</span>
      <h2 id="nomatch-heading">Aún no encontramos una vacante para ti</h2>
      <p>{noMatch?.explanation ?? 'Ninguna vacante cumple con lo que pediste por ahora.'}</p>
      {noMatch && noMatch.causes.length > 0 ? (
        <div>
          <p><strong>Lo que más te bloqueó:</strong></p>
          <ul className="xp-causes">
            {noMatch.causes.map((cause) => (
              <li key={cause.reason}>
                <strong>{EXCLUSION_LABELS[cause.reason] ?? cause.reason}</strong> ({cause.count} {cause.count === 1 ? 'vacante' : 'vacantes'}). {cause.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {trainingOff ? (
        <div className="xp-empty">
          <p>Dijiste que no quieres tomar cursos, por eso no armamos una ruta. Si cambias de idea, te mostramos cursos para cerrar lo que te falta.</p>
          {onEnableTraining ? (
            <Button type="button" onClick={onEnableTraining} disabled={enabling}>
              {enabling ? 'Buscando…' : 'Me interesa tomar cursos'}
            </Button>
          ) : null}
          {enableError ? <p role="alert" className="xp-inline-error">{enableError}</p> : null}
        </div>
      ) : (
        <Button asChild size="lg"><Link href="/ruta">Ver mi ruta →</Link></Button>
      )}
      <Button asChild variant="outline"><Link href="/perfil">Ajustar mis preferencias</Link></Button>
    </section>
  );
}
