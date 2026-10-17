import { requireAccount } from '../../lib/session-guard';

export default async function CounselorLayout({ children }: { children: React.ReactNode }) {
  await requireAccount('/orientador', 'counselor');
  return <div className="min-h-dvh">{children}</div>;
}
