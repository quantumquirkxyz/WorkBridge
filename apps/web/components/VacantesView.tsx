'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import type { ExplorationResult, NearMatch, VacancyMatch } from '@puente/catalog';
import type { MatchDecision } from '@puente/solver';
import { MODALITY_LABELS } from '@puente/catalog';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Skeleton } from './ui/skeleton';
import { Progress } from './ui/progress';
import { orderMatchesByDecision } from './exploration/utils';

export interface VacantesViewProps {
  result?: ExplorationResult | null;
  loading?: boolean;
  decisions?: MatchDecision[];
  decisionsLoading?: boolean;
}

const money = (min: number | null, max: number | null) => {
  if (min === null && max === null) return 'Salario no publicado';
  if (min === null) return `Hasta USD ${max}`;
  if (max === null) return `Desde USD ${min}`;
  return `USD ${min} – ${max}`;
};

export function VacantesView({ result = null, loading = false, decisions = [], decisionsLoading = false }: VacantesViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const matches = result?.matches ?? [];
  const orderedMatches = orderMatchesByDecision(matches, decisions, decisionsLoading);
  const selected = orderedMatches.find((match) => match.vacancy.jobId === selectedId) ?? null;

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('v');
    if (fromUrl) setSelectedId(fromUrl);
    const onPopState = () => setSelectedId(new URLSearchParams(window.location.search).get('v'));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!selectedId || selected) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('v')) {
      url.searchParams.delete('v');
      window.history.replaceState({}, '', url);
      setSelectedId(null);
      setNotice('Esa vacante ya no está disponible');
      window.setTimeout(() => setNotice(null), 5000);
    }
  }, [selectedId, selected]);

  function open(match: VacancyMatch) {
    setSelectedId(match.vacancy.jobId);
    const url = new URL(window.location.href);
    url.searchParams.set('v', match.vacancy.jobId);
    window.history.pushState({}, '', url);
  }

  function close() {
    const previous = selectedId;
    const url = new URL(window.location.href);
    url.searchParams.delete('v');
    window.history.pushState({}, '', url);
    setSelectedId(null);
    if (previous) requestAnimationFrame(() => cardRefs.current.get(previous)?.focus());
  }

  return <main className="vacantes-page">
    {notice ? <div className="toast-notice" role="status">{notice}</div> : null}
    <div className="vacantes-heading">
      <div><p className="eyebrow">Explora oportunidades</p><h1>Vacantes para ti</h1><p className="lead">Encontramos oportunidades que se ajustan a lo que buscas.</p></div>
      <span className="vacantes-count">{result?.summary.matched ?? 0} compatibles</span>
    </div>
    {loading ? <div className="vacancy-grid" aria-label="Cargando vacantes">{[1, 2, 3].map((id) => <Skeleton key={id} className="vacancy-skeleton" />)}</div> : <>
       {matches.length ? <div className="vacancy-grid" aria-label="Vacantes compatibles">{orderedMatches.map((match) => <VacancyCard key={match.vacancy.jobId} match={match} decision={decisions.find((d) => d.vacancyId === match.vacancy.jobId)} decisionsLoading={decisionsLoading} onOpen={open} ref={(node) => { if (node) cardRefs.current.set(match.vacancy.jobId, node); }} />)}</div> : <div className="vacantes-empty" role="status"><h2>Aún no hay vacantes compatibles</h2><p>Completa tus preferencias para descubrir oportunidades hechas para ti.</p></div>}
      {result?.noMatch?.nearMatches.length ? <NearMatches matches={result.noMatch.nearMatches} /> : null}
      {result?.excluded.length ? <p className="excluded-summary"><strong>{result.excluded.length} vacantes excluidas</strong> · {topCauses(result.excluded)}</p> : null}
    </>}
     <VacancyDetail match={selected} decision={selected ? decisions.find((d) => d.vacancyId === selected.vacancy.jobId) : undefined} open={Boolean(selected)} onClose={close} />
  </main>;
}

