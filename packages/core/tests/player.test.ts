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
    expect((host.querySelector('.vc-controls') as HTMLElement).style.display).toBe('none');
    expect((host.querySelector('.vc-toggle') as HTMLElement).style.display).toBe('none');
    expect(host.querySelector('.vc-errors')?.textContent).toContain('Line 3');
    p.setSource('flowchart\n x --> y');
    expect(host.querySelector('.vc-errors')?.textContent).toBe('');
    expect(host.querySelectorAll('[data-vc-node]')).toHaveLength(2);
    p.destroy();
  });

  it('header shows the title, step counter, scenario tabs and Controls switch', () => {
    const host = document.createElement('div');
    const p = createPlayer(host, `---\ntitle: Checkout\n---\n${SRC}`, { autoplay: false });
    expect(host.querySelector('.vc-title')?.textContent).toBe('Checkout');
    expect(host.querySelector('svg .vc-title')).toBeNull(); // not drawn twice
    expect(host.querySelector('.vc-step')?.textContent).toBe('0 / 2');
    const tabs = host.querySelectorAll('.vc-scenarios [role="tab"]');
    expect(tabs).toHaveLength(2);
    (tabs[1] as HTMLButtonElement).click();
    expect(p.scenario).toBe(1);
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(p.toSvg()).toContain('Checkout'); // exports keep the title
    p.destroy();
  });

  it('the Controls switch shows and hides the controller and emits an event', () => {
    const host = document.createElement('div');
    const p = createPlayer(host, SRC, { autoplay: false });
    const seen: boolean[] = [];
    p.on('controls', (v) => seen.push(v));
    const toggle = host.querySelector('.vc-toggle') as HTMLButtonElement;
    const controls = host.querySelector('.vc-controls') as HTMLElement;
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    toggle.click();
    expect(p.controlsVisible).toBe(false);
    expect(controls.dataset['open']).toBe('false');
    expect(controls.hasAttribute('inert')).toBe(true);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    p.setControlsVisible(true);
    expect(controls.dataset['open']).toBe('true');
    expect(seen).toEqual([false, true]);
    p.destroy();
  });

  it('developers can hide the controller, the switch and the header, and style parts', () => {
    const host = document.createElement('div');
    const p = createPlayer(host, SRC, {
      autoplay: false,
      controls: false,
      controlsToggle: false,
      header: false,
      layout: 'plain',
      controlsPosition: 'top',
      classNames: { stage: 'my-stage' },
      styles: { stage: 'padding: 24px' },
    });
    expect((host.querySelector('.vc-controls') as HTMLElement).dataset['open']).toBe('false');
    expect((host.querySelector('.vc-header') as HTMLElement).style.display).toBe('none');
    const root = host.querySelector('.vc-player') as HTMLElement;
    expect(root.dataset['layout']).toBe('plain');
    expect(root.dataset['controlsPosition']).toBe('top');
    const stage = host.querySelector('.vc-stage') as HTMLElement;
    expect(stage.classList.contains('my-stage')).toBe(true);
    expect(stage.style.padding).toBe('24px');
    p.destroy();
  });

  it('speed is a segmented control', () => {
    const host = document.createElement('div');
    const p = createPlayer(host, SRC, { autoplay: false });
    const radios = Array.from(host.querySelectorAll<HTMLButtonElement>('.vc-speed [role="radio"]'));
    expect(radios.map((r) => r.textContent)).toEqual(['0.5×', '1×', '1.5×', '2×']);
    radios[3]?.click();
    expect(radios[3]?.getAttribute('aria-checked')).toBe('true');
    expect(radios[1]?.getAttribute('aria-checked')).toBe('false');
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
