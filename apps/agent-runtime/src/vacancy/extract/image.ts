import { ExtractionUnavailableError } from "../errors";
import type { TextExtractionResult } from "../types";

/**
 * Default image/OCR extractor. `tesseract.js` is imported lazily because it
 * downloads language models on first use and must not be a hard import cost
 * for structured flows. Tests inject a deterministic port instead.
 */
export async function defaultImageExtractor(
  data: Uint8Array,
  _mimeType?: string,
  _filename?: string,
): Promise<TextExtractionResult> {
  try {
    const tesseract = await import("tesseract.js");
    const result = await tesseract.recognize(Buffer.from(data), "spa+eng");
    return { text: result.data.text, extractor: "tesseract.js" };
  } catch (error) {
    if (error instanceof ExtractionUnavailableError) throw error;
    throw new ExtractionUnavailableError("image", error);
  }
}
