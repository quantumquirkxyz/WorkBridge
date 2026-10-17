'use client';

import { createAuthClient } from 'better-auth/react';
import { anonymousClient, magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [anonymousClient(), magicLinkClient()],
});

export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;
