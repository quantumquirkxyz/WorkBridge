import { SignOutButton } from '../../components/SignOutButton';
import { CounselorQueue } from '../../components/counselor/CounselorQueue';

export default function CounselorHomePage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Pendientes de revisión</h1>
        <SignOutButton />
      </header>
      <CounselorQueue />
    </main>
  );
}
