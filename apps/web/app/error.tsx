'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import './styles/auth.css';

export default function ErrorBoundary({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const tryAgain = retry ?? reset;
  // The error renders inside the root layout, so the shell for the failing route is still mounted.
  // Flag the document so auth.css hides that chrome while the error screen is showing.
  useEffect(() => {
    document.documentElement.dataset.systemScreen = 'error';
    return () => { delete document.documentElement.dataset.systemScreen; };
  }, []);
  return (
    <div className="fallback-page">
      <section className="fallback-card" role="alert" aria-labelledby="error-title">
        <span className="fallback-code" aria-hidden="true">Ups</span>
        <h1 id="error-title">Algo salió mal</h1>
        <p>No fue tu culpa. Intenta de nuevo; si sigue pasando, vuelve al inicio y retoma desde ahí.</p>
        <div className="fallback-actions">
          {tryAgain ? <Button type="button" size="lg" onClick={() => tryAgain()}>Reintentar</Button> : null}
          <Button asChild variant="secondary" size="lg"><Link href="/">Volver al inicio</Link></Button>
        </div>
      </section>
    </div>
  );
}
