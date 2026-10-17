'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map } from 'lucide-react';
import { needsAccount, panelForRole } from '../lib/account-access';
import { useSession } from '../lib/auth-client';
import { SignOutButton } from './SignOutButton';
import { ThemeToggle } from './theme-provider';
import { Button } from './ui/button';

export function PublicHeader() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const user = session?.user as { role?: string; isAnonymous?: boolean | null } | undefined;
  const identified = !isPending && !needsAccount(user);

  return (
    <header className="candidate-header public-header">
      <Link className="candidate-brand" href="/" aria-label="WorkBridge, ir al inicio">
        <span className="candidate-brand-mark" aria-hidden="true"><Map /></span>
        <span>WorkBridge</span>
      </Link>
      <nav className="public-header-actions" aria-label="Cuenta">
        {isPending ? null : identified ? (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={panelForRole(user?.role)}>Mi panel</Link>
            </Button>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link className="auth-nav-link" href="/ingresar" aria-current={pathname === '/ingresar' ? 'page' : undefined}>
              Ingresar
            </Link>
            <Link className="auth-nav-link auth-nav-link-signup" href="/registrarse" aria-current={pathname === '/registrarse' ? 'page' : undefined}>
              Registrarse
            </Link>
          </>
        )}
        <ThemeToggle />
      </nav>
    </header>
  );
}
