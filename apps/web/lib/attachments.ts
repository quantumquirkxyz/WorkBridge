import type { IntakeSourceKind } from '@workbridge/domain';
import { MAX_SOURCE_BYTES } from '@workbridge/ingestion';

/** MIME types accepted for each file-backed intake kind. */
export const ACCEPTED_ATTACHMENT_MIME: Record<Extract<IntakeSourceKind, 'pdf' | 'image'>, readonly string[]> = {
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/heic'],
};

export type AttachmentValidation = { ok: true } | { ok: false; error: string };

/**
 * Validate a user-selected file before it is attached to an intake submission.
 * Pure and dependency-free so it can be unit-tested outside the browser.
 */
export function validateAttachment(
  file: File,
  kind: Extract<IntakeSourceKind, 'pdf' | 'image'>,
): AttachmentValidation {
  const maxBytes = MAX_SOURCE_BYTES;
  const mime = (file.type ?? '').toLowerCase();
  const accepted = ACCEPTED_ATTACHMENT_MIME[kind];

  const mimeOk = accepted.some(
    (allowed) => mime === allowed || mime.startsWith(`${allowed.split('/')[0]}/`),
  );
  if (!mimeOk) {
    const label = kind === 'pdf' ? 'PDF' : 'imagen';
    return {
      ok: false,
      error: `Tipo de archivo no admitido para ${label}. Elige un archivo ${label} válido.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, error: 'El archivo está vacío. Elige otro archivo.' };
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      ok: false,
      error: `El archivo excede el límite de ${maxMb} MB. Elige un archivo más pequeño.`,
    };
  }

  return { ok: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
