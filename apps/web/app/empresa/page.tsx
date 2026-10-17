import { SignOutButton } from '../../components/SignOutButton';
import { getServerSession } from '../../lib/auth';

export default async function EmployerHomePage() {
  const session = await getServerSession();

  return (
    <main>
      <h1>Panel de empresa</h1>
      <p>
        Sesión activa con rol: <strong>{session?.user.role}</strong>
      </p>
      <SignOutButton />
    </main>
  );
}
