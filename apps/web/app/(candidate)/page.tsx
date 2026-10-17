import { redirect } from 'next/navigation';
import { makeCandidateId } from '@workbridge/domain';
import { WelcomeScreen } from '../../components/WelcomeScreen';
import { needsAccount, startPathFor } from '../../lib/account-access';
import { getServerSession } from '../../lib/auth';
import { readCandidateProfile } from '../../lib/neon-repository';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession();
  if (session?.user.role === 'candidate' && !needsAccount(session.user)) {
    try {
      const profile = await readCandidateProfile(makeCandidateId(session.user.id));
      if (profile) redirect('/vacantes');
    } catch {
      // An unavailable store should not prevent an anonymous candidate from starting.
    }
  }
  return <WelcomeScreen startHref={startPathFor(session?.user)} />;
}
