'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { isValidEmail, MAGIC_LINK_COOLDOWN_SECONDS } from '../../lib/auth-forms';
import { POST_AUTH_ENTRY, postAuthDestination, registerHref, sanitizeNext } from '../../lib/auth-navigation';
import { authClient, signIn } from '../../lib/auth-client';
import '../styles/auth.css';

interface SignInFormProps {
  next: string;
  /** Set by the magic-link callback when the link was invalid or expired. */
  linkError?: boolean;
}

export function SignInForm({ next, linkError = false }: SignInFormProps) {
  const callbackURL = next !== '/' && sanitizeNext(next, '') ? next : POST_AUTH_ENTRY;
  const errorParams = new URLSearchParams();
  if (callbackURL !== POST_AUTH_ENTRY) errorParams.set('next', callbackURL);
  errorParams.set('error', 'enlace');
  const errorCallbackURL = `/ingresar?${errorParams.toString()}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(linkError ? 'Ese enlace ya no sirve. Pide uno nuevo y vuelve a intentar.' : null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState<'google' | 'link' | 'password' | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function continueWithGoogle() {
    setPending('google');
    setMessage(null);
    try {
      const result = await signIn.social({ provider: 'google', callbackURL });
      if (result?.error) throw new Error(result.error.message);
    } catch {
      setPending(null);
      setMessage('No pudimos abrir Google. Prueba con tu correo.');
    }
  }

  async function requestMagicLink(target: string) {
    setPending('link');
    setMessage(null);
    try {
      const result = await signIn.magicLink({ email: target, callbackURL, errorCallbackURL });
      if (result.error) throw new Error(result.error.message);
      setSentTo(target);
      setCooldown(MAGIC_LINK_COOLDOWN_SECONDS);
    } catch {
      setMessage('No pudimos enviar el enlace. Intenta de nuevo en un momento.');
    } finally {
      setPending(null);
    }
  }

  function submitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = email.trim().toLowerCase();
    if (!isValidEmail(target)) {
      setEmailError('Escribe un correo válido, por ejemplo ana@correo.com.');
      emailRef.current?.focus();
      return;
    }
    setEmailError(null);
    void requestMagicLink(target);
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('password');
    setMessage(null);
    try {
      const result = await signIn.email({ email: email.trim(), password });
      if (result.error) {
        setPending(null);
        setMessage('Correo o contraseña incorrectos.');
        return;
      }
      const session = await authClient.getSession();
      const role = (session.data?.user as { role?: string } | undefined)?.role
        ?? (result.data?.user as { role?: string } | undefined)?.role;
      window.location.assign(postAuthDestination(role, next));
    } catch {
      setPending(null);
      setMessage('No pudimos ingresar en este momento. Intenta otra vez.');
    }
  }

  const busy = pending !== null;

  return (
    <section className="signin-page">
      <div className="signin-hero">
        <h1><mark>Guarda tu avance</mark></h1>
        <p className="lead">Crea tu cuenta para postular y volver cuando quieras. Lo que ya me contaste se queda contigo.</p>
      </div>
      <div className="signin-card">
        {sentTo ? (
          <div className="link-sent" role="status">
            <h2>Revisa tu correo</h2>
            <p>Te enviamos un enlace a <strong>{sentTo}</strong>. Ábrelo en este dispositivo para entrar.</p>
            <div className="link-sent-actions">
              <button type="button" className="link-button" disabled={cooldown > 0 || busy} onClick={() => void requestMagicLink(sentTo)}>
                {cooldown > 0 ? `Reenviar enlace en ${cooldown} s` : 'Reenviar enlace'}
              </button>
              <button type="button" className="link-button" onClick={() => { setSentTo(null); setCooldown(0); }}>
                Usar otro correo
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-stack">
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => void continueWithGoogle()} disabled={busy}>
              {pending === 'google' ? 'Abriendo Google…' : 'Continuar con Google'}
            </Button>
            <p className="auth-divider" aria-hidden="true">o</p>
            <form className="auth-stack" onSubmit={submitMagicLink} noValidate>
              <div className="auth-field">
                <label htmlFor="signin-email">Correo</label>
                <Input
                  id="signin-email"
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? 'signin-email-error' : undefined}
                />
                {emailError ? <p id="signin-email-error" className="field-error">{emailError}</p> : null}
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {pending === 'link' ? 'Enviando…' : 'Enviarme un enlace'}
              </Button>
            </form>
            <details className="auth-disclosure" open={passwordOpen} onToggle={(event) => setPasswordOpen(event.currentTarget.open)}>
              <summary>Prefiero usar mi contraseña</summary>
              <form className="auth-stack" onSubmit={signInWithPassword}>
                <div className="auth-field">
                  <label htmlFor="signin-password">Contraseña</label>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={busy || !email.trim()}>
                  {pending === 'password' ? 'Ingresando…' : 'Ingresar'}
                </Button>
                {!email.trim() ? <p className="account-hint">Escribe tu correo arriba para usar la contraseña.</p> : null}
              </form>
            </details>
          </div>
        )}
        {message ? <p role="alert" className="error">{message}</p> : null}
        <p className="account-switch">
          ¿Eres orientador/a o empresa?{' '}
          <button type="button" className="link-button" onClick={() => { setSentTo(null); setPasswordOpen(true); }}>
            Ingresa aquí
          </button>
        </p>
        <p className="account-switch">
          ¿Primera vez? <Link href={registerHref(next)}>Crear cuenta</Link>
        </p>
      </div>
    </section>
  );
}
