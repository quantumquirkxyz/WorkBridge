import Link from 'next/link';

export default function ChatPage() {
  return (
    <main>
      <h1>Actualizar con el chat</h1>
      <p className="lead">Cuéntanos qué cambió en tu perfil y te ayudaremos a actualizar tus preferencias.</p>
      <p className="hint">El chat está disponible en modo perfil para revisar únicamente tu información laboral.</p>
      <Link href="/perfil">Volver a Mi perfil</Link>
    </main>
  );
}
