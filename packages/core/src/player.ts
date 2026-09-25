import type { Diagnostic } from './errors.js';
import type { Diagram } from './model.js';
import { parse } from './parser/index.js';
import { layout as computeLayout } from './layout/index.js';
import type { Layout } from './layout/types.js';
import { compileTimeline, frameAt, type Frame, type Timeline } from './timeline/index.js';
import { hashId, renderDynamic, renderSvg } from './render/svg.js';
import { renderAnimatedSvg } from './render/animate.js';

/** Options for {@link createPlayer}. */
export interface PlayerOptions {
  theme?: 'auto' | 'light' | 'dark';
  /** Start playing when visible. Defaults to the diagram's `autoplay` (off under prefers-reduced-motion). */
  autoplay?: boolean;
  loop?: boolean;
  /** Show the control bar. Defaults to the diagram's `controls` and only when there is something to play. */
  controls?: boolean;
  /** Runtime speed multiplier on top of the diagram's `speed`. @default 1 */
  speed?: number;
  scenario?: number;
  /** Render parse errors inside the player. @default true */
  showErrors?: boolean;
  /** Pause while scrolled off-screen. @default true */
  pauseOffscreen?: boolean;
}

/** Events emitted by a player. */
export interface PlayerEvents {
  frame: (frame: Frame) => void;
  state: (state: { playing: boolean; time: number; duration: number; scenario: number }) => void;
  error: (diagnostics: Diagnostic[]) => void;
}

/** Imperative handle returned by {@link createPlayer}. */
export interface Player {
  readonly diagram: Diagram;
  readonly layout: Layout;
  readonly diagnostics: Diagnostic[];
  readonly timeline: Timeline;
  readonly scenarios: string[];
  readonly playing: boolean;
  readonly time: number;
  readonly scenario: number;
  play(): void;
  pause(): void;
  toggle(): void;
  /** Jump to a time in ms. */
  seek(ms: number): void;
  /** Move to the end of the next (+1) or previous (-1) step and pause. */
  step(delta: 1 | -1): void;
  restart(): void;
  setScenario(index: number): void;
  setSpeed(multiplier: number): void;
  /** Re-parse and re-render from new source (keeps scenario/time when possible). */
  setSource(source: string): void;
  /** Static SVG of the current frame, or an animated SVG. */
  toSvg(animated?: boolean): string;
  on<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): () => void;
  destroy(): void;
}

const PLAYER_CSS = `
.vc-player{position:relative;display:flex;flex-direction:column;gap:8px;max-width:100%;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Inter,sans-serif;color:inherit;outline:none}
.vc-player:focus-visible{box-shadow:0 0 0 2px #3b82f6;border-radius:8px}
.vc-player .vc-stage{overflow:auto;max-width:100%}
.vc-player .vc-stage>svg{display:block;max-width:100%;height:auto;margin:0 auto}
.vc-player .vc-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;padding:6px 8px;border:1px solid rgba(148,163,184,.35);border-radius:10px;background:rgba(148,163,184,.08)}
.vc-player .vc-btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border-radius:6px;cursor:pointer;color:inherit;font-size:13px;line-height:1}
.vc-player .vc-btn:hover{background:rgba(148,163,184,.2)}
.vc-player .vc-btn:focus-visible{box-shadow:0 0 0 2px #3b82f6}
.vc-player .vc-btn[data-primary]{background:#3b82f6;color:#fff}
.vc-player .vc-btn[data-primary]:hover{background:#2563eb}
.vc-player .vc-range{flex:1 1 120px;min-width:80px;accent-color:#3b82f6}
.vc-player .vc-time{font-variant-numeric:tabular-nums;opacity:.7;min-width:70px;text-align:right}
.vc-player select{font:inherit;color:inherit;background:transparent;border:1px solid rgba(148,163,184,.4);border-radius:6px;height:28px;padding:0 4px}
.vc-player select option{color:#0f172a}
.vc-player .vc-caption-line{font-size:13px;opacity:.8;min-height:18px;padding:0 4px}
.vc-player .vc-errors{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#ef4444;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.35);border-radius:8px;padding:8px 10px;white-space:pre-wrap}
@media (prefers-reduced-motion:reduce){.vc-player *{transition:none!important}}
`;

function injectCss(doc: Document): void {
  if (doc.getElementById('vc-player-css')) return;
  const style = doc.createElement('style');
  style.id = 'vc-player-css';
  style.textContent = PLAYER_CSS;
  doc.head.appendChild(style);
}

function fmt(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return `${s.toFixed(1)}s`;
}

let instances = 0;

