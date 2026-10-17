module.exports = [
"[project]/apps/web/lib/optional/tesseract.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Optional-dependency stub for `tesseract.js`.
//
// The offline OCR fallback in `@workbridge/ingestion` lazily imports `tesseract.js`,
// which is intentionally not installed. Aliasing it here keeps the bundler from
// failing to resolve that import; at runtime the adapter finds no `recognize`
// export and raises `OcrUnavailableError`, which the pipeline handles.
__turbopack_context__.s([]);
;
}),
];

//# sourceMappingURL=apps_web_lib_optional_tesseract_ts_1vfpmhdyyja3j._.js.map