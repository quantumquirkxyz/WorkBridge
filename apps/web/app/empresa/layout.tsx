import { requireAccount } from '../../lib/session-guard';

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  await requireAccount('/empresa', 'employer');
  return <div className="min-h-dvh">{children}</div>;
}
