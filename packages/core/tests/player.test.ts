// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createPlayer, autoRender, defineElement } from '../src/browser.js';

const SRC = `flowchart LR
  a --> b
scenario one
  a -> b : hi
  b is done
scenario two
  a -> b
  b is error`;

describe('player (DOM)', () => {
  it('mounts an SVG, controls and caption', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const p = createPlayer(host, SRC, { autoplay: false });
    expect(host.querySelector('svg.vc')).not.toBeNull();
    expect(host.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(p.scenarios).toEqual(['one', 'two']);
    expect(p.playing).toBe(false);
    p.destroy();
    expect(host.children).toHaveLength(0);
  });

  it('seek and step update DOM state; setScenario recompiles', () => {
    const host = document.createElement('div');
    const p = createPlayer(host, SRC, { autoplay: false });
    const states: boolean[] = [];
    p.on('state', (s) => states.push(s.playing));
    p.step(1);
    p.step(1);
    expect(host.querySelector('[data-vc-node="b"]')?.getAttribute('data-state')).toBe('done');
    expect(host.querySelector('[data-vc-edge="a->b"]')?.hasAttribute('data-visited')).toBe(true);
    p.step(-1);
    expect(host.querySelector('[data-vc-node="b"]')?.hasAttribute('data-state')).toBe(false);
    p.seek(p.timeline.duration * 0.3);
    expect(host.querySelectorAll('.vc-token')).toHaveLength(1);
    p.setScenario(1);
    p.seek(1e9);
    expect(host.querySelector('[data-vc-node="b"]')?.getAttribute('data-state')).toBe('error');
    expect(states.length).toBeGreaterThan(0);
    p.destroy();
  });

  it('hides controls when there is nothing to play and shows parse errors', () => {
    const host = document.createElement('div');
    const onError = vi.fn();
    const p = createPlayer(host, 'flowchart\n a --> b\n ??? nope', { autoplay: false });
    p.on('error', onError);
    expect((host.querySelector('[role="toolbar"]') as HTMLElement).style.display).toBe('none');
    expect(host.querySelector('.vc-errors')?.textContent).toContain('Line 3');
    p.setSource('flowchart\n x --> y');
    expect(host.querySelector('.vc-errors')?.textContent).toBe('');
    expect(host.querySelectorAll('[data-vc-node]')).toHaveLength(2);
    p.destroy();
  });

  it('toSvg exports static and animated SVG', () => {
    const p = createPlayer(document.createElement('div'), SRC, { autoplay: false });
    expect(p.toSvg()).toContain('<svg');
    expect(p.toSvg(true)).toContain('animateMotion');
  });

  it('keyboard: space toggles, arrows step', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const p = createPlayer(host, SRC, { autoplay: false });
    const root = host.querySelector('.vc-player') as HTMLElement;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(p.time).toBeGreaterThan(0);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(p.time).toBe(0);
    p.destroy();
  });

  it('autoRender replaces code fences once', () => {
    document.body.innerHTML = '<pre><code class="language-vhyx">flowchart\n a --> b</code></pre><pre><code class="language-js">x</code></pre>';
    expect(autoRender(document, { autoplay: false })).toHaveLength(1);
    expect(autoRender(document, { autoplay: false })).toHaveLength(0);
    expect(document.querySelectorAll('svg.vc')).toHaveLength(1);
    expect(document.querySelector('code.language-js')).not.toBeNull();
  });

  it('defines <vhyx-chart>', () => {
    defineElement();
    document.body.innerHTML = '<vhyx-chart autoplay="false">flowchart\n a --> b</vhyx-chart>';
    expect(document.querySelector('vhyx-chart svg.vc')).not.toBeNull();
  });
});
