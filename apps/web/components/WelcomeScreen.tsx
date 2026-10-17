import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Check, MessageCircle, Route } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button } from './ui/button';

const trust = ['Gratis', '5 minutos', 'Tú decides qué compartir'] as const;

const steps = [
  {
    title: 'Cuéntanos con tus palabras',
    body: 'Escribes lo que sabes hacer, aunque lo hayas aprendido por tu cuenta. No necesitas un CV.',
    icon: MessageCircle,
  },
  {
    title: 'Mira vacantes para ti',
    body: 'Te mostramos oportunidades y qué te falta para cada una.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Sigue una ruta',
    body: 'Si todavía no hay una vacante, te proponemos cursos para acercarte.',
    icon: Route,
  },
] as const;

const stickers = [
  { label: 'Atención al cliente', color: 'var(--yellow)', rotate: '-6deg', delay: '0s', left: '2%', top: '4%' },
  { label: 'Excel', color: 'var(--mint)', rotate: '4deg', delay: '.4s', left: '48%', top: '16%' },
  { label: 'Ventas', color: 'var(--pink)', rotate: '-3deg', delay: '.8s', left: '8%', top: '34%' },
  { label: 'Voluntariado', color: '#8fb4ff', rotate: '5deg', delay: '1.1s', left: '42%', top: '50%' },
  { label: 'Negocio familiar', color: '#ffffff', rotate: '-4deg', delay: '1.5s', left: '4%', top: '66%' },
  { label: 'Inglés B1', color: 'var(--yellow)', rotate: '3deg', delay: '1.9s', left: '52%', top: '82%' },
] as const;

const marqueeItems = ['Sin experiencia', 'Con experiencia que no sabías', 'Prácticas', 'Primer empleo', 'Medio tiempo', 'Tu ruta'];

export function WelcomeScreen({ startHref = '/cuenta' }: { startHref?: string }) {
  return (
    <main className="welcome-page">
      <div className="welcome-hero">
        <div className="welcome-intro">
          <p className="eyebrow">WorkBridge</p>
          <h1>
            Tu experiencia <mark>cuenta.</mark> Aunque sea informal.
          </h1>
          <p className="welcome-copy">
            Cuéntanos qué sabes hacer y te mostramos vacantes y cursos para ti.
          </p>
          <Button asChild size="lg" className="welcome-action">
            <Link href={startHref}>Empezar <ArrowRight aria-hidden="true" /></Link>
          </Button>
          <ul className="welcome-trust">
            {trust.map((item) => (
              <li key={item}><Check aria-hidden="true" /> {item}</li>
            ))}
          </ul>
        </div>
        <div className="welcome-illustration" aria-hidden="true">
          {stickers.map((s) => (
            <span
              key={s.label}
              className="sticker"
              style={{ '--c': s.color, '--r': s.rotate, '--d': s.delay, left: s.left, top: s.top } as CSSProperties}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i}>{item} ✦ </span>
          ))}
        </div>
      </div>

      <section className="welcome-steps" aria-labelledby="welcome-how">
        <h2 id="welcome-how">Qué puedes hacer aquí</h2>
        <ol>
          {steps.map(({ title, body, icon: Icon }, index) => (
            <li key={title} className="welcome-step">
              <span className="welcome-step-mark" aria-hidden="true">
                <Icon />
                <span>{index + 1}</span>
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="welcome-note">Nunca enviamos una postulación sin tu permiso.</p>
    </main>
  );
}
