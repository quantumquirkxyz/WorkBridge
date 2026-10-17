import type { ExplorationResult } from '@workbridge/catalog';
import { discardSentence } from '../../lib/exploration-view';
import '../../app/styles/explore.css';

/** One summary line, grouped by cause. Individual internal vacancy ids are never shown. */
export function DiscardSummary({ result }: { result: ExplorationResult }) {
  const sentence = discardSentence(result.excluded);
  if (!sentence) return null;
  return <p className="xp-discard">{sentence}</p>;
}
