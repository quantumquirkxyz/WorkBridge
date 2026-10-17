import type { Metadata } from 'next';
import Link from 'next/link';
import { SignOutButton } from '../../../components/SignOutButton';
import { Button } from '../../../components/ui/button';
import { getServerSession } from '../../../lib/auth';
import { isAuthRole } from '../../../lib/auth-types';
import { roleHomePath, roleLabel, signInHref } from '../../../lib/auth-navigation';
import '../../styles/auth.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sin acceso' };

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.rol) ? params.rol[0] : params.rol;
  const session = await getServerSession();
  const role = session?.user.role;
  const signedIn = Boolean(session) && isAuthRole(role);

  return (
    <div className="fallback-page">
      <section className="fallback-card" aria-labelledby="no-access-title">
        <span className="fallback-code" aria-hidden="true">403</span>
        <h1 id="no-access-title">Sin acceso</h1>
        <p>
          No tienes acceso a esta página
          {requested === 'counselor' ? ' (es solo para orientadores/as)' : requested === 'employer' ? ' (es solo para empresas)' : ''}.
          {signedIn ? ` Tu cuenta es de tipo ${roleLabel(role).toLowerCase()}.` : ' Ingresa con la cuenta correcta para continuar.'}
        </p>
        <div className="fallback-actions">
          {signedIn ? (
            <>
              <Button asChild size="lg"><Link href={roleHomePath(role)}>Ir a mi panel</Link></Button>
              <SignOutButton variant="secondary" size="lg" />
            </>
          ) : (
            <Button asChild size="lg"><Link href={signInHref()}>Ingresar</Link></Button>
          )}
        </div>
      </section>
    </div>
  );
}
