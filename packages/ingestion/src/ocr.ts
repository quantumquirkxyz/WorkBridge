import { OcrUnavailableError } from './errors';

/**
 * Image-to-text adapters. The hybrid pipeline from the grill doc is:
 * vision model first, `tesseract.js` as offline fallback. The caller injects
 * whichever adapter it has credentials for; tests inject deterministic fakes.
 */
export interface OcrRequest {
  bytes: Uint8Array;
  mimeType?: string;
  altText?: string;
}

export interface OcrExtraction {
  text: string;
  confidence: number;
  method: string;
  warnings?: string[];
}

export interface OcrAdapter {
  name: string;
  extract(request: OcrRequest): Promise<OcrExtraction>;
}

/**
 * Uses a human-provided transcription/description. Always available, so the
 * demo can demonstrate image intake without a configured OCR provider.
 */
export const altTextOcrAdapter: OcrAdapter = {
  name: 'manual-transcription',
  async extract(request) {
    const text = request.altText?.trim();
    if (!text) throw new OcrUnavailableError();
    return { text, confidence: 0.6, method: 'manual-transcription' };
  },
};

export interface VisionDescriber {
  describe(input: { bytes: Uint8Array; mimeType?: string }): Promise<{ text: string; confidence?: number }>;
}

/** Adapts an LLM vision call into the OCR contract. */
export function visionOcrAdapter(describer: VisionDescriber): OcrAdapter {
  return {
    name: 'vision',
    async extract(request) {
      const { text, confidence } = await describer.describe({
        bytes: request.bytes,
        mimeType: request.mimeType,
      });
      return { text: text.trim(), confidence: confidence ?? 0.75, method: 'vision' };
    },
  };
}

/**
 * Offline fallback backed by `tesseract.js`. It is loaded lazily through an
 * indirect specifier so the dependency stays optional: installs that never
 * process images do not pay for it, and unit tests never download language data.
 */
export function tesseractOcrAdapter(langs = 'spa+eng'): OcrAdapter {
  return {
    name: 'tesseract',
    async extract(request) {
      let recognize: ((image: Uint8Array, lang: string) => Promise<{ data: { text: string; confidence?: number } }>) | undefined;
      try {
        const moduleName = 'tesseract.js';
        const mod: any = await import(/* @vite-ignore */ moduleName);
        recognize = mod.recognize ?? mod.default?.recognize;
      } catch {
        recognize = undefined;
      }
      if (!recognize) throw new OcrUnavailableError();
      const result = await recognize(request.bytes, langs);
      return {
        text: result.data.text.trim(),
        confidence: (result.data.confidence ?? 60) / 100,
        method: 'tesseract',
      };
    },
  };
}

/** Try each adapter in order; return the first non-empty result. */
export function chainedOcrAdapter(adapters: readonly OcrAdapter[]): OcrAdapter {
  return {
    name: adapters.map((adapter) => adapter.name).join('+'),
    async extract(request) {
      const errors: unknown[] = [];
      for (const adapter of adapters) {
        try {
          const result = await adapter.extract(request);
          if (result.text) return result;
        } catch (error) {
          errors.push(error);
        }
      }
      // Surface the first real failure (e.g. a vision-model error) instead of
      // masking it behind a later "OCR unavailable" result.
      const firstRealError = errors.find((error) => !(error instanceof OcrUnavailableError));
      throw firstRealError ?? new OcrUnavailableError();
    },
  };
}
