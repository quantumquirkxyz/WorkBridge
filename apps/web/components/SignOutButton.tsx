'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { signOut } from '../lib/auth-client';

export function SignOutButton({ variant = 'outline', size }: { variant?: 'outline' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg' }) {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      const result = await signOut();
      if (result?.error) throw new Error(result.error.message);
      window.location.assign('/');
    } catch {
      setPending(false);
      toast.error('No pudimos cerrar tu sesión. Intenta de nuevo.');
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={() => void handleSignOut()} disabled={pending}>
      {pending ? 'Saliendo…' : 'Cerrar sesión'}
    </Button>
  );
}
