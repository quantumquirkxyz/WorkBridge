import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WelcomeScreen } from '@/components/WelcomeScreen';

describe('WelcomeScreen', () => {
  it('has one primary action into the chat', () => {
    render(<WelcomeScreen />);
    expect(screen.getByRole('heading', { name: 'Puente Laboral Panamá' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Empezar/ })).toHaveAttribute('href', '/chat');
  });
});
