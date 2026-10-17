import { redirect } from 'next/navigation';
import { getServerSession } from '../../lib/auth';
import { decideRoleGuard } from '../../lib/role-guard';

export default async function CounselorLayout({ children }: { children: React.ReactNode }) {
  const decision = decideRoleGuard({
    session: await getServerSession(),
    requiredRole: 'counselor',
    currentPath: '/orientador',
  });

  if (decision.action === 'redirect') redirect(decision.location);
  return children;
}
