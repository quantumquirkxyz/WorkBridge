import Link from 'next/link';
import { ArrowRight, Map } from 'lucide-react';
import { Button } from './ui/button';

export function WelcomeScreen() {
  return (
    <main className="welcome-page">
      <div className="welcome-mark" aria-hidden="true"><Map /></div>
      <p className="eyebrow">Puente Laboral Panamá</p>
      <h1>Puente Laboral Panamá</h1>
      <p className="welcome-copy">
        Cuéntanos qué sabes hacer, incluso si aprendiste por tu cuenta, y te ayudamos a encontrar oportunidades que encajen contigo.
      </p>
      <Button asChild size="lg" className="welcome-action">
        <Link href="/chat">Empezar <ArrowRight aria-hidden="true" /></Link>
      </Button>
      <p className="welcome-note">No necesitas tener un CV listo. Puedes escribirlo con tus propias palabras.</p>
    </main>
  );
}
