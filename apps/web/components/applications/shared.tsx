'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, CircleCheck, CircleDot, CircleX, FileEdit, Hourglass, Send, UserCheck } from 'lucide-react';
import { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  STATUS_PRESENTATION,
  errorCopy,
  signInHref,
  type ApplicationStatus,
  type ErrorCopy,
} from '../../lib/applications-status';
import '../../app/styles/applications.css';

const STATUS_ICONS = {
  rejected: CircleX,
  interview_approved: UserCheck,
  interview_rejected: CircleDot,
  sent: Send,
  draft: FileEdit,
  counselor_review: Hourglass,
  ready: CircleCheck,
} as const;

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, tone } = STATUS_PRESENTATION[status];
  const Icon = STATUS_ICONS[status];
  return (
    <Badge tone={tone} className="sticker-tag app-status-badge">
      <Icon className="mr-1 size-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}

/** Current path + query, used as the `?next=` target so the interrupted action resumes after sign-in. */
export function useCurrentNext(): string {
  const pathname = usePathname();
  if (typeof window === 'undefined') return pathname;
  return `${pathname}${window.location.search}`;
}

/** Redirects to /ingresar?next=... as soon as an error maps to the sign-in action. */
export function useSignInRedirect(error: unknown): ErrorCopy | null {
  const router = useRouter();
  const next = useCurrentNext();
  const copy = error ? errorCopy(error) : null;
  const needsSignIn = copy?.action === 'sign_in';
  useEffect(() => {
    if (needsSignIn) router.replace(signInHref(next));
  }, [needsSignIn, next, router]);
  return copy;
}

export function QueryFailure({ error, onRetry, title }: { error: unknown; onRetry: () => void; title: string }) {
  const copy = useSignInRedirect(error);
  const next = useCurrentNext();
  return (
    <section className="app-failure" role="alert" aria-labelledby="app-failure-title">
      <AlertTriangle className="app-failure-icon" aria-hidden="true" />
      <div className="grid gap-1">
        <h2 id="app-failure-title" className="app-failure-title">{title}</h2>
        <p>{copy?.message}</p>
      </div>
      <div className="app-failure-actions">
        {copy?.action === 'sign_in' ? (
          <Button asChild><Link href={signInHref(next)}>Ingresar</Link></Button>
        ) : copy?.action === 'home' ? (
          <Button asChild><Link href="/">Ir al inicio</Link></Button>
        ) : (
          <Button type="button" onClick={onRetry}>Reintentar</Button>
        )}
      </div>
    </section>
  );
}
