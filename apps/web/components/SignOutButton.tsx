'use client';

import { Button } from './ui/button';
import { signOut } from '../lib/auth-client';

export function SignOutButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => void signOut()}>
      Cerrar sesión
    </Button>
  );
}
