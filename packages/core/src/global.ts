import { autoRender, defineElement } from './browser.js';

export * from './browser.js';

defineElement();

// <script src="vhyxchart.global.js" data-auto></script> renders fences on load.
const current = typeof document !== 'undefined' ? (document.currentScript as HTMLScriptElement | null) : null;
if (current?.hasAttribute('data-auto')) {
  const run = (): void => void autoRender(document, { mermaid: current.getAttribute('data-mermaid') !== null });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}
