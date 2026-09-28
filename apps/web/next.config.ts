import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@vhyxui/react', '@vhyxui/core', '@vhyxui/blocks', '@vhyxchart/react', '@vhyxchart/core', '@vhyxchart/examples'],
  // Route segments starting with "_" are private in Next.js, so the canonical
  // agent manifest URL is served through a rewrite.
  async rewrites() {
    return [{ source: '/__agent__/manifest.json', destination: '/api/agent-manifest' }];
  },
};

export default config;
