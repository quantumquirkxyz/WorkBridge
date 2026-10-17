import type { Metadata } from 'next';
import Link from 'next/link';
import { SignOutButton } from '../../components/SignOutButton';
import { Button } from '../../components/ui/button';
import { needsAccount } from '../../lib/account-access';
import { getServerSession } from '../../lib/auth';
import { registerHref, roleHomePath, roleLabel, signInHref } from '../../lib/auth-navigation';
import '../styles/auth.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mi cuenta' };

export default async function AccountPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user || needsAccount(user)) {
    return (
      <section className="signin-page">
        <div className="signin-hero">
          <h1><mark>Tu cuenta</mark></h1>
          <p className="lead">
            {user
              ? 'Estás usando WorkBridge como invitado. Crea tu cuenta para guardar tu avance y postular.'
              : 'Ingresa o crea tu cuenta para guardar tu avance, o sigue como invitado.'}
          </p>
        </div>
        <div className="signin-card">
          <Link className="auth-nav-link auth-nav-link-signup auth-nav-link-block" href={registerHref('/cuenta')}>Crear cuenta</Link>
          <Link className="auth-nav-link auth-nav-link-block" href={signInHref('/cuenta')}>Ingresar</Link>
          <Link className="back-link" href="/chat">Seguir como invitado</Link>
          {user ? <p className="account-hint">Si ya tienes cuenta, al ingresar vinculamos esta sesión a ella y no pierdes lo que ya me contaste.</p> : null}
        </div>
      </section>
    );
  }

  const role = user.role;
  return (
    <section className="account-page">
      <div className="page-head">
        <h1>Mi cuenta</h1>
      </div>
      <div className="account-card">
        <dl className="account-list">
          <div><dt>Correo</dt><dd>{user.email}</dd></div>
          <div><dt>Tipo de cuenta</dt><dd>{roleLabel(role)}</dd></div>
        </dl>
        <div className="account-actions">
          <Button asChild size="lg"><Link href={roleHomePath(role)}>Ir a mi panel</Link></Button>
          <SignOutButton variant="secondary" size="lg" />
        </div>
      </div>
      {role === 'candidate' ? (
        <div className="account-card">
          <h2 className="font-display text-lg uppercase">Mis datos</h2>
          <p>Puedes revisar lo que sabemos de ti o eliminar todos tus datos desde Mi perfil.</p>
          <div className="account-actions">
            <Button asChild variant="outline"><Link href="/perfil">Ver o eliminar mis datos</Link></Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
