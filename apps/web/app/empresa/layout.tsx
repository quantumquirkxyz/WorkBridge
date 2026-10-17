import { redirect } from 'next/navigation';
import { SignOutButton } from '../../components/SignOutButton';
import { getServerSession } from '../../lib/auth';
import { decideRoleGuard } from '../../lib/role-guard';

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const decision = decideRoleGuard({
    session: await getServerSession(),
    requiredRole: 'employer',
    currentPath: '/empresa',
  });

  if (decision.action === 'redirect') redirect(decision.location);
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="font-semibold">WorkBridge · Empresas</span>
        <SignOutButton />
      </header>
      {children}
    </div>
  );
}
