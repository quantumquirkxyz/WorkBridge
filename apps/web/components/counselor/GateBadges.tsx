import { AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { GateReason } from '../../lib/api/applications';
import { GATE_LABELS } from './labels';

export function GateBadges({ reasons }: { reasons: GateReason[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Motivos de revisión">
      {reasons.map((reason) => (
        <li key={`${reason.code}-${reason.detail}`}>
          <Badge tone="warning">
            <AlertTriangle className="mr-1 size-3" aria-hidden="true" />
            {GATE_LABELS[reason.code]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
