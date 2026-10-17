'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { AccountType } from '../../lib/account-access';
import { REGISTER_FIELD_ORDER, validateRegisterFields } from '../../lib/auth-forms';
import type { RegisterField, RegisterFieldErrors } from '../../lib/auth-forms';
import { signInHref } from '../../lib/auth-navigation';
import '../styles/auth.css';

const accountTypes: Array<{ value: AccountType; title: string; body: string }> = [
  {
    value: 'student',
    title: 'Estudiante regular',
    body: 'Conversación, vacantes, ruta y perfil.',
  },
  {
    value: 'employer',
    title: 'Empresarial',
    body: 'Panel de postulaciones de la empresa.',
  },
];

export function RegisterForm({ next }: { next: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType | ''>('');
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function clear(field: RegisterField) {
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  function focusField(field: RegisterField) {
    const selector = field === 'accountType' ? 'input[name="accountType"]' : `#register-${field === 'confirmPassword' ? 'confirm' : field}`;
    formRef.current?.querySelector<HTMLElement>(selector)?.focus();
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const found = validateRegisterFields({ name, email, password, confirmPassword, accountType });
    setErrors(found);
    const first = REGISTER_FIELD_ORDER.find((field) => found[field]);
    if (first) {
      focusField(first);
      return;
    }
    setIsPending(true);
    try {
      const response = await fetch('/api/cuenta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, accountType, next }),
      });
      const body = await response.json().catch(() => null) as { error?: string; redirectTo?: string } | null;
      if (!response.ok || !body?.redirectTo) {
        setIsPending(false);
        if (response.status === 409) {
          setErrors({ email: body?.error ?? 'Ese correo ya tiene una cuenta. Ingresa con él.' });
          focusField('email');
        } else {
          setFormError(body?.error ?? 'No pudimos crear la cuenta. Intenta otra vez.');
        }
        return;
      }
      window.location.assign(body.redirectTo);
    } catch {
      setIsPending(false);
      setFormError('Parece que no hay conexión. Revisa tu internet y vuelve a intentar.');
    }
  }

  const fieldProps = (field: RegisterField, id: string) => ({
    id,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${id}-error` : undefined,
  });
  const fieldError = (field: RegisterField, id: string) =>
    errors[field] ? <p id={`${id}-error`} className="field-error">{errors[field]}</p> : null;

  return (
    <section className="register-page">
      <form ref={formRef} className="register-card" onSubmit={register} noValidate aria-busy={isPending}>
        <header className="register-head">
          <p className="eyebrow">Tu cuenta</p>
          <h1>Crear cuenta</h1>
          <p>Elige el tipo de cuenta. Si ya empezaste la conversación como invitado, tu avance se queda contigo.</p>
        </header>
        <fieldset className="account-type-field" aria-describedby={errors.accountType ? 'register-type-error' : undefined}>
          <legend>Tipo de cuenta</legend>
          <div className="account-type-grid">
            {accountTypes.map((option) => (
              <label key={option.value} className="account-type">
                <input
                  type="radio"
                  name="accountType"
                  value={option.value}
                  checked={accountType === option.value}
                  onChange={() => { setAccountType(option.value); clear('accountType'); }}
                />
                <span>{option.title}</span>
                <small>{option.body}</small>
              </label>
            ))}
          </div>
          {errors.accountType ? <p id="register-type-error" className="field-error">{errors.accountType}</p> : null}
        </fieldset>
        <div className="account-field">
          <label htmlFor="register-name">Nombre</label>
          <Input {...fieldProps('name', 'register-name')} autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); clear('name'); }} />
          {fieldError('name', 'register-name')}
        </div>
        <div className="account-field">
          <label htmlFor="register-email">Correo</label>
          <Input {...fieldProps('email', 'register-email')} type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); clear('email'); }} />
          {fieldError('email', 'register-email')}
        </div>
        <div className="account-field">
          <label htmlFor="register-password">Contraseña</label>
          <Input {...fieldProps('password', 'register-password')} type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); clear('password'); }} />
          <p className="account-hint">Mínimo 8 caracteres.</p>
          {fieldError('password', 'register-password')}
        </div>
        <div className="account-field">
          <label htmlFor="register-confirm">Confirmar contraseña</label>
          <Input {...fieldProps('confirmPassword', 'register-confirm')} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clear('confirmPassword'); }} />
          {fieldError('confirmPassword', 'register-confirm')}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? 'Creando tu cuenta…' : 'Crear cuenta'}
        </Button>
        {formError ? <p role="alert" className="error">{formError}</p> : null}
        <p className="account-switch">
          ¿Ya tienes cuenta? <Link href={signInHref(next)}>Ingresar</Link>
        </p>
      </form>
    </section>
  );
}
