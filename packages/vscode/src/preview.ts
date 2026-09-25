/**
 * Runs inside VS Code's Markdown preview. Upgrades the placeholders emitted
 * by the markdown-it plugin into animated players, and again after every
 * live update of the preview.
 */
import { createPlayer, type Player } from '@vhyxchart/core/browser';

let players: Player[] = [];

function currentTheme(el: HTMLElement): 'light' | 'dark' {
  const configured = el.getAttribute('data-theme');
  if (configured === 'light' || configured === 'dark') return configured;
  const body = document.body.classList;
  return body.contains('vscode-dark') || body.contains('vscode-high-contrast') ? 'dark' : 'light';
}

function renderAll(): void {
  for (const p of players) p.destroy();
  players = [];
  document.querySelectorAll<HTMLElement>('div.vhyxchart[data-source]').forEach((el) => {
    const source = el.getAttribute('data-source') ?? '';
    const autoplay = el.getAttribute('data-autoplay') !== 'false';
    el.removeAttribute('data-source');
    players.push(createPlayer(el, source, { theme: currentTheme(el), autoplay }));
  });
}

window.addEventListener('vscode.markdown.updateContent', renderAll);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderAll);
else renderAll();
