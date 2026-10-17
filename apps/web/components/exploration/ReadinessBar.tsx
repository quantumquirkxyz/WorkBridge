import { clampScore, readinessTone } from '../../lib/exploration-view';
import { Skeleton } from '../ui/skeleton';
import '../../app/styles/explore.css';

/** "Preparación" meter: colour is never the only signal, the percentage is always written. */
export function ReadinessBar({ score }: { score: number }) {
  const value = clampScore(score);
  return (
    <div className="xp-ready">
      <div className="xp-ready-label">
        <span>Preparación</span>
        <span>{value}%</span>
      </div>
      <div className="xp-ready-track" role="progressbar" aria-label="Preparación" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={`${value}%`}>
        <span className="xp-ready-fill" data-tone={readinessTone(value)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ReadinessSkeleton() {
  return <Skeleton className="xp-ready-skeleton" role="status" aria-label="Calculando tu preparación" />;
}
