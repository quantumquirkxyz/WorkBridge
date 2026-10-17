'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Roadmap } from '@puente/training';
import { readExplorationSession } from '../lib/exploration-session';

function formatCost(costUsd: number): string {
  return costUsd === 0 ? 'Gratis' : `USD ${costUsd}`;
}

export function RutaView() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRoadmap(readExplorationSession()?.roadmap ?? null);
    setLoaded(true);
  }, []);

  return (
    <main className="ruta-page">
      <div className="ruta-heading">
        <p className="eyebrow">Tu siguiente paso</p>
        <h1>Mi ruta</h1>
        <p className="lead">Recomendaciones de capacitación para acercarte a las oportunidades que buscas.</p>
      </div>
      {!loaded ? null : roadmap ? (
        <section className="ruta-card" aria-labelledby="ruta-recommendations">
          <h2 id="ruta-recommendations">Ruta de capacitación</h2>
          <p className="hint">Esta ruta es una recomendación basada en tu última exploración de vacantes.</p>
          {roadmap.gaps.length ? <p className="ruta-gaps"><strong>Brechas a trabajar:</strong> {roadmap.gaps.map((gap) => gap.label ?? gap.skillId).join(', ')}.</p> : null}
          {roadmap.recommendations.length ? (
            <ol className="ruta-steps">
              {roadmap.recommendations.map((recommendation) => (
                <li key={recommendation.rank}>
                  <span className="ruta-step-number" aria-hidden="true">{recommendation.rank}</span>
                  <div><h3>{recommendation.opportunity.title}</h3><p>{recommendation.explanationEs}</p><span className="hint">{recommendation.opportunity.provider} · {recommendation.opportunity.durationHours} h · {formatCost(recommendation.opportunity.costUsd)}</span></div>
                </li>
              ))}
            </ol>
          ) : <p>No encontramos una capacitación elegible en el catálogo por ahora.</p>}
          {roadmap.unresolvedGaps.length ? <p className="hint">Brechas aún sin cubrir: {roadmap.unresolvedGaps.map((gap) => gap.label ?? gap.skillId).join(', ')}.</p> : null}
        </section>
      ) : (
        <section className="ruta-empty" role="status">
          <h2>Aún no tienes una ruta</h2>
          <p>Explora vacantes para identificar oportunidades de capacitación que se ajusten a tus objetivos.</p>
          <Link className="ruta-action" href="/">Explorar vacantes</Link>
        </section>
      )}
    </main>
  );
}
