/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@puente/domain',
    '@puente/ingestion',
    '@puente/profile',
    '@puente/agent-runtime',
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
