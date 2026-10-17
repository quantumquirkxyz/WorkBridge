import { SignOutButton } from '../../components/SignOutButton';
import { getServerSession } from '../../lib/auth';

export default async function CounselorHomePage() {
  const session = await getServerSession();

  return (
    <main>
      <h1>Panel de orientador</h1>
      <p>
        Sesión activa con rol: <strong>{session?.user.role}</strong>
      </p>
      <SignOutButton />
    </main>
  );
}
