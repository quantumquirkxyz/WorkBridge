import { getServerSession } from '../../../lib/auth';
import { ProfileView } from '../../../components/ProfileView';

export default async function ProfilePage() {
  const session = await getServerSession();

  return <ProfileView candidateId={session?.user.id} />;
}
