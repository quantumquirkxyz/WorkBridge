import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';

describe('shadcn Button', () => {
  it('renders and has no axe violations', async () => {
    const { container } = render(<Button>Continuar</Button>);

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
