import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  turbopack: { root: process.cwd() },
};
export default config;
