import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import './styles/auth.css';

export const metadata: Metadata = { title: 'No encontramos esa página' };

export default function NotFound() {
  return (
    <div className="fallback-page">
      <section className="fallback-card" aria-labelledby="not-found-title">
        <span className="fallback-code" aria-hidden="true">404</span>
        <h1 id="not-found-title">Esta página no existe</h1>
        <p>Puede que el enlace esté viejo o que lo hayamos movido. Tu avance sigue guardado.</p>
        <div className="fallback-actions">
          <Button asChild size="lg"><Link href="/">Volver al inicio</Link></Button>
          <Button asChild variant="secondary" size="lg"><Link href="/vacantes">Ver vacantes</Link></Button>
        </div>
      </section>
    </div>
  );
}
