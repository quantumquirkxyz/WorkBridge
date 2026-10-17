'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BriefcaseBusiness, Compass, FileText, Map, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { PublicHeader } from './PublicHeader';
import { RoleHeader } from './RoleHeader';
import { ThemeToggle } from './theme-provider';

const ACCOUNT_PATHS = ['/ingresar', '/registrarse', '/cuenta'];

function roleChromeFor(pathname: string): 'counselor' | 'employer' | null {
  if (pathname === '/orientador' || pathname.startsWith('/orientador/')) return 'counselor';
  if (pathname === '/empresa' || pathname.startsWith('/empresa/')) return 'employer';
  return null;
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const CANDIDATE_PATHS = ['/vacantes', '/ruta', '/postulaciones', '/perfil'];

// Allow-list, not a deny-list: an unknown URL (404) must not render the candidate nav.
function isCandidatePath(pathname: string) {
  return CANDIDATE_PATHS.some((path) => isActivePath(pathname, path));
}

function showsPublicHeader(pathname: string) {
  if (pathname === '/' || pathname === '/chat') return true;
  return ACCOUNT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const navigation = [
  { href: '/vacantes', label: 'Vacantes', icon: BriefcaseBusiness },
  { href: '/ruta', label: 'Mi ruta', icon: Compass },
  { href: '/postulaciones', label: 'Postulaciones', icon: FileText },
  { href: '/perfil', label: 'Mi perfil', icon: UserRound },
];

export function CandidateShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const [newCount, setNewCount] = useState(0);
  useEffect(() => {
    if (pathname === '/vacantes') return;
    fetch('/api/candidate')
      .then((response) => response.ok ? response.json() : null)
      .then((candidate: { candidateId?: string } | null) => candidate?.candidateId ? fetch(`/api/searches?candidateId=${encodeURIComponent(candidate.candidateId)}`) : null)
      .then((response) => response && response.ok ? response.json() : null)
      .then((body: { searches?: Array<{ newSinceLastVisit?: unknown[] }> } | null) => setNewCount(body?.searches?.reduce((total, view) => total + (view.newSinceLastVisit?.length ?? 0), 0) ?? 0))
      .catch(() => undefined);
  }, [pathname]);
  const isCandidateSurface = isCandidatePath(pathname);

  const roleChrome = roleChromeFor(pathname);
  if (roleChrome) {
    return (
      <>
        <RoleHeader role={roleChrome} />
        {children}
      </>
    );
  }

  if (!isCandidateSurface) {
    if (!showsPublicHeader(pathname)) return <>{children}</>;
    return (
      <>
        <PublicHeader />
        {children}
      </>
    );
  }

  return (
    <div className="candidate-shell">
      <header className="candidate-header">
        <Link className="candidate-brand" href="/vacantes" aria-label="WorkBridge, ir a Vacantes">
          <span className="candidate-brand-mark" aria-hidden="true"><Map /></span>
          <span>WorkBridge</span>
        </Link>
        <nav aria-label="Navegación principal">
          <ul className="candidate-nav candidate-nav-desktop">
            {navigation.map(({ href, label, icon: Icon }) => (
              <li key={href}><NavLink href={href} label={label} Icon={Icon} badge={href === '/vacantes' ? newCount : 0} active={isActivePath(pathname, href)} /></li>
            ))}
          </ul>
        </nav>
        <div className="header-tools"><ThemeToggle /></div>
      </header>
      <div className="candidate-content">{children}</div>
      <nav className="candidate-bottom-nav" aria-label="Navegación móvil">
        <ul className="candidate-nav">
          {navigation.map(({ href, label, icon: Icon }) => (
            <li key={href}><NavLink href={href} label={label} Icon={Icon} badge={href === '/vacantes' ? newCount : 0} active={isActivePath(pathname, href)} /></li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function NavLink({ href, label, Icon, badge, active }: { href: string; label: string; Icon: typeof Map; badge: number; active: boolean }) {
  return <Link href={href} className={`candidate-nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
    <Icon aria-hidden="true" />
    <span>{label}{badge > 0 ? <span className="nav-badge" aria-label={`${badge} vacantes nuevas`}>{badge}</span> : null}</span>
  </Link>;
}
