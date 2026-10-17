'use client';

import './globals.css';
import './styles/auth.css';

/** Replaces the root layout when it crashes, so it owns <html>/<body> and imports its own styles. */
export default function GlobalError({
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const tryAgain = retry ?? reset;
  return (
    <html lang="es">
      <body>
        <title>Algo salió mal · WorkBridge</title>
        <div className="fallback-page">
          <section className="fallback-card" role="alert" aria-labelledby="global-error-title">
            <span className="fallback-code" aria-hidden="true">Ups</span>
            <h1 id="global-error-title">Algo salió mal</h1>
            <p>WorkBridge tuvo un problema al cargar. Tu avance sigue guardado. Intenta de nuevo.</p>
            <div className="fallback-actions">
              {tryAgain ? (
                <button type="button" className="auth-nav-link auth-nav-link-signup" onClick={() => tryAgain()}>Reintentar</button>
              ) : null}
              {/* A full navigation resets the crashed root layout. */}
              <a className="auth-nav-link" href="/">Volver al inicio</a>
            </div>
          </section>
        </div>
      </body>
    </html>
  );
}
