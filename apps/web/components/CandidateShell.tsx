'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BriefcaseBusiness, CircleUserRound, FileText, Map, Route } from 'lucide-react';
import type { ReactNode } from 'react';

function isBarePath(pathname: string) {
  if (pathname === '/' || pathname === '/chat') return true;
  return ['/ingresar', '/orientador', '/empresa'].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const navigation = [
  { href: '/vacantes', label: 'Vacantes', icon: BriefcaseBusiness },
  { href: '/ruta', label: 'Mi ruta', icon: Route },
  { href: '/postulaciones', label: 'Postulaciones', icon: FileText },
  { href: '/perfil', label: 'Mi perfil', icon: CircleUserRound },
];

export function CandidateShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isCandidateSurface = !isBarePath(pathname);

  if (!isCandidateSurface) return <>{children}</>;

  return (
    <div className="candidate-shell">
      <header className="candidate-header">
        <Link className="candidate-brand" href="/vacantes" aria-label="Puente Laboral, ir a Vacantes">
          <span className="candidate-brand-mark" aria-hidden="true"><Map /></span>
          <span>Puente Laboral</span>
        </Link>
        <nav aria-label="Navegación principal">
          <ul className="candidate-nav candidate-nav-desktop">
            {navigation.map(({ href, label, icon: Icon }) => (
              <li key={href}><NavLink href={href} label={label} Icon={Icon} active={pathname === href || pathname.startsWith(`${href}/`)} /></li>
            ))}
          </ul>
        </nav>
      </header>
      <div className="candidate-content">{children}</div>
      <nav className="candidate-bottom-nav" aria-label="Navegación móvil">
        <ul className="candidate-nav">
          {navigation.map(({ href, label, icon: Icon }) => (
            <li key={href}><NavLink href={href} label={label} Icon={Icon} active={pathname === href || pathname.startsWith(`${href}/`)} /></li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function NavLink({ href, label, Icon, active }: { href: string; label: string; Icon: typeof Map; active: boolean }) {
  return <Link href={href} className={`candidate-nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
    <Icon aria-hidden="true" />
    <span>{label}</span>
  </Link>;
}
