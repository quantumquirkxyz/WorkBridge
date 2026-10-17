'use client';

import * as React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { formatFileSize, type AttachmentValidation } from '@/lib/attachments';

interface AttachmentChipProps {
  file: File;
  kind: 'pdf' | 'image';
  onRemove: () => void;
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
        'flex items-center gap-3 rounded-xl border px-3 py-2 text-sm',
        invalid
          ? 'border-danger bg-danger text-danger-foreground'
          : 'border-input bg-muted text-foreground',
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
        <span className="shrink-0 text-xs font-medium" title={errorMessage}>
          {errorMessage}
        </span>
      )}
      <Button variant="destructive" size="sm" onClick={onRemove} aria-label="Eliminar archivo adjunto">
        ×
      </Button>
    </div>
  );
}

AttachmentChip.displayName = 'AttachmentChip';
