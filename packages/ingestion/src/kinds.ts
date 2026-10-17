import type { IntakeSourceKind } from '@workbridge/domain';
import { UnsupportedSourceError } from './errors';

/** Guardrail limits: intake inputs are untrusted data, never instructions. */
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_CHARS = 200_000;

const PDF_MIME = 'application/pdf';
const IMAGE_MIME_PREFIX = 'image/';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic'];

export function extensionOf(fileName: string | undefined): string {
  if (!fileName) return '';
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}

/**
 * Resolve the intake source kind. An explicit `kind` always wins so
 * pre-transcribed audio is never misread as a plain text file.
 */
export function detectSourceKind(input: {
  kind?: IntakeSourceKind;
  fileName?: string;
  mimeType?: string;
}): IntakeSourceKind {
  if (input.kind) return input.kind;
  const mimeType = input.mimeType?.toLowerCase() ?? '';
  const extension = extensionOf(input.fileName);
  if (mimeType === PDF_MIME || extension === '.pdf') return 'pdf';
  if (mimeType.startsWith(IMAGE_MIME_PREFIX) || IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (mimeType.startsWith('text/') || extension === '.txt' || extension === '.md') return 'text';
  throw new UnsupportedSourceError(
    `Cannot infer intake source kind from mimeType=${JSON.stringify(mimeType)} fileName=${JSON.stringify(input.fileName)}`,
  );
}
