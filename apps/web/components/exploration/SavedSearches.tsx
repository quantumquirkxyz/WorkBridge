import type { SavedSearchView } from '../../lib/api/contracts';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function SavedSearches({
  searches,
  searchLabel,
  onLabelChange,
  onSave,
  onDelete,
  message,
}: {
  searches: SavedSearchView[];
  searchLabel: string;
  onLabelChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  message: string | null;
}) {
  return (
    <div className="result" aria-labelledby="saved-searches-heading">
      <h4 id="saved-searches-heading">Búsquedas guardadas</h4>
      <p className="hint">
        Guarda esta búsqueda y vuelve más tarde: aquí verás las coincidencias nuevas que aparecieron después.
      </p>
      <div className="field-row">
        <div className="field">
          <Label htmlFor="search-label">Nombre de la búsqueda</Label>
          <Input
            id="search-label"
            type="text"
            value={searchLabel}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder="Atención al cliente en Panamá"
          />
        </div>
        <Button type="button" onClick={onSave} disabled={searchLabel.trim().length === 0}>
          Guardar búsqueda
        </Button>
        <Button type="button" onClick={onDelete} variant="destructive">
          Eliminar mis datos
        </Button>
      </div>
      <div aria-live="polite" role="status">
        {message ? <p className="hint">{message}</p> : null}
      </div>

      {searches.length === 0 ? (
        <p className="hint">Todavía no tienes búsquedas guardadas.</p>
      ) : (
        <ul>
          {searches.map((view) => (
            <li key={view.search.searchId}>
              <strong>{view.search.label}</strong>
              <div className="hint">
                Guardada el {view.search.savedAt} · Coincidencias actuales: {view.matches.length} · Nuevas desde
                entonces: {view.newSinceSaved.length}
              </div>
              {view.newSinceSaved.length > 0 ? (
                <ul className="warnings">
                  {view.newSinceSaved.map((match) => (
                    <li key={match.vacancy.jobId}>
                      Nueva: {match.vacancy.title} ({match.vacancy.company ?? 'Empresa no indicada'})
                    </li>
                  ))}
                </ul>
              ) : null}
              {view.matches.length > 0 ? (
                <div className="hint">Coincidencias: {view.matches.map((match) => match.vacancy.title).join(', ')}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