const VacancyCard = forwardRef<HTMLButtonElement, { match: VacancyMatch; decision?: MatchDecision; decisionsLoading: boolean; onOpen: (match: VacancyMatch) => void }>(function VacancyCard({ match, decision, decisionsLoading, onOpen }, ref) {
  const { vacancy, freshness } = match;
  return <button ref={ref} className="vacancy-card" onClick={() => onOpen(match)} aria-label={`Ver detalles de ${vacancy.title}`}>
    <span className="vacancy-card-top"><span className="vacancy-modality">{MODALITY_LABELS[vacancy.modality]}</span><span>{freshness.label}</span></span>
    <strong className="vacancy-title">{vacancy.title}</strong><span className="vacancy-company">{vacancy.company ?? 'Empresa no indicada'}</span>
     <span className="vacancy-meta">{vacancy.location.raw ?? vacancy.location.district ?? 'Ubicación no indicada'} · {money(vacancy.salary.minUsd, vacancy.salary.maxUsd)}</span>
     {decisionsLoading ? <span className="readiness-skeleton" aria-label="Cargando preparación" /> : decision ? <Readiness decision={decision} /> : null}
    <span className="vacancy-card-action">Ver detalles <span aria-hidden="true">→</span></span>
  </button>;
});
VacancyCard.displayName = 'VacancyCard';

function NearMatches({ matches }: { matches: NearMatch[] }) { return <section className="near-matches" aria-labelledby="near-heading"><h2 id="near-heading">Casi listas para ti</h2><div className="near-list">{matches.map(({ vacancy, warnings }) => <article key={vacancy.jobId}><strong>{vacancy.title}</strong><p>{warnings[0] ?? 'Hay un requisito que todavía bloquea esta vacante.'}</p></article>)}</div></section>; }
function topCauses(excluded: NonNullable<ExplorationResult['excluded']>) { return excluded.flatMap((item) => item.failedConstraints.map((cause) => cause.detail)).slice(0, 3).join(' · '); }

function Readiness({ decision }: { decision: MatchDecision }) { return <span className="readiness"><strong>Preparación {decision.score}%</strong><Progress value={decision.score} aria-label={`Preparación ${decision.score}%`} /></span>; }

function VacancyDetail({ match, decision, open, onClose }: { match: VacancyMatch | null; decision?: MatchDecision; open: boolean; onClose: () => void }) {
   if (!match) return null;
  const { vacancy, freshness } = match;
   const missing = decision?.hardConstraints.filter((item) => !item.satisfied) ?? [];
   const have = decision?.scoreBreakdown.filter((item) => item.rawScore > 0) ?? [];
   return <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}><SheetContent side="right" className="vacancy-detail"><SheetHeader><SheetTitle>{vacancy.title}</SheetTitle><SheetDescription>{vacancy.company ?? 'Empresa no indicada'} · {freshness.label}</SheetDescription></SheetHeader><div className="vacancy-detail-body"><p><strong>Modalidad</strong><br />{MODALITY_LABELS[vacancy.modality]}</p><p><strong>Ubicación</strong><br />{vacancy.location.raw ?? vacancy.location.district ?? 'No indicada'}</p><p><strong>Salario</strong><br />{money(vacancy.salary.minUsd, vacancy.salary.maxUsd)}</p>{decision ? <><h3>Preparación {decision.score}%</h3><Progress value={decision.score} aria-label={`Preparación ${decision.score}%`} /><h3>Lo que ya tienes</h3><ul>{have.map((item) => <li key={item.dimension}>{item.reasons.join(' ')}</li>)}</ul><h3>Lo que te falta</h3><ul>{missing.length ? missing.map((item) => <li key={item.id}>{item.reason}</li>) : <li>No se detectaron brechas.</li>}</ul></> : <p>Calculando preparación…</p>}</div><Button asChild size="lg" className="vacancy-original"><a href={vacancy.provenance.sourceUrl} target="_blank" rel="noreferrer">Ver vacante original <span className="sr-only">(se abre en otra pestaña)</span> ↗</a></Button></SheetContent></Sheet>;
}
