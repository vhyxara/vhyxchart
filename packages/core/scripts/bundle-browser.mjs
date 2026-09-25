// Builds dist/vhyxchart.global.js — a single <script> file exposing window.VhyxChart.
// Auto-registers <vhyx-chart> and, when loaded with data-auto, renders ```vhyx fences on load.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/global.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'VhyxChart',
  target: ['es2020'],
  outfile: 'dist/vhyxchart.global.js',
  legalComments: 'none',
});
console.log('dist/vhyxchart.global.js');
