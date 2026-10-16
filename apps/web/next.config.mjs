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
};

export default nextConfig;
