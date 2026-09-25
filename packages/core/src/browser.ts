/**
 * Browser entry: interactive player, `<vhyx-chart>` custom element, and
 * Mermaid-style auto rendering of Markdown code fences.
 *
 *   <script type="module">
 *     import { autoRender } from '@vhyxchart/core/browser';
 *     autoRender();
 *   </script>
 */
import { createPlayer, type Player, type PlayerOptions } from './player.js';

export * from './index.js';
export { createPlayer, type Player, type PlayerOptions, type PlayerEvents } from './player.js';

const SELECTOR = 'pre > code.language-vhyx, pre > code.language-vhyxchart, pre.language-vhyx, pre.language-vhyxchart, .vhyxchart[data-source], div.vhyxchart:not([data-vc-mounted])';

/**
 * Finds diagram blocks and mounts players. Handles:
 * - Markdown fences rendered as `<pre><code class="language-vhyx">` (also `vhyxchart`, and `mermaid` when enabled)
 * - `<div class="vhyxchart">source</div>` and `<div class="vhyxchart" data-source="…">`
 *
 * Safe to call repeatedly (already-mounted blocks are skipped).
 * @returns The created players.
 */
export function autoRender(root: ParentNode = document, options: PlayerOptions & { mermaid?: boolean } = {}): Player[] {
  const players: Player[] = [];
  const selector = options.mermaid ? `${SELECTOR}, pre > code.language-mermaid` : SELECTOR;
  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const host = el.tagName === 'CODE' && el.parentElement ? el.parentElement : el;
    if (host.hasAttribute('data-vc-mounted')) return;
    const source = el.getAttribute('data-source') ?? el.textContent ?? '';
    const target = el.ownerDocument.createElement('div');
    target.className = 'vhyxchart';
    target.setAttribute('data-vc-mounted', '');
    host.replaceWith(target);
    players.push(createPlayer(target, source, options));
  });
  return players;
}

/**
 * Registers `<vhyx-chart>`: put diagram source inside the tag, or in a `src`
 * attribute pointing to a `.vhyx` file. Attributes: theme, autoplay, controls, scenario.
 *
 *   <vhyx-chart theme="dark">
 *     flowchart LR
 *       A --> B
 *   </vhyx-chart>
 */
export function defineElement(tagName = 'vhyx-chart'): void {
  if (typeof customElements === 'undefined' || customElements.get(tagName)) return;
  class VhyxChartElement extends HTMLElement {
    private player: Player | null = null;
    private source = '';
    static get observedAttributes(): string[] {
      return ['theme', 'src', 'scenario'];
    }
    connectedCallback(): void {
      this.source = this.source || this.textContent || '';
      const src = this.getAttribute('src');
      if (src) {
        void fetch(src)
          .then((r) => r.text())
          .then((text) => this.mount(text));
      } else {
        this.mount(this.source);
      }
    }
    disconnectedCallback(): void {
      this.player?.destroy();
      this.player = null;
    }
    attributeChangedCallback(): void {
      if (this.player) this.mount(this.source);
    }
    get chart(): Player | null {
      return this.player;
    }
    set code(value: string) {
      this.source = value;
      if (this.player) this.player.setSource(value);
      else if (this.isConnected) this.mount(value);
    }
    private mount(source: string): void {
      this.source = source;
      this.player?.destroy();
      const theme = this.getAttribute('theme');
      const scenario = this.getAttribute('scenario');
      const flag = (name: string): boolean | undefined => (this.hasAttribute(name) ? this.getAttribute(name) !== 'false' : undefined);
      const autoplay = flag('autoplay');
      const controls = flag('controls');
      this.player = createPlayer(this, source, {
        ...(theme === 'light' || theme === 'dark' || theme === 'auto' ? { theme } : {}),
        ...(scenario !== null ? { scenario: Number(scenario) } : {}),
        ...(autoplay !== undefined ? { autoplay } : {}),
        ...(controls !== undefined ? { controls } : {}),
      });
    }
  }
  customElements.define(tagName, VhyxChartElement);
}
