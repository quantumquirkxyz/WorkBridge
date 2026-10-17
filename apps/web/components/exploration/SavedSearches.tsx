import type { SavedSearchView } from '../../lib/api/contracts';
import { newCountLabel } from '../../lib/exploration-view';
import '../../app/styles/explore.css';

/** Saved searches for Mi perfil: name plus an "N nuevas" sticker. */
export function SavedSearches({ searches }: { searches: SavedSearchView[] }) {
  if (searches.length === 0) {
    return <p className="xp-muted">Todavía no tienes búsquedas guardadas. Guarda una desde Vacantes y te avisamos cuando haya vacantes nuevas.</p>;
  }
  return (
    <ul className="xp-search-list">
      {searches.map((view) => {
        const fresh = view.newSinceSaved.length;
        return (
          <li key={view.search.searchId}>
            <span><strong>{view.search.label}</strong><br /><span className="xp-muted">{view.matches.length} {view.matches.length === 1 ? 'vacante' : 'vacantes'} ahora</span></span>
            {fresh > 0 ? <span className="xp-chip xp-chip-mint">{newCountLabel(fresh)}</span> : <span className="xp-muted">Sin novedades</span>}
          </li>
        );
      })}
    </ul>
  );
}
