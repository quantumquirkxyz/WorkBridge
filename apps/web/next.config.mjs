/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Playwright opens the suite at 127.0.0.1. Next otherwise blocks that dev origin.
  allowedDevOrigins: ['127.0.0.1'],
  transpilePackages: [
    '@workbridge/domain',
    '@workbridge/ingestion',
    '@workbridge/profile',
    '@workbridge/agent-runtime',
    '@workbridge/catalog',
    '@workbridge/training',
  ],
  serverExternalPackages: ['unpdf'],
  turbopack: {
    // `tesseract.js` is an optional, intentionally uninstalled OCR fallback.
    // Point it at a stub so the lazy import resolves during the build.
    resolveAlias: {
      'tesseract.js': './lib/optional/tesseract.ts',
    },
  },
};

export default nextConfig;
