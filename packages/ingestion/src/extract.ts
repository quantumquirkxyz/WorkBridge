import type { IntakeSource, IntakeSourceKind } from '@workbridge/domain';
import { MAX_SOURCE_BYTES, MAX_TEXT_CHARS } from './kinds';
import { SourceTooLargeError, UnsupportedSourceError } from './errors';
import { altTextOcrAdapter, chainedOcrAdapter, type OcrAdapter, tesseractOcrAdapter } from './ocr';
import { unpdfExtractor, type PdfExtractor } from './pdf';

export interface RawIntake {
  kind: IntakeSourceKind;
  ref: string;
  mimeType?: string;
  bytes?: Uint8Array;
  text?: string;
  altText?: string;
}

export interface ExtractedText {
  text: string;
  source: IntakeSource;
  warnings: string[];
  confidence: number;
}

export interface ExtractionDeps {
  pdf?: PdfExtractor;
  ocr?: OcrAdapter;
  now?: () => Date;
  maxBytes?: number;
  maxChars?: number;
}

function requireBytes(raw: RawIntake, kind: IntakeSourceKind, maxBytes: number): Uint8Array {
  if (!raw.bytes || raw.bytes.byteLength === 0) {
    throw new UnsupportedSourceError(`Source of kind \`${kind}\` requires binary content`);
  }
  if (raw.bytes.byteLength > maxBytes) throw new SourceTooLargeError(raw.bytes.byteLength, maxBytes);
  return raw.bytes;
}

function requireText(raw: RawIntake, kind: IntakeSourceKind): string {
  const text = raw.text?.trim();
  if (!text) throw new UnsupportedSourceError(`Source of kind \`${kind}\` requires inline text`);
  return text;
}

/**
 * Convert one raw intake submission into text while preserving provenance.
 * Every branch records an `IntakeSource` describing how the text was produced.
 */
export async function extractText(raw: RawIntake, deps: ExtractionDeps = {}): Promise<ExtractedText> {
  const now = deps.now ?? (() => new Date());
  const maxBytes = deps.maxBytes ?? MAX_SOURCE_BYTES;
  const maxChars = deps.maxChars ?? MAX_TEXT_CHARS;
  const warnings: string[] = [];

  let text: string;
  let method: string;
  let confidence: number;
  let pageCount: number | undefined;
  let byteLength: number | undefined;

  switch (raw.kind) {
    case 'text':
    case 'audio_transcript': {
      text = requireText(raw, raw.kind);
      method = 'passthrough';
      confidence = raw.kind === 'audio_transcript' ? 0.9 : 1;
      break;
    }
    case 'pdf': {
      const bytes = requireBytes(raw, raw.kind, maxBytes);
      byteLength = bytes.byteLength;
      const extractor = deps.pdf ?? unpdfExtractor;
      const result = await extractor(bytes);
      text = result.text.trim();
      pageCount = result.pageCount;
      method = deps.pdf ? 'pdf-adapter' : 'unpdf';
      confidence = 0.8;
      if (!text) warnings.push('PDF contained no extractable text; it may require OCR.');
      else if (text.length < 200) warnings.push('Very little text was extracted from the PDF; OCR quality may be an issue.');
      break;
    }
    case 'image': {
      const bytes = requireBytes(raw, raw.kind, maxBytes);
      byteLength = bytes.byteLength;
      // Vision first (when configured), then human alt text, then offline
      // tesseract. The chained adapter stops at the first non-empty result.
      const adapters: OcrAdapter[] = [];
      if (deps.ocr) adapters.push(deps.ocr);
      if (raw.altText?.trim()) adapters.push(altTextOcrAdapter);
      adapters.push(tesseractOcrAdapter());
      const adapter = chainedOcrAdapter(adapters);
      const result = await adapter.extract({ bytes, mimeType: raw.mimeType, altText: raw.altText });
      text = result.text.trim();
      method = result.method;
      confidence = result.confidence;
      for (const warning of result.warnings ?? []) warnings.push(warning);
      if (!text) warnings.push('No text was extracted from the image; ask the candidate to correct it.');
      break;
    }
    default: {
      throw new UnsupportedSourceError(`Unsupported intake source kind: ${String(raw.kind)}`);
    }
  }

  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    warnings.push(`Input text was truncated to ${maxChars} characters.`);
  }

  const source: IntakeSource = {
    kind: raw.kind,
    ref: raw.ref,
    extraction_method: method,
    extracted_at: now().toISOString(),
    extracted_char_count: text.length,
  };
  if (raw.mimeType) source.mime_type = raw.mimeType;
  if (byteLength !== undefined) source.byte_length = byteLength;
  if (pageCount !== undefined) source.page_count = pageCount;
  if (confidence < 1) source.extraction_confidence = confidence;
  if (warnings.length) source.warnings = [...warnings];

  return { text, source, warnings, confidence };
}
