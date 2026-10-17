import { redirect } from 'next/navigation';
import { makeCandidateId } from '@puente/domain';
import { WelcomeScreen } from '../../components/WelcomeScreen';
import { getServerSession } from '../../lib/auth';
import { readCandidateProfile } from '../../lib/neon-repository';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession();
  if (session?.user.role === 'candidate') {
    try {
      const profile = await readCandidateProfile(makeCandidateId(session.user.id));
      if (profile) redirect('/vacantes');
    } catch {
      // An unavailable store should not prevent an anonymous candidate from starting.
    }
  }
  return <WelcomeScreen />;
}
