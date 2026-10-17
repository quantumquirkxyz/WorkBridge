import Link from 'next/link';
import { Button } from '../ui/button';
import { FAILURE_COPY, classifyFailure } from '../../lib/counselor-ui';
import '../../app/styles/roles.css';

interface QueryFailureProps {
  error: unknown;
  onRetry?: () => void;
  /** Where a 401 should send the person back after signing in. */
  nextPath: string;
  /** Replaces the copy for 403/404 (e.g. "not available for your organization"). */
  hiddenCopy?: string;
  fallbackCopy?: string;
  backHref?: string;
  backLabel?: string;
}

/** Error block for loads/actions: tailored copy per HTTP failure, sign-in link on 401, retry otherwise. */
export function QueryFailure({ error, onRetry, nextPath, hiddenCopy, fallbackCopy, backHref, backLabel }: QueryFailureProps) {
  const kind = classifyFailure(error);
  const hidden = kind === 'forbidden' || kind === 'not_found';
  const message =
    hidden && hiddenCopy ? hiddenCopy : kind === 'generic' && fallbackCopy ? fallbackCopy : FAILURE_COPY[kind];
  const retryable = kind === 'generic' || kind === 'unavailable';

  return (
    <div className="rl-failure">
      <p role="alert" className="error">{message}</p>
      <div className="rl-failure-actions">
        {kind === 'unauthenticated' ? (
          <Link className="back-link" href={`/ingresar?next=${encodeURIComponent(nextPath)}`}>Ir a ingresar</Link>
        ) : null}
        {retryable && onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>Reintentar</Button>
        ) : null}
        {backHref ? <Link className="back-link" href={backHref}>{backLabel ?? 'Volver'}</Link> : null}
      </div>
    </div>
  );
}
