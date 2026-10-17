'use client';

import { useId, type FormEvent } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import '../../app/styles/explore.css';

export interface SaveSearchDialogProps {
  open: boolean;
  label: string;
  saving: boolean;
  error: string | null;
  onLabelChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function SaveSearchDialog({ open, label, saving, error, onLabelChange, onOpenChange, onSave }: SaveSearchDialogProps) {
  const inputId = useId();
  const errorId = useId();
  function submit(event: FormEvent) {
    event.preventDefault();
    if (label.trim() && !saving) onSave();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar esta búsqueda</DialogTitle>
          <DialogDescription>Te avisaremos cuando aparezcan vacantes nuevas para lo que buscas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="xp-dialog-field" noValidate>
          <Label htmlFor={inputId}>Nombre de la búsqueda</Label>
          <Input id={inputId} value={label} onChange={(event) => onLabelChange(event.target.value)} placeholder="Atención al cliente en Panamá" maxLength={80} aria-describedby={error ? errorId : undefined} autoComplete="off" />
          {error ? <p id={errorId} role="alert" className="xp-inline-error">{error}</p> : null}
          <div className="xp-dialog-actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!label.trim() || saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
