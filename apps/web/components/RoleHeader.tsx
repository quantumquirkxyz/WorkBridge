'use client';

import Link from 'next/link';
import { roleLabel } from '../lib/auth-navigation';
import { BrandMark } from './BrandMark';
import { SignOutButton } from './SignOutButton';
import { ThemeToggle } from './theme-provider';

export type ChromeRole = 'counselor' | 'employer';

/** Lightweight chrome for /orientador and /empresa: brand, role badge, theme toggle, sign-out. */
export function RoleHeader({ role }: { role: ChromeRole }) {
  const home = role === 'employer' ? '/empresa' : '/orientador';
  return (
    <header className="role-header">
      <div className="role-header-start">
        <Link className="candidate-brand" href={home} aria-label={`WorkBridge, ir a ${role === 'employer' ? 'Postulaciones' : 'Pendientes'}`}>
          <BrandMark className="candidate-brand-mark" />
          <span>WorkBridge</span>
        </Link>
        <span className={`role-badge role-badge-${role}`}>{roleLabel(role)}</span>
      </div>
      <div className="header-tools">
        <ThemeToggle />
        <SignOutButton size="sm" />
      </div>
    </header>
  );
}
