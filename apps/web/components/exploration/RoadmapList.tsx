import type { Roadmap, TrainingGap } from '@workbridge/training';
import { formatCost } from '../../lib/exploration-view';
import '../../app/styles/explore.css';

const gapName = (gap: TrainingGap) => gap.label ?? 'Otra habilidad';

/** S6 steps: numbered, vertical connector, never a table. */
export function RoadmapList({ roadmap }: { roadmap: Roadmap }) {
  const labelFor = new Map<string, string>();
  for (const gap of [...roadmap.gaps, ...roadmap.unresolvedGaps]) labelFor.set(gap.skillId, gapName(gap));
  return (
    <>
      <ol className="xp-steps" aria-label="Pasos de tu ruta">
        {roadmap.recommendations.map((step) => (
          <li key={step.rank} className="xp-step">
            <span className="xp-step-num" aria-hidden="true">{step.rank}</span>
            <div className="xp-step-body">
              <h3><span className="sr-only">Paso {step.rank}: </span>{step.opportunity.title}</h3>
              <div className="xp-step-meta">
                <span className="xp-chip xp-chip-plain">{step.opportunity.provider}</span>
                <span className="xp-chip xp-chip-yellow">{step.opportunity.durationHours} h</span>
                <span className="xp-chip xp-chip-mint">{formatCost(step.opportunity.costUsd)}</span>
              </div>
              {step.coveredGaps.length > 0 ? (
                <p className="xp-step-covers">
                  <strong>Cubre:</strong>
                  {step.coveredGaps.map((gap) => <span key={gap.skillId} className="xp-chip xp-chip-plain">{labelFor.get(gap.skillId) ?? 'Otra habilidad'}</span>)}
                </p>
              ) : null}
              <p className="xp-step-why">{step.explanationEs}</p>
              <p className="xp-step-why"><a className="xp-course-link" href={step.opportunity.url} target="_blank" rel="noreferrer">Ver curso <span className="sr-only">(se abre en otra pestaña)</span>↗</a></p>
            </div>
          </li>
        ))}
      </ol>
      {roadmap.unresolvedGaps.length > 0 ? (
        <div className="xp-panel">
          <h3 className="xp-section-title" style={{ fontSize: '1rem' }}>Todavía sin curso</h3>
          <ul className="xp-skill-list">
            {roadmap.unresolvedGaps.map((gap) => <li key={gap.skillId} className="xp-chip xp-chip-plain">{gapName(gap)}</li>)}
          </ul>
        </div>
      ) : null}
    </>
  );
}