/**
 * Mounts an interactive, animated diagram into `container`.
 *
 * @example
 * const player = createPlayer(document.getElementById('diagram')!, source, { theme: 'dark' });
 * player.on('state', (s) => console.log(s.playing));
 */
export function createPlayer(container: HTMLElement, source: string, options: PlayerOptions = {}): Player {
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  injectCss(doc);
  const uid = `vcp${++instances}`;
  const listeners: { [K in keyof PlayerEvents]: Set<PlayerEvents[K]> } = { frame: new Set(), state: new Set(), error: new Set() };
  const reducedMotion = !!win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let diagram!: Diagram;
  let lay!: Layout;
  let diagnostics: Diagnostic[] = [];
  let timeline!: Timeline;
  let scenario = options.scenario ?? 0;
  let time = 0;
  let playing = false;
  let speed = options.speed ?? 1;
  let raf = 0;
  let last = 0;
  let holdUntil = 0;
  let visible = true;
  let wantPlay = false;
  let svg: SVGSVGElement | null = null;
  let dynamic: Element | null = null;
  const nodeEls = new Map<string, Element>();
  const edgeEls = new Map<string, Element>();
  const msgEls = new Map<number, Element>();
  const revealEls = new Map<string, Element>();
  const cellEls = new Map<number, Element>();

  const root = doc.createElement('div');
  root.className = 'vc-player';
  root.tabIndex = 0;
  const stage = doc.createElement('div');
  stage.className = 'vc-stage';
  const caption = doc.createElement('div');
  caption.className = 'vc-caption-line';
  caption.setAttribute('aria-live', 'polite');
  const bar = doc.createElement('div');
  bar.className = 'vc-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Diagram playback');
  const errors = doc.createElement('div');
  errors.className = 'vc-errors';
  errors.setAttribute('role', 'alert');
  root.append(stage, caption, bar, errors);
  container.replaceChildren(root);

  const button = (label: string, title: string, onClick: () => void): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'vc-btn';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', onClick);
    return b;
  };
  const restartBtn = button('⏮', 'Restart', () => api.restart());
  const backBtn = button('◀', 'Previous step', () => api.step(-1));
  const playBtn = button('▶', 'Play', () => api.toggle());
  playBtn.dataset['primary'] = '';
  const fwdBtn = button('▶|', 'Next step', () => api.step(1));
  const range = doc.createElement('input');
  range.type = 'range';
  range.className = 'vc-range';
  range.min = '0';
  range.step = '1';
  range.setAttribute('aria-label', 'Timeline');
  range.addEventListener('input', () => {
    api.pause();
    api.seek(Number(range.value));
  });
  const timeLabel = doc.createElement('span');
  timeLabel.className = 'vc-time';
  const scenarioSelect = doc.createElement('select');
  scenarioSelect.setAttribute('aria-label', 'Scenario');
  scenarioSelect.addEventListener('change', () => api.setScenario(Number(scenarioSelect.value)));
  const speedSelect = doc.createElement('select');
  speedSelect.setAttribute('aria-label', 'Speed');
  for (const s of [0.5, 1, 1.5, 2, 3]) {
    const o = doc.createElement('option');
    o.value = String(s);
    o.textContent = `${s}×`;
    if (s === speed) o.selected = true;
    speedSelect.append(o);
  }
  speedSelect.addEventListener('change', () => api.setSpeed(Number(speedSelect.value)));
  bar.append(restartBtn, backBtn, playBtn, fwdBtn, range, timeLabel, scenarioSelect, speedSelect);

  const emit = <K extends keyof PlayerEvents>(event: K, payload: Parameters<PlayerEvents[K]>[0]): void => {
    for (const l of listeners[event]) (l as (p: typeof payload) => void)(payload);
  };
  const emitState = (): void => emit('state', { playing, time, duration: timeline.duration, scenario });

  const build = (src: string): void => {
    const parsed = parse(src);
    diagram = parsed.diagram;
    diagnostics = parsed.diagnostics;
    lay = computeLayout(diagram);
    if (scenario >= Math.max(1, diagram.scenarios.length)) scenario = 0;
    timeline = compileTimeline(diagram, scenario);
    const hasTimeline = timeline.duration > 0;
    const theme = options.theme ?? diagram.config.theme;
    const initial = hasTimeline ? frameAt(timeline, 0) : undefined;
    stage.innerHTML = renderSvg(diagram, lay, { id: `${uid}${hashId(src)}`, theme, ...(initial ? { frame: initial } : {}) });
    svg = stage.querySelector('svg');
    dynamic = svg?.querySelector('.vc-dynamic') ?? null;
    nodeEls.clear();
    edgeEls.clear();
    msgEls.clear();
    revealEls.clear();
    cellEls.clear();
    svg?.querySelectorAll('[data-vc-node]').forEach((el) => nodeEls.set(el.getAttribute('data-vc-node') ?? '', el));
    svg?.querySelectorAll('[data-vc-edge]').forEach((el) => edgeEls.set(el.getAttribute('data-vc-edge') ?? '', el));
    svg?.querySelectorAll('[data-vc-msg]').forEach((el) => msgEls.set(Number(el.getAttribute('data-vc-msg')), el));
    svg?.querySelectorAll('[data-vc-reveal]').forEach((el) => revealEls.set(el.getAttribute('data-vc-reveal') ?? '', el));
    svg?.querySelectorAll('[data-vc-cell]').forEach((el) => cellEls.set(Number(el.getAttribute('data-vc-cell')), el));

    const showBar = (options.controls ?? diagram.config.controls) && hasTimeline;
    bar.style.display = showBar ? '' : 'none';
    caption.style.display = hasTimeline ? '' : 'none';
    scenarioSelect.replaceChildren(
      ...diagram.scenarios.map((s, i) => {
        const o = doc.createElement('option');
        o.value = String(i);
        o.textContent = s.name;
        o.selected = i === scenario;
        return o;
      }),
    );
    scenarioSelect.style.display = diagram.kind !== 'sequence' && diagram.scenarios.length > 1 ? '' : 'none';
    range.max = String(Math.max(1, Math.round(timeline.duration)));

    const errs = diagnostics.filter((d) => d.severity === 'error');
    errors.style.display = options.showErrors !== false && errs.length > 0 ? '' : 'none';
    errors.textContent = errs.map((d) => `Line ${d.line}: ${d.message}${d.suggestion ? `\n  → ${d.suggestion}` : ''}`).join('\n');
    if (errs.length > 0) emit('error', errs);
    root.setAttribute('aria-label', diagram.config.title ?? `${diagram.kind} diagram`);
  };

  const setAttr = (el: Element, name: string, value: string | null): void => {
    if (value === null) {
      if (el.hasAttribute(name)) el.removeAttribute(name);
    } else if (el.getAttribute(name) !== value) {
      el.setAttribute(name, value);
    }
  };

  const apply = (): void => {
    if (!svg || timeline.duration <= 0) return;
    const frame = frameAt(timeline, time);
    if (lay.kind === 'flow') {
      for (const n of lay.nodes) {
        const el = nodeEls.get(n.id);
        if (!el) continue;
        const st = frame.nodeStates[n.id];
        setAttr(el, 'data-state', st && st !== 'idle' ? st : null);
        const p = frame.pulses[n.id] ?? 0;
        setAttr(el, 'transform', `translate(${n.x},${n.y})${p > 0 ? ` scale(${(1 + p * 0.06).toFixed(3)})` : ''}`);
      }
      for (const [id, el] of edgeEls) {
        setAttr(el, 'data-active', frame.activeEdges[id] ? '' : null);
        setAttr(el, 'data-visited', frame.visitedEdges[id] ? '' : null);
      }
    } else if (lay.kind === 'sequence') {
      for (const [i, el] of msgEls) {
        const p = frame.messages[i];
        setAttr(el, 'data-state', p === undefined ? 'pending' : p < 1 ? 'sending' : 'sent');
        const path = el.querySelector('.vc-msg-path');
        if (path) {
          const drawing = p !== undefined && p < 1;
          setAttr(path, 'stroke-dasharray', drawing ? '1' : null);
          setAttr(path, 'stroke-dashoffset', drawing ? String(1 - p) : null);
        }
      }
      for (const [id, el] of revealEls) setAttr(el, 'data-hidden', frame.revealed[id] ? null : '');
    } else {
      for (const [i, el] of cellEls) {
        const mark = frame.array?.marks[i];
        setAttr(el, 'data-state', mark ?? null);
        setAttr(el, 'data-compare', frame.array?.compare?.includes(i) ? '' : null);
      }
    }
    if (dynamic) dynamic.innerHTML = renderDynamic(diagram, lay, frame);
    const stepLabel = timeline.steps[frame.stepIndex]?.label;
    caption.textContent = frame.caption ?? (frame.stepIndex >= 0 && stepLabel ? `${frame.stepIndex + 1}/${timeline.steps.length} · ${stepLabel}` : '');
    range.value = String(Math.round(time));
    timeLabel.textContent = `${fmt(time)} / ${fmt(timeline.duration)}`;
    emit('frame', frame);
  };

  const tick = (now: number): void => {
    raf = 0;
    if (!playing) return;
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    if (holdUntil) {
      if (now >= holdUntil) {
        holdUntil = 0;
        time = 0;
      }
    } else {
      time += dt * speed;
      if (time >= timeline.duration) {
        time = timeline.duration;
        if (options.loop ?? diagram.config.loop) {
          holdUntil = now + 1400;
        } else {
          playing = false;
          playBtn.textContent = '▶';
          emitState();
        }
      }
    }
    apply();
    if (playing) raf = win?.requestAnimationFrame(tick) ?? 0;
  };

  const start = (): void => {
    if (playing || timeline.duration <= 0 || !win) return;
    if (time >= timeline.duration) time = 0;
    playing = true;
    last = 0;
    playBtn.textContent = '❚❚';
    playBtn.title = 'Pause';
    playBtn.setAttribute('aria-label', 'Pause');
    raf = win.requestAnimationFrame(tick);
    emitState();
  };
  const stop = (): void => {
    if (!playing) return;
    playing = false;
    holdUntil = 0;
    if (raf && win) win.cancelAnimationFrame(raf);
    raf = 0;
    playBtn.textContent = '▶';
    playBtn.title = 'Play';
    playBtn.setAttribute('aria-label', 'Play');
    emitState();
  };

  const api: Player = {
    get diagram() {
      return diagram;
    },
    get layout() {
      return lay;
    },
    get diagnostics() {
      return diagnostics;
    },
    get timeline() {
      return timeline;
    },
    get scenarios() {
      return diagram.scenarios.map((s) => s.name);
    },
    get playing() {
      return playing;
    },
    get time() {
      return time;
    },
    get scenario() {
      return scenario;
    },
    play() {
      wantPlay = true;
      if (visible) start();
    },
    pause() {
      wantPlay = false;
      stop();
    },
    toggle() {
      if (playing) api.pause();
      else api.play();
    },
    seek(ms) {
      time = Math.max(0, Math.min(timeline.duration, ms));
      holdUntil = 0;
      apply();
      emitState();
    },
    step(delta) {
      api.pause();
      const steps = timeline.steps;
      if (steps.length === 0) return;
      const eps = 1;
      if (delta > 0) {
        const next = steps.find((s) => s.end > time + eps);
        api.seek(next ? next.end : timeline.duration);
      } else {
        const prev = [...steps].reverse().find((s) => s.end < time - eps);
        api.seek(prev ? prev.end : 0);
      }
    },
    restart() {
      api.seek(0);
      api.play();
    },
    setScenario(index) {
      const was = playing;
      stop();
      scenario = index;
      timeline = compileTimeline(diagram, scenario);
      range.max = String(Math.max(1, Math.round(timeline.duration)));
      time = 0;
      apply();
      if (was || wantPlay) start();
      emitState();
    },
    setSpeed(multiplier) {
      speed = multiplier > 0 ? multiplier : 1;
      speedSelect.value = String(speed);
    },
    setSource(src) {
      const was = playing;
      stop();
      const keepTime = time;
      build(src);
      time = Math.min(keepTime, timeline.duration);
      apply();
      if (was) start();
    },
    toSvg(animated = false) {
      if (animated) return renderAnimatedSvg(diagram, { scenario, ...(options.theme ? { theme: options.theme } : {}) });
      return renderSvg(diagram, lay, { ...(timeline.duration > 0 ? { frame: frameAt(timeline, time) } : {}), ...(options.theme ? { theme: options.theme } : {}) });
    },
    on(event, listener) {
      listeners[event].add(listener as never);
      return () => listeners[event].delete(listener as never);
    },
    destroy() {
      stop();
      observer?.disconnect();
      root.removeEventListener('keydown', onKey);
      container.replaceChildren();
    },
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      api.toggle();
    } else if (e.key === 'ArrowRight' || e.key === 'l') {
      e.preventDefault();
      api.step(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'j') {
      e.preventDefault();
      api.step(-1);
    } else if (e.key === 'Home' || e.key === '0') {
      e.preventDefault();
      api.seek(0);
    }
  };
  root.addEventListener('keydown', onKey);

  build(source);
  apply();

  const IO = win && 'IntersectionObserver' in win ? (win as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver : undefined;
  const observer =
    options.pauseOffscreen !== false && IO
      ? new IO((entries) => {
          visible = entries.some((e) => e.isIntersecting);
          if (visible && wantPlay) start();
          if (!visible) stop();
        })
      : null;
  observer?.observe(root);

  const autoplay = options.autoplay ?? (diagram.config.autoplay && !reducedMotion);
  if (autoplay) api.play();
  return api;
}
