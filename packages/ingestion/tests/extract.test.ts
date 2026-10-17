import { describe, expect, it } from 'vitest';
import { detectSourceKind, extensionOf } from '../src/kinds';
import { extractText } from '../src/extract';
import { OcrUnavailableError, SourceTooLargeError, UnsupportedSourceError } from '../src/errors';
import type { OcrAdapter } from '../src/ocr';

const fixedNow = () => new Date('2026-10-16T12:00:00.000Z');

describe('detectSourceKind', () => {
  it('honours an explicit kind (pre-transcribed audio)', () => {
    expect(detectSourceKind({ kind: 'audio_transcript', fileName: 'audio.txt' })).toBe('audio_transcript');
  });

  it('infers from mime type and extension', () => {
    expect(detectSourceKind({ mimeType: 'application/pdf' })).toBe('pdf');
    expect(detectSourceKind({ fileName: 'cv.PDF' })).toBe('pdf');
    expect(detectSourceKind({ mimeType: 'image/png' })).toBe('image');
    expect(detectSourceKind({ fileName: 'foto.jpeg' })).toBe('image');
    expect(detectSourceKind({ mimeType: 'text/plain' })).toBe('text');
  });

  it('throws for an unknown source', () => {
    expect(() => detectSourceKind({ fileName: 'cv.docx' })).toThrow(UnsupportedSourceError);
  });

  it('extracts extensions safely', () => {
    expect(extensionOf(undefined)).toBe('');
    expect(extensionOf('noext')).toBe('');
  });
});

describe('extractText', () => {
  it('passes pasted text through unchanged with full confidence', async () => {
    const result = await extractText({ kind: 'text', ref: 'candidate:statement', text: '  Hola  ' }, { now: fixedNow });
    expect(result.text).toBe('Hola');
    expect(result.source.extraction_method).toBe('passthrough');
    expect(result.source.extracted_at).toBe('2026-10-16T12:00:00.000Z');
    expect(result.source.extraction_confidence).toBeUndefined();
  });

  it('treats pre-transcribed audio as declared text with slightly lower confidence', async () => {
    const result = await extractText(
      { kind: 'audio_transcript', ref: 'audio:1', text: 'Trabajé en una tienda de abarrotes' },
      { now: fixedNow },
    );
    expect(result.confidence).toBe(0.9);
    expect(result.source.extraction_confidence).toBe(0.9);
  });

  it('rejects empty inline text', async () => {
    await expect(extractText({ kind: 'text', ref: 'x', text: '   ' })).rejects.toThrow(UnsupportedSourceError);
  });

  it('extracts PDF text through the injected extractor', async () => {
    const pdf = async () => ({ text: 'CV de Ana\nExcel avanzado', pageCount: 2 });
    const result = await extractText(
      { kind: 'pdf', ref: 'intake:cv.pdf', bytes: new Uint8Array([1, 2, 3]), mimeType: 'application/pdf' },
      { pdf, now: fixedNow },
    );
    expect(result.text).toBe('CV de Ana\nExcel avanzado');
    expect(result.source.page_count).toBe(2);
    expect(result.source.byte_length).toBe(3);
  });

  it('warns when a PDF yields no text', async () => {
    const result = await extractText(
      { kind: 'pdf', ref: 'intake:scan.pdf', bytes: new Uint8Array([1]) },
      { pdf: async () => ({ text: '   ', pageCount: 1 }), now: fixedNow },
    );
    expect(result.text).toBe('');
    expect(result.warnings.join(' ')).toContain('OCR');
  });

  it('uses the injected OCR adapter for images', async () => {
    const ocr: OcrAdapter = {
      name: 'fake',
      async extract() {
        return { text: 'Foto del CV: soporte técnico', confidence: 0.7, method: 'fake-ocr' };
      },
    };
    const result = await extractText(
      { kind: 'image', ref: 'intake:foto.jpg', bytes: new Uint8Array([9]), mimeType: 'image/jpeg' },
      { ocr, now: fixedNow },
    );
    expect(result.text).toContain('soporte técnico');
    expect(result.source.extraction_method).toBe('fake-ocr');
  });

  it('falls back to human alt text when no OCR provider is configured', async () => {
    const result = await extractText(
      { kind: 'image', ref: 'intake:foto.jpg', bytes: new Uint8Array([9]), altText: 'Ayudé en la caja de la tienda' },
      { now: fixedNow },
    );
    expect(result.source.extraction_method).toBe('manual-transcription');
    expect(result.text).toBe('Ayudé en la caja de la tienda');
  });

  it('raises OcrUnavailableError when an image has neither OCR nor alt text', async () => {
    await expect(
      extractText({ kind: 'image', ref: 'intake:foto.jpg', bytes: new Uint8Array([9]) }, { now: fixedNow }),
    ).rejects.toThrow(OcrUnavailableError);
  });

  it('enforces the source size limit', async () => {
    await expect(
      extractText(
        { kind: 'pdf', ref: 'big.pdf', bytes: new Uint8Array([1, 2, 3, 4]) },
        { maxBytes: 2, pdf: async () => ({ text: 'x', pageCount: 1 }) },
      ),
    ).rejects.toThrow(SourceTooLargeError);
  });

  it('truncates oversized text and records a warning', async () => {
    const result = await extractText(
      { kind: 'text', ref: 'x', text: 'a'.repeat(50) },
      { maxChars: 10, now: fixedNow },
    );
    expect(result.text).toHaveLength(10);
    expect(result.warnings.join(' ')).toContain('truncated');
    expect(result.source.warnings).toHaveLength(1);
  });

  it('rejects binary sources without content', async () => {
    await expect(extractText({ kind: 'pdf', ref: 'x' })).rejects.toThrow(UnsupportedSourceError);
  });
});
