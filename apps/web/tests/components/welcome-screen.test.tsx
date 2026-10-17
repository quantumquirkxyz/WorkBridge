import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WelcomeScreen } from '@/components/WelcomeScreen';

describe('WelcomeScreen', () => {
  it('presents the platform and asks for an account before the chat', () => {
    render(<WelcomeScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Tu experiencia cuenta. Aunque sea informal.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué puedes hacer aquí' })).toBeInTheDocument();
    expect(screen.getByText('Nunca enviamos una postulación sin tu permiso.')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Empezar/ })).toHaveAttribute('href', '/cuenta');
  });
});
