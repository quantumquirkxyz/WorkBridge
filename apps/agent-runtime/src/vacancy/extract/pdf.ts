import { ExtractionUnavailableError } from "../errors";
import type { TextExtractionResult } from "../types";

interface MaybeTextItem {
  str?: unknown;
  transform?: unknown;
}

/** Group pdf.js text items into visual lines using their y coordinate. */
function joinTextItems(items: readonly unknown[]): string {
  const rows: Array<{ y: number; text: string }> = [];
  for (const raw of items) {
    const item = raw as MaybeTextItem;
    if (typeof item.str !== "string" || item.str.length === 0) continue;
    const transform = Array.isArray(item.transform) ? item.transform : [];
    const y = typeof transform[5] === "number" ? transform[5] : 0;
    const last = rows[rows.length - 1];
    if (last !== undefined && Math.abs(last.y - y) <= 2) {
      last.text = `${last.text} ${item.str}`;
    } else {
      rows.push({ y, text: item.str });
    }
  }
  return rows.map((row) => row.text).join("\n");
}

/**
 * Default PDF text extractor. `unpdf` is imported lazily so the module can be
 * loaded in environments that only ever handle structured or JSON input.
 * Lines are reconstructed explicitly because merged page text loses the column
 * breaks that the requirement parser depends on.
 */
export async function defaultPdfExtractor(
  data: Uint8Array,
  _filename?: string,
): Promise<TextExtractionResult> {
  try {
    const unpdf = await import("unpdf");
    const document = await unpdf.getDocumentProxy(new Uint8Array(data));
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(joinTextItems(content.items as readonly unknown[]));
    }
    return { text: pages.join("\n"), extractor: "unpdf" };
  } catch (error) {
    if (error instanceof ExtractionUnavailableError) throw error;
    throw new ExtractionUnavailableError("pdf", error);
  }
}
