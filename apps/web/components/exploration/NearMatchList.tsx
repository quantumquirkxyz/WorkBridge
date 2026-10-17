import { EXCLUSION_LABELS, type NearMatch } from '@workbridge/catalog';
import '../../app/styles/explore.css';

/** "Casi listas para ti": one blocking constraint each, no readiness bar, no table. */
export function NearMatchList({ nearMatches }: { nearMatches: NearMatch[] }) {
  if (nearMatches.length === 0) return null;
  return (
    <section aria-labelledby="near-heading">
      <h2 id="near-heading" className="xp-section-title">Casi listas para ti</h2>
      <p className="xp-muted" style={{ marginBottom: '.75rem' }}>Les falta una sola cosa. Si ajustas eso en tus preferencias, podrían encajar.</p>
      <ul className="xp-near-list">
        {nearMatches.map((near) => (
          <li key={near.vacancy.jobId} className="xp-near">
            <h3>{near.vacancy.title}{near.vacancy.company ? ` · ${near.vacancy.company}` : ''}</h3>
            <p><strong aria-hidden="true">⚠ </strong>Te bloquea: {near.warnings[0] ?? EXCLUSION_LABELS[near.blockedBy]}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
