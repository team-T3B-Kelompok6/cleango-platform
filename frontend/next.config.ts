import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
const config: NextConfig = {
  distDir: process.env.CLEANGO_QA_DIST_DIR || '.next',
  poweredByHeader: false,
  outputFileTracingExcludes: { '/*': ['./.local/**/*'] },
  devIndicators: false,
  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
    agentUpgrade: 'security',
  },
  turbopack: { root: fileURLToPath(new URL('..', import.meta.url)) },
  async headers() {
    return [
      {
        source: '/tugas/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};
export default config;
