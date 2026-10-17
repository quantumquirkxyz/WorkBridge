import { describe, expect, it } from 'vitest';
import { validateAttachment, formatFileSize } from '../lib/attachments';

function makeFile(parts: BlobPart[], name: string, type: string): File {
  return new File(parts, name, { type });
}

describe('validateAttachment', () => {
  it('accepts a valid PDF', () => {
    const file = makeFile(['%PDF-1.4'], 'cv.pdf', 'application/pdf');
    expect(validateAttachment(file, 'pdf')).toEqual({ ok: true });
  });

  it('accepts a valid image', () => {
    const file = makeFile([new ArrayBuffer(10)], 'foto.png', 'image/png');
    expect(validateAttachment(file, 'image')).toEqual({ ok: true });
  });

  it('rejects an image uploaded as PDF', () => {
    const file = makeFile([new ArrayBuffer(10)], 'cv.pdf', 'image/png');
    const result = validateAttachment(file, 'pdf');
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toContain('PDF');
  });

  it('rejects a PDF uploaded as image', () => {
    const file = makeFile(['%PDF-1.4'], 'foto.png', 'application/pdf');
    const result = validateAttachment(file, 'image');
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toContain('imagen');
  });

  it('rejects an empty file', () => {
    const file = makeFile([], 'vacio.pdf', 'application/pdf');
    const result = validateAttachment(file, 'pdf');
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toContain('vacío');
  });

  it('rejects a file larger than the limit', () => {
    const maxBytes = 10 * 1024 * 1024;
    const big = new Blob([new ArrayBuffer(maxBytes + 1)]);
    const file = makeFile([big], 'grande.pdf', 'application/pdf');
    expect(file.size).toBeGreaterThan(maxBytes);
    const result = validateAttachment(file, 'pdf');
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toContain('MB');
  });

  it('is case-insensitive on the mime type', () => {
    const file = makeFile(['%PDF-1.4'], 'CV.PDF', 'APPLICATION/PDF');
    expect(validateAttachment(file, 'pdf')).toEqual({ ok: true });
  });
});

describe('formatFileSize', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2 * 1024 * 1024 + 3 * 1024)).toBe('2.00 MB');
  });
});
