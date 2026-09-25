import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'export',
  transpilePackages: ['@vhyxui/react', '@vhyxui/core', '@vhyxui/blocks', '@vhyxchart/react', '@vhyxchart/core', '@vhyxchart/examples'],
};

export default config;
