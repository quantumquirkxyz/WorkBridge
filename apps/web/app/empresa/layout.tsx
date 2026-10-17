import { redirect } from 'next/navigation';
import { getServerSession } from '../../lib/auth';
import { decideRoleGuard } from '../../lib/role-guard';

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const decision = decideRoleGuard({
    session: await getServerSession(),
    requiredRole: 'employer',
    currentPath: '/empresa',
  });

  if (decision.action === 'redirect') redirect(decision.location);
  return children;
}
