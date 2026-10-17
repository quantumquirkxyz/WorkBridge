import { CircleCheck, CircleHelp, CircleX, FileText } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { CredentialStatus } from '../../lib/api/applications';
import { VERIFICATION_LABELS } from './labels';

const PRESENTATION = {
  verified: { tone: 'success', Icon: CircleCheck },
  declared: { tone: 'neutral', Icon: FileText },
  not_applicable: { tone: 'neutral', Icon: FileText },
  unverified: { tone: 'warning', Icon: CircleHelp },
  rejected: { tone: 'danger', Icon: CircleX },
} as const;

export function VerificationBadge({ status }: { status: CredentialStatus }) {
  const { tone, Icon } = PRESENTATION[status];
  return (
    <Badge tone={tone}>
      <Icon className="mr-1 size-3" aria-hidden="true" />
      {VERIFICATION_LABELS[status]}
    </Badge>
  );
}
