'use client';

import * as React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { formatFileSize, type AttachmentValidation } from '@/lib/attachments';

interface AttachmentChipProps {
  file: File;
  kind: 'pdf' | 'image';
  onRemove?: () => void;
  validation?: AttachmentValidation;
}

export function AttachmentChip({ file, kind, onRemove, validation }: AttachmentChipProps) {
  const [isValid, setIsValid] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (validation) {
      setIsValid(validation.ok);
    }
  }, [validation, file.size, file.type, kind]);

  const invalid = isValid === false;
  const errorMessage = validation && validation.ok === false ? validation.error : undefined;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border-[3px] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_var(--shadow-color)]',
        invalid
          ? 'border-danger bg-coral-tint text-foreground'
          : 'border-ink bg-card text-foreground',
      )}
      role="listitem"
      aria-label={invalid ? `Archivo no válido: ${file.name}` : `Archivo adjunto: ${file.name}`}
    >
      <Badge
        className="shrink-0"
        tone={invalid ? 'danger' : kind === 'pdf' ? 'neutral' : 'accent'}
      >
        {kind === 'pdf' ? 'PDF' : 'Imagen'}
      </Badge>
      <div className="flex-1 min-w-0 truncate" title={file.name}>
        {file.name}
      </div>
      <span className="shrink-0 text-muted-foreground">{formatFileSize(file.size)}</span>
      {invalid && errorMessage && (
        <span className="shrink-0 text-xs font-bold" title={errorMessage}>
          {errorMessage}
        </span>
      )}
      {onRemove ? <Button variant="destructive" size="sm" className="min-h-11 min-w-11 px-0" onClick={onRemove} aria-label="Eliminar archivo adjunto">×</Button> : null}
    </div>
  );
}

AttachmentChip.displayName = 'AttachmentChip';
