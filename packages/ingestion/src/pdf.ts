import { crc32, deflateSync } from 'node:zlib';

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

export interface PdfPageImage {
  bytes: Uint8Array;
  mimeType: 'image/png';
}

const MIN_IMAGE_SIDE = 200;
const MAX_PDF_IMAGE_PAGES = 2;

/** Pull large embedded page images so a scanned CV can be read when it has no text layer. */
export async function extractEmbeddedPngs(bytes: Uint8Array): Promise<PdfPageImage[]> {
  const { extractImages, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(bytes);
  const images: PdfPageImage[] = [];
  const pages = Math.min(pdf.numPages, MAX_PDF_IMAGE_PAGES);
  for (let page = 1; page <= pages; page += 1) {
    const found = await extractImages(pdf, page);
    for (const image of found) {
      if (image.width < MIN_IMAGE_SIDE || image.height < MIN_IMAGE_SIDE) continue;
      if (image.channels !== 1 && image.channels !== 3 && image.channels !== 4) continue;
      images.push({ bytes: encodePng(image), mimeType: 'image/png' });
    }
  }
  return images;
}

function encodePng(image: { data: Uint8Array | Uint8ClampedArray; width: number; height: number; channels: 1 | 3 | 4 }): Uint8Array {
  const { width, height, channels } = image;
  const colorType = channels === 1 ? 0 : channels === 3 ? 2 : 6;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const dest = y * (stride + 1);
    raw[dest] = 0;
    Buffer.from(image.data.buffer, image.data.byteOffset + y * stride, stride).copy(raw, dest + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return new Uint8Array(png);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
