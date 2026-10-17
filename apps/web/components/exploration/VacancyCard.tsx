import { forwardRef } from 'react';
import { MODALITY_LABELS, type VacancyMatch } from '@workbridge/catalog';
import type { MatchDecision } from '@workbridge/solver';
import { formatSalary, missingItems } from '../../lib/exploration-view';
import { ReadinessBar, ReadinessSkeleton } from './ReadinessBar';
import '../../app/styles/explore.css';

export interface VacancyCardProps {
  match: VacancyMatch;
  decision?: MatchDecision;
  decisionsLoading: boolean;
  isNew?: boolean;
  onOpen: (match: VacancyMatch) => void;
}

/** One vacancy as a single 44px+ target. Missing items are capped at two; the sheet lists them all. */
export const VacancyCard = forwardRef<HTMLButtonElement, VacancyCardProps>(function VacancyCard(
  { match, decision, decisionsLoading, isNew = false, onOpen },
  ref,
) {
  const { vacancy, freshness } = match;
  const missing = missingItems(decision, 2);
  const place = vacancy.location?.raw ?? vacancy.location?.district ?? 'Ubicación no indicada';
  return (
    <button ref={ref} type="button" className="xp-card" onClick={() => onOpen(match)} aria-label={`Ver detalles de ${vacancy.title}`}>
      <span className="xp-card-top">
        <span className="xp-card-chips">
          <span className="xp-chip">{MODALITY_LABELS[vacancy.modality]}</span>
          {isNew ? <span className="xp-chip xp-chip-mint">Nueva</span> : null}
        </span>
        <span>{freshness.label}</span>
      </span>
      <strong className="xp-card-title">{vacancy.title}</strong>
      <span className="xp-card-company">{vacancy.company ?? 'Empresa no indicada'}</span>
      <span className="xp-card-meta">{place} · {formatSalary(vacancy.salary?.minUsd ?? null, vacancy.salary?.maxUsd ?? null)}</span>
      {decisionsLoading ? <ReadinessSkeleton /> : decision ? <ReadinessBar score={decision.score} /> : null}
      {missing.length > 0 ? (
        <span className="xp-card-missing">
          <span className="xp-missing-label">Te falta:</span>
          {missing.map((item) => <span key={item} className="xp-card-missing-item">{item}</span>)}
        </span>
      ) : null}
      <span className="xp-card-cta"><span>Ver detalles →</span></span>
    </button>
  );
});
