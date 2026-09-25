import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@vhyxui/react', '@vhyxui/core', '@vhyxui/blocks', '@vhyxchart/react', '@vhyxchart/core', '@vhyxchart/examples'],
  // Next.js ignores underscore route segments; serve the VhyxSeal manifest at its canonical URL (DECISION-028 pattern).
  async rewrites() {
    return [{ source: '/__agent__/manifest.json', destination: '/api/agent-manifest' }];
  },
};

export default config;
