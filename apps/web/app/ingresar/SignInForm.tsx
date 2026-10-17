'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { signIn } from '../../lib/auth-client';

export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function continueWithGoogle() {
    setIsPending(true);
    setStatus(null);
    await signIn.social({ provider: 'google', callbackURL: next });
    setIsPending(false);
  }

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setStatus(null);
    const result = await signIn.magicLink({ email, callbackURL: next });
    setIsPending(false);
    setStatus(result.error ? 'No se pudo enviar el enlace. Intenta otra vez.' : 'Revisa tu email para continuar.');
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1>Ingresar</h1>
        <p className="lead">Continúa con tu cuenta para guardar avances o postular.</p>
      </div>
      <Button type="button" onClick={continueWithGoogle} disabled={isPending}>
        Continuar con Google
      </Button>
      <form className="flex flex-col gap-3" onSubmit={sendMagicLink}>
        <label className="text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Button type="submit" variant="secondary" disabled={isPending}>
          Enviar enlace mágico
        </Button>
      </form>
      {status ? <p role="status">{status}</p> : null}
    </section>
  );
}
