// Bundles the extension host code (CJS, vscode external) and the preview scripts.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
mkdirSync('dist', { recursive: true });
await build({ entryPoints: ['src/extension.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'node18', external: ['vscode'], outfile: 'dist/extension.js', minify: true });
await build({ entryPoints: ['src/preview.ts'], bundle: true, platform: 'browser', format: 'iife', target: 'es2020', outfile: 'dist/preview.js', minify: true });
copyFileSync(require.resolve('@vhyxchart/core/vhyxchart.global.js'), 'dist/vhyxchart.global.js');
console.log('extension built');
