import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

const magicLink = vi.fn();

vi.mock('@/lib/auth-client', () => ({
  authClient: { getSession: vi.fn() },
  signIn: { social: vi.fn(), email: vi.fn(), magicLink: (...args: unknown[]) => magicLink(...args) },
  signOut: vi.fn(),
  useSession: () => ({ data: null, isPending: false }),
}));

import { RegisterForm } from '@/app/registrarse/RegisterForm';
import { SignInForm } from '@/app/ingresar/SignInForm';

describe('SignInForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    magicLink.mockReset();
    magicLink.mockResolvedValue({ error: null });
  });
  afterEach(() => vi.useRealTimers());

  it('validates the email inline before sending a link', async () => {
    render(<SignInForm next="/" />);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'no-es-correo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme un enlace' }));
    expect(screen.getByText(/Escribe un correo válido/)).toBeInTheDocument();
    expect(magicLink).not.toHaveBeenCalled();
  });

  it('confirms the sent link and enforces the resend cooldown', async () => {
    render(<SignInForm next="/postulaciones/1" />);
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'Ana@Correo.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviarme un enlace' }));
    });
    expect(magicLink).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@correo.com', callbackURL: '/postulaciones/1' }));
    expect(screen.getByText('Revisa tu correo')).toBeInTheDocument();
    const resend = screen.getByRole('button', { name: /Reenviar enlace en 30 s/ });
    expect(resend).toBeDisabled();
    for (let i = 0; i < 30; i += 1) await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('button', { name: 'Reenviar enlace' })).toBeEnabled();
  });

  it('has no obvious a11y violations', async () => {
    vi.useRealTimers();
    const { container } = render(<SignInForm next="/" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('RegisterForm', () => {
  it('shows inline errors per field and does not submit', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<RegisterForm next="/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Escribe tu nombre.')).toBeInTheDocument();
    expect(screen.getByText(/Elige qué tipo de cuenta/)).toBeInTheDocument();
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
