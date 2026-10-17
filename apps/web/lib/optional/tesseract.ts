// Optional-dependency stub for `tesseract.js`.
//
// The offline OCR fallback in `@puente/ingestion` lazily imports `tesseract.js`,
// which is intentionally not installed. Aliasing it here keeps the bundler from
// failing to resolve that import; at runtime the adapter finds no `recognize`
// export and raises `OcrUnavailableError`, which the pipeline handles.
export {};
