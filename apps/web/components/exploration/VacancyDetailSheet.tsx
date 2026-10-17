'use client';

import Link from 'next/link';
import { MODALITY_LABELS, type VacancyMatch } from '@workbridge/catalog';
import type { MatchDecision } from '@workbridge/solver';
import { formatSalary, haveItems, missingItems } from '../../lib/exploration-view';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../ui/sheet';
import { ReadinessBar, ReadinessSkeleton } from './ReadinessBar';
import '../../app/styles/explore.css';

export interface VacancyDetailSheetProps {
  match: VacancyMatch | null;
  decision?: MatchDecision;
  decisionsLoading: boolean;
  saved: boolean;
  onClose: () => void;
  onToggleSave: (jobId: string) => void;
  onShare: (match: VacancyMatch) => void;
  /** Where focus goes when the sheet closes: the card that opened it. */
  onCloseAutoFocus: (event: Event) => void;
}

/** S4: bottom sheet on phones, side panel on desktop (CSS), driven by `?v=` in the parent. */
export function VacancyDetailSheet({ match, decision, decisionsLoading, saved, onClose, onToggleSave, onShare, onCloseAutoFocus }: VacancyDetailSheetProps) {
  const vacancy = match?.vacancy;
  const have = haveItems(decision);
  const missing = missingItems(decision);
  const required = vacancy?.skills.filter((skill) => skill.required) ?? [];
  return (
    <Sheet open={Boolean(match)} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="right" className="xp-sheet" onCloseAutoFocus={onCloseAutoFocus} aria-describedby="vacancy-sheet-desc">
        {match && vacancy ? (
          <>
            <SheetTitle>{vacancy.title}</SheetTitle>
            <SheetDescription id="vacancy-sheet-desc">
              {vacancy.company ?? 'Empresa no indicada'} · {MODALITY_LABELS[vacancy.modality]} · {match.freshness.label}
            </SheetDescription>
            <dl className="xp-facts">
              <div><dt>Ubicación</dt><dd>{vacancy.location?.raw ?? vacancy.location?.district ?? 'No indicada'}</dd></div>
              <div><dt>Salario</dt><dd>{formatSalary(vacancy.salary?.minUsd ?? null, vacancy.salary?.maxUsd ?? null)}{vacancy.salary?.minUsd !== null || vacancy.salary?.maxUsd !== null ? ' / mes' : ''}</dd></div>
            </dl>

            <section aria-labelledby="sheet-ready">
              <h3 id="sheet-ready">Tu preparación</h3>
              {decisionsLoading ? <ReadinessSkeleton /> : decision ? <ReadinessBar score={decision.score} /> : <p className="xp-muted">Todavía no pudimos calcular tu preparación para esta vacante.</p>}
            </section>

            {decision ? (
              <>
                <section aria-labelledby="sheet-have">
                  <h3 id="sheet-have">Lo que ya tienes</h3>
                  {have.length > 0
                    ? <ul className="xp-missing xp-have">{have.map((item) => <li key={item}>{item}</li>)}</ul>
                    : <p className="xp-muted">Aún no encontramos coincidencias claras.</p>}
                </section>
                <section aria-labelledby="sheet-missing">
                  <h3 id="sheet-missing">Lo que te falta</h3>
                  {missing.length > 0 ? (
                    <>
                      <ul className="xp-missing">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
                      <p className="xp-muted" style={{ marginTop: '.5rem' }}><Link className="xp-course-link" href="/ruta">Ver cómo cerrar estas brechas</Link></p>
                    </>
                  ) : <p className="xp-muted">No detectamos nada que te falte. ¡Buen momento para postular!</p>}
                </section>
              </>
            ) : null}

            {required.length > 0 ? (
              <section aria-labelledby="sheet-skills">
                <h3 id="sheet-skills">Lo que piden</h3>
                <ul className="xp-skill-list">{required.map((skill) => <li key={skill.labelEs} className="xp-chip xp-chip-plain">{skill.labelEs}</li>)}</ul>
              </section>
            ) : null}

            <p className="xp-muted">Fuente: {match.provenance.provider} · {match.freshness.label}</p>

            <div className="xp-actions">
              <Button asChild size="lg">
                <Link href={`/postulaciones/nueva?vacancy=${encodeURIComponent(vacancy.jobId)}`}>Preparar mi postulación</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={match.provenance.sourceUrl} target="_blank" rel="noreferrer">Ver vacante original <span className="sr-only">(se abre en otra pestaña)</span><span aria-hidden="true">↗</span></a>
              </Button>
              <div className="xp-actions-row">
                <Button type="button" variant="secondary" aria-pressed={saved} onClick={() => onToggleSave(vacancy.jobId)}>{saved ? 'Guardada ✓' : 'Guardar'}</Button>
                <Button type="button" variant="secondary" onClick={() => onShare(match)}>Compartir</Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
