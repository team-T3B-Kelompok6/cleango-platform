import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // TypeScript dijalankan eksplisit lewat script build sebelum Next.js build.
    ignoreBuildErrors: true,
  },
  experimental: {
    workerThreads: true,
  },
};

export default nextConfig;

