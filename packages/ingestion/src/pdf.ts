/**
 * PDF text extraction.
 *
 * The real implementation uses `unpdf` (Mozilla PDF.js, serverless build). The
 * extractor is injectable so unit tests never depend on a real PDF binary and
 * the web runtime can swap in another engine without touching callers.
 */

export interface PdfExtraction {
  text: string;
  pageCount: number;
}

export type PdfExtractor = (bytes: Uint8Array) => Promise<PdfExtraction>;

export const unpdfExtractor: PdfExtractor = async (bytes) => {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join('\n\n') : text;
  return { text: merged.trim(), pageCount: totalPages };
};
