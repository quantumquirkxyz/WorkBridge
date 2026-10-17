// Generates the committed PDF fixture used to exercise the real `unpdf`
// extraction path. Run with: node scripts/generate-pdf-fixture.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  here,
  "../apps/agent-runtime/fixtures/vacancies/vendor-counter.pdf",
);

const LINES = [
  "Vendedor de Mostrador",
  "Requisitos:",
  "- Experiencia en ventas",
  "- Manejo de caja",
  "- Buena presencia",
  "Deseables:",
  "- Ingles B1",
];

function escapePdf(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function contentStream(lines) {
  let y = 720;
  let body = "BT\n/F1 12 Tf\n14 TL\n";
  for (const line of lines) {
    body += `1 0 0 1 72 ${y} Tm\n(${escapePdf(line)}) Tj\n`;
    y -= 18;
  }
  return `${body}ET\n`;
}

const stream = contentStream(LINES);
const objects = {
  1: "<< /Type /Catalog /Pages 2 0 R >>",
  2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  3: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
  4: `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`,
  5: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
};

let pdf = "%PDF-1.4\n";
const offsets = {};
for (let i = 1; i <= 5; i += 1) {
  offsets[i] = Buffer.byteLength(pdf, "latin1");
  pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf, "latin1");
pdf += "xref\n0 6\n0000000000 65535 f \n";
for (let i = 1; i <= 5; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(pdf, "latin1"));
console.log(`wrote ${outPath} (${Buffer.byteLength(pdf, "latin1")} bytes)`);
