import { redirect } from 'next/navigation';
import { makeCandidateId } from '@workbridge/domain';
import { needsAccount } from '../../../lib/account-access';
import { getServerSession } from '../../../lib/auth';
import { signInHref } from '../../../lib/auth-navigation';
import { readCandidateProfile } from '../../../lib/neon-repository';

export const dynamic = 'force-dynamic';

/** Role home after sign-in: candidate -> /vacantes (or /chat when the profile is empty), counselor -> /orientador, employer -> /empresa. */
export default async function PostAuthEntryPage() {
  const session = await getServerSession();
  if (!session || needsAccount(session.user)) redirect(signInHref());
  const { role, id } = session.user;
  if (role === 'employer') redirect('/empresa');
  if (role === 'counselor') redirect('/orientador');

  let hasProfile = false;
  try {
    hasProfile = Boolean(await readCandidateProfile(makeCandidateId(id)));
  } catch {
    // An unavailable store should not block sign-in; start the conversation.
  }
  redirect(hasProfile ? '/vacantes' : '/chat');
}
