import type { Diagnostic } from './errors.js';
import type { Diagram } from './model.js';
import { parse } from './parser/index.js';
import { layout as computeLayout } from './layout/index.js';
import type { Layout } from './layout/types.js';
import { compileTimeline, frameAt, type Frame, type Timeline } from './timeline/index.js';
import { hashId, renderDynamic, renderSvg } from './render/svg.js';
import { renderAnimatedSvg } from './render/animate.js';

/**
 * Player control icons: the Vhyxara media drawings (play, pause, skip-back, skip-forward from @vhyxui/icons),
 * filled with the button's text colour so they stay legible at 14px. Fixed, trusted markup.
 */
const icon = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
const ICONS = {
  restart: icon('<path d="M6 5v14"/><path d="M19 6.2v11.6a1 1 0 0 1-1.55.83L9.3 12.83a1 1 0 0 1 0-1.66l8.15-5.8a1 1 0 0 1 1.55.83Z"/>'),
  back: icon('<path d="M16 5.8v12.4a1 1 0 0 1-1.52.85l-10-6.2a1 1 0 0 1 0-1.7l10-6.2A1 1 0 0 1 16 5.8Z"/>'),
  play: icon('<path d="M8 5.8v12.4a1 1 0 0 0 1.52.85l10-6.2a1 1 0 0 0 0-1.7l-10-6.2A1 1 0 0 0 8 5.8Z"/>'),
  pause: icon('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'),
  forward: icon('<path d="M18 5v14"/><path d="M5 6.2v11.6a1 1 0 0 0 1.55.83l8.15-5.8a1 1 0 0 0 0-1.66L6.55 5.37A1 1 0 0 0 5 6.2Z"/>'),
};

/** Named parts of the player, for `classNames` and `styles`. */
export type PlayerSlot =
  | 'root'
  | 'header'
  | 'title'
  | 'stage'
  | 'caption'
  | 'controls'
  | 'button'
  | 'play'
  | 'progress'
  | 'speed'
  | 'scenarios'
  | 'toggle';

/** Options for {@link createPlayer}. */
export interface PlayerOptions {
  theme?: 'auto' | 'light' | 'dark';
  /** Start playing when visible. Defaults to the diagram's `autoplay` (off under prefers-reduced-motion). */
  autoplay?: boolean;
  loop?: boolean;
  /**
   * Show the controller (play, steps, timeline, speed). Defaults to the diagram's `controls`. Only shown
   * when there is something to play. When the header toggle is on, readers can still open and close it.
   */
  controls?: boolean;
  /** Show the Controls switch in the header so readers can show or hide the controller. @default true */
  controlsToggle?: boolean;
  /** Where the controller sits. @default 'bottom' */
  controlsPosition?: 'top' | 'bottom';
  /** Show the header (title, step counter, scenarios, Controls switch). @default true */
  header?: boolean;
  /** Header title. Defaults to the diagram's `title`. */
  title?: string;
  /** `card` frames the player; `plain` drops the frame to sit inside your own container. @default 'card' */
  layout?: 'card' | 'plain';
  /** Extra class names per part. */
  classNames?: Partial<Record<PlayerSlot, string>>;
  /** Inline CSS text per part, e.g. `{ stage: 'padding: 24px' }`. */
  styles?: Partial<Record<PlayerSlot, string>>;
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
  /** The controller was shown or hidden (by the reader or by `setControlsVisible`). */
  controls: (visible: boolean) => void;
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
  /** Whether the controller is currently shown. */
  readonly controlsVisible: boolean;
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
  /** Show or hide the controller. */
  setControlsVisible(visible: boolean): void;
  /** Re-parse and re-render from new source (keeps scenario/time when possible). */
  setSource(source: string): void;
  /** Static SVG of the current frame, or an animated SVG. */
  toSvg(animated?: boolean): string;
  on<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): () => void;
  destroy(): void;
}

const PLAYER_CSS = `
.vc-player{
  --vc-font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Inter,sans-serif;
  --vc-mono:ui-monospace,SFMono-Regular,Menlo,monospace;
  --vc-radius:14px;
  --vc-text:#0f172a;--vc-muted:#64748b;--vc-surface:#ffffff;--vc-surface-2:#f6f8fb;--vc-border:rgba(15,23,42,.10);
  --vc-track:rgba(15,23,42,.10);--vc-accent:#0284c7;--vc-accent-soft:rgba(2,132,199,.12);--vc-on-accent:#ffffff;
  --vc-ring:0 0 0 2px var(--vc-surface),0 0 0 4px var(--vc-accent);
  --vc-ease:cubic-bezier(.22,1,.36,1);
  position:relative;display:flex;flex-direction:column;max-width:100%;min-width:0;container-type:inline-size;container-name:vc-player;
  font-family:var(--vc-font);color:var(--vc-text);outline:none;
}
.vc-player[data-vc-theme=dark]{--vc-text:#e6e9f2;--vc-muted:#8a93a8;--vc-surface:#0d111b;--vc-surface-2:#0a0d15;--vc-border:rgba(148,163,184,.16);--vc-track:rgba(148,163,184,.18);--vc-accent:#38bdf8;--vc-accent-soft:rgba(56,189,248,.14);--vc-on-accent:#04121c}
@media (prefers-color-scheme:dark){.vc-player[data-vc-theme=auto]{--vc-text:#e6e9f2;--vc-muted:#8a93a8;--vc-surface:#0d111b;--vc-surface-2:#0a0d15;--vc-border:rgba(148,163,184,.16);--vc-track:rgba(148,163,184,.18);--vc-accent:#38bdf8;--vc-accent-soft:rgba(56,189,248,.14);--vc-on-accent:#04121c}}
:root[data-theme=dark] .vc-player[data-vc-theme=auto],.dark .vc-player[data-vc-theme=auto]{--vc-text:#e6e9f2;--vc-muted:#8a93a8;--vc-surface:#0d111b;--vc-surface-2:#0a0d15;--vc-border:rgba(148,163,184,.16);--vc-track:rgba(148,163,184,.18);--vc-accent:#38bdf8;--vc-accent-soft:rgba(56,189,248,.14);--vc-on-accent:#04121c}
:root[data-theme=light] .vc-player[data-vc-theme=auto],.light .vc-player[data-vc-theme=auto]{--vc-text:#0f172a;--vc-muted:#64748b;--vc-surface:#ffffff;--vc-surface-2:#f6f8fb;--vc-border:rgba(15,23,42,.10);--vc-track:rgba(15,23,42,.10);--vc-accent:#0284c7;--vc-accent-soft:rgba(2,132,199,.12);--vc-on-accent:#ffffff}
.vc-player[data-layout=card]{background:var(--vc-surface);border:1px solid var(--vc-border);border-radius:var(--vc-radius);overflow:hidden}
.vc-player:focus-visible{box-shadow:var(--vc-ring);border-radius:var(--vc-radius)}
.vc-player[data-controls-position=top] .vc-controls{order:1}
.vc-player[data-controls-position=top] .vc-stage{order:2}
.vc-player[data-controls-position=top] .vc-caption{order:3}
.vc-player[data-controls-position=top] .vc-errors{order:4}

.vc-player .vc-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--vc-border)}
.vc-player[data-layout=plain] .vc-header{padding:0 0 10px}
.vc-player .vc-heading{display:flex;align-items:center;gap:10px;min-width:0}
.vc-player .vc-title{font-size:14px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vc-player .vc-step{font:500 11px/1 var(--vc-mono);color:var(--vc-muted);padding:4px 7px;border-radius:999px;background:var(--vc-surface-2);border:1px solid var(--vc-border);white-space:nowrap;font-variant-numeric:tabular-nums}
.vc-player .vc-header-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px 10px;margin-left:auto;min-width:0;max-width:100%}

.vc-player .vc-scenarios{display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:var(--vc-surface-2);border:1px solid var(--vc-border);max-width:100%;overflow-x:auto;scrollbar-width:none}
.vc-player .vc-chip{all:unset;box-sizing:border-box;cursor:pointer;padding:4px 10px;border-radius:7px;font-size:12px;color:var(--vc-muted);white-space:nowrap;transition:color .2s var(--vc-ease),background-color .2s var(--vc-ease)}
.vc-player .vc-chip:hover{color:var(--vc-text)}
.vc-player .vc-chip[aria-selected=true]{background:var(--vc-surface);color:var(--vc-text);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.vc-player .vc-chip:focus-visible{box-shadow:var(--vc-ring)}

.vc-player .vc-toggle{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--vc-muted);border-radius:999px;padding:2px 2px 2px 6px}
.vc-player .vc-toggle:hover{color:var(--vc-text)}
.vc-player .vc-toggle:focus-visible{box-shadow:var(--vc-ring)}
.vc-player .vc-toggle-track{position:relative;width:30px;height:18px;border-radius:999px;background:var(--vc-track);transition:background-color .2s var(--vc-ease)}
.vc-player .vc-toggle-thumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .28s var(--vc-ease)}
.vc-player .vc-toggle[aria-checked=true] .vc-toggle-track{background:var(--vc-accent)}
.vc-player .vc-toggle[aria-checked=true] .vc-toggle-thumb{transform:translateX(12px)}

.vc-player .vc-stage{overflow:auto;max-width:100%;padding:14px}
.vc-player[data-layout=plain] .vc-stage{padding:0}
.vc-player .vc-stage>svg{display:block;max-width:100%;height:auto;margin:0 auto}
.vc-player .vc-caption{min-height:20px;padding:0 16px 12px;font-size:13px;line-height:1.5;color:var(--vc-muted);text-align:center}
.vc-player[data-layout=plain] .vc-caption{padding:8px 0 0}

.vc-player .vc-controls{display:grid;grid-template-rows:1fr;transition:grid-template-rows .3s var(--vc-ease),opacity .2s var(--vc-ease)}
.vc-player .vc-controls[data-open=false]{grid-template-rows:0fr;opacity:0}
.vc-player .vc-controls-inner{min-height:0;overflow:hidden}
.vc-player .vc-bar{display:flex;align-items:center;gap:12px;padding:10px 14px;border-top:1px solid var(--vc-border);background:var(--vc-surface-2)}
.vc-player[data-controls-position=top] .vc-bar{border-top:0;border-bottom:1px solid var(--vc-border)}
.vc-player[data-layout=plain] .vc-bar{margin-top:10px;border:1px solid var(--vc-border);border-radius:12px}
.vc-player .vc-transport{display:flex;align-items:center;gap:2px}
.vc-player .vc-btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;cursor:pointer;color:var(--vc-muted);transition:color .15s var(--vc-ease),background-color .15s var(--vc-ease),transform .1s var(--vc-ease)}
.vc-player .vc-btn:hover{color:var(--vc-text);background:var(--vc-accent-soft)}
.vc-player .vc-btn:active{transform:scale(.92)}
.vc-player .vc-btn:focus-visible{box-shadow:var(--vc-ring)}
.vc-player .vc-btn[data-primary]{width:36px;height:36px;margin:0 4px;border-radius:999px;background:var(--vc-accent);color:var(--vc-on-accent);box-shadow:0 2px 8px var(--vc-accent-soft)}
.vc-player .vc-btn[data-primary]:hover{filter:brightness(1.08);background:var(--vc-accent);color:var(--vc-on-accent)}
.vc-player .vc-timeline{flex:1 1 160px;display:flex;align-items:center;gap:10px;min-width:0}
.vc-player .vc-progress{position:relative;flex:1;height:22px;display:flex;align-items:center;border-radius:999px}
.vc-player .vc-progress-track{position:relative;width:100%;height:4px;border-radius:999px;background:var(--vc-track);overflow:visible}
.vc-player .vc-progress-fill{position:absolute;inset:0 auto 0 0;width:var(--vc-progress,0%);border-radius:inherit;background:var(--vc-accent)}
.vc-player .vc-progress-tick{position:absolute;top:50%;width:2px;height:8px;margin:-4px 0 0 -1px;border-radius:2px;background:var(--vc-track)}
.vc-player .vc-progress-tick[data-done]{background:var(--vc-surface);opacity:.55}
.vc-player .vc-progress-thumb{position:absolute;top:50%;left:var(--vc-progress,0%);width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:999px;background:var(--vc-surface);border:2px solid var(--vc-accent);box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .15s var(--vc-ease)}
.vc-player .vc-progress:hover .vc-progress-thumb{transform:scale(1.15)}
.vc-player .vc-progress:focus-within .vc-progress-thumb{box-shadow:var(--vc-ring)}
.vc-player .vc-range{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.vc-player .vc-time{font:500 12px/1 var(--vc-mono);color:var(--vc-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.vc-player .vc-speed{display:inline-flex;gap:1px;padding:2px;border-radius:8px;background:var(--vc-surface);border:1px solid var(--vc-border)}
.vc-player .vc-speed .vc-chip{padding:3px 7px;border-radius:6px;font:500 11px/1.2 var(--vc-mono)}
.vc-player .vc-speed .vc-chip[aria-checked=true]{background:var(--vc-accent-soft);color:var(--vc-accent);box-shadow:none}
.vc-player .vc-errors{margin:0 14px 14px;font:12px var(--vc-mono);color:#ef4444;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.35);border-radius:8px;padding:8px 10px;white-space:pre-wrap}
@container vc-player (max-width:560px){.vc-bar{flex-wrap:wrap;justify-content:space-between;gap:8px 10px}.vc-timeline{order:3;flex-basis:100%}}
@container vc-player (max-width:460px){.vc-header-actions{margin-left:0;width:100%;justify-content:space-between}}
@media (prefers-reduced-motion:reduce){.vc-player *,.vc-player .vc-controls{transition:none!important}}
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
  const listeners: { [K in keyof PlayerEvents]: Set<PlayerEvents[K]> } = { frame: new Set(), state: new Set(), error: new Set(), controls: new Set() };
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

  const SPEEDS = [0.5, 1, 1.5, 2];
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, slot?: PlayerSlot): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    node.className = slot && options.classNames?.[slot] ? `${cls} ${options.classNames[slot]}` : cls;
    const css = slot ? options.styles?.[slot] : undefined;
    if (css) node.style.cssText = node.style.cssText ? `${node.style.cssText};${css}` : css;
    return node;
  };

  const root = el('div', 'vc-player', 'root');
  root.tabIndex = 0;
  root.dataset['layout'] = options.layout ?? 'card';
  root.dataset['controlsPosition'] = options.controlsPosition ?? 'bottom';

  // Header: title + step counter | scenario tabs + Controls switch
  const header = el('div', 'vc-header', 'header');
  const heading = el('div', 'vc-heading');
  const titleEl = el('span', 'vc-title', 'title');
  const stepEl = el('span', 'vc-step');
  heading.append(titleEl, stepEl);
  const headerActions = el('div', 'vc-header-actions');
  const scenarioTabs = el('div', 'vc-scenarios', 'scenarios');
  scenarioTabs.setAttribute('role', 'tablist');
  scenarioTabs.setAttribute('aria-label', 'Scenario');
  const toggleBtn = el('button', 'vc-toggle', 'toggle');
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('role', 'switch');
  toggleBtn.innerHTML = '<span>Controls</span><span class="vc-toggle-track" aria-hidden="true"><span class="vc-toggle-thumb"></span></span>';
  toggleBtn.addEventListener('click', () => api.setControlsVisible(!controlsVisible));
  headerActions.append(scenarioTabs, toggleBtn);
  header.append(heading, headerActions);

  const stage = el('div', 'vc-stage', 'stage');
  const caption = el('div', 'vc-caption', 'caption');
  caption.setAttribute('aria-live', 'polite');

  // Controller: collapsible (grid 1fr ↔ 0fr) so it opens and closes smoothly
  const controlsEl = el('div', 'vc-controls', 'controls');
  const controlsInner = el('div', 'vc-controls-inner');
  const bar = el('div', 'vc-bar');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Diagram playback');
  controlsInner.append(bar);
  controlsEl.append(controlsInner);

  const errors = el('div', 'vc-errors');
  errors.setAttribute('role', 'alert');
  root.append(header, stage, caption, controlsEl, errors);
  container.replaceChildren(root);

  const button = (icon: string, title: string, onClick: () => void, slot: PlayerSlot = 'button'): HTMLButtonElement => {
    const b = el('button', 'vc-btn', slot);
    b.type = 'button';
    b.innerHTML = icon;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', onClick);
    return b;
  };
  const transport = el('div', 'vc-transport');
  const restartBtn = button(ICONS.restart, 'Restart', () => api.restart());
  const backBtn = button(ICONS.back, 'Previous step', () => api.step(-1));
  const playBtn = button(ICONS.play, 'Play', () => api.toggle(), 'play');
  playBtn.dataset['primary'] = '';
  const fwdBtn = button(ICONS.forward, 'Next step', () => api.step(1));
  transport.append(restartBtn, backBtn, playBtn, fwdBtn);

  // Timeline: a drawn track (fill, step ticks, thumb) under a transparent native range for input and a11y
  const timelineEl = el('div', 'vc-timeline');
  const progress = el('div', 'vc-progress', 'progress');
  const track = el('div', 'vc-progress-track');
  const fill = el('div', 'vc-progress-fill');
  const ticks = el('div', '');
  const thumb = el('div', 'vc-progress-thumb');
  track.append(fill, ticks, thumb);
  const range = el('input', 'vc-range');
  range.type = 'range';
  range.min = '0';
  range.step = '1';
  range.setAttribute('aria-label', 'Timeline');
  range.addEventListener('input', () => {
    api.pause();
    api.seek(Number(range.value));
  });
  progress.append(track, range);
  const timeLabel = el('span', 'vc-time');
  timelineEl.append(progress, timeLabel);

  const speedGroup = el('div', 'vc-speed', 'speed');
  speedGroup.setAttribute('role', 'radiogroup');
  speedGroup.setAttribute('aria-label', 'Speed');
  const speedButtons = SPEEDS.map((v) => {
    const b = el('button', 'vc-chip');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.textContent = `${v}×`;
    b.addEventListener('click', () => api.setSpeed(v));
    return b;
  });
  speedGroup.append(...speedButtons);
  bar.append(transport, timelineEl, speedGroup);

  let controlsVisible = true;
  let controlsAvailable = false;
  const renderControls = (): void => {
    const open = controlsAvailable && controlsVisible;
    controlsEl.dataset['open'] = String(open);
    controlsEl.style.display = controlsAvailable ? '' : 'none';
    if (open) controlsEl.removeAttribute('inert');
    else controlsEl.setAttribute('inert', '');
    toggleBtn.setAttribute('aria-checked', String(open));
    toggleBtn.setAttribute('aria-label', open ? 'Hide playback controls' : 'Show playback controls');
  };
  const renderSpeed = (): void => {
    speedButtons.forEach((b, i) => b.setAttribute('aria-checked', String(SPEEDS[i] === speed)));
  };
  const renderScenarioTabs = (): void => {
    scenarioTabs.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-selected', String(i === scenario)));
  };
  const renderTicks = (): void => {
    const total = timeline.duration || 1;
    ticks.replaceChildren(
      ...timeline.steps.slice(0, -1).map((step) => {
        const t = el('span', 'vc-progress-tick');
        t.style.left = `${(step.end / total) * 100}%`;
        t.dataset['end'] = String(step.end);
        return t;
      }),
    );
  };

  const emit = <K extends keyof PlayerEvents>(event: K, payload: Parameters<PlayerEvents[K]>[0]): void => {
    for (const l of listeners[event]) (l as (p: typeof payload) => void)(payload);
  };
  const emitState = (): void => emit('state', { playing, time, duration: timeline.duration, scenario });

  const build = (src: string): void => {
    const parsed = parse(src);
    diagram = parsed.diagram;
    diagnostics = parsed.diagnostics;
    if (scenario >= Math.max(1, diagram.scenarios.length)) scenario = 0;
    timeline = compileTimeline(diagram, scenario);
    const hasTimeline = timeline.duration > 0;
    const theme = options.theme ?? diagram.config.theme;
    root.dataset['vcTheme'] = theme;

    // Header: shown when enabled and it has something to show. When it carries the title, the stage is drawn
    // without the diagram's own title (no duplicate, no reserved space). Exports keep the title.
    const title = options.title ?? diagram.config.title;
    const multiScenario = diagram.kind !== 'sequence' && diagram.scenarios.length > 1;
    const showToggle = hasTimeline && options.controlsToggle !== false;
    const showHeader = options.header !== false && Boolean(title || hasTimeline || multiScenario || showToggle);
    header.style.display = showHeader ? '' : 'none';
    titleEl.textContent = title ?? '';
    titleEl.style.display = title ? '' : 'none';
    stepEl.style.display = hasTimeline ? '' : 'none';
    toggleBtn.style.display = showToggle ? '' : 'none';
    const titleInHeader = showHeader && Boolean(title);
    const { title: _omit, ...configWithoutTitle } = diagram.config;
    const drawn: Diagram = titleInHeader ? { ...diagram, config: configWithoutTitle } : diagram;

    lay = computeLayout(drawn);
    const initial = hasTimeline ? frameAt(timeline, 0) : undefined;
    stage.innerHTML = renderSvg(drawn, lay, { id: `${uid}${hashId(src)}`, theme, background: false, ...(initial ? { frame: initial } : {}) });
    svg = stage.querySelector('svg');
    if (titleInHeader && title) svg?.setAttribute('aria-label', title);
    dynamic = svg?.querySelector('.vc-dynamic') ?? null;
    nodeEls.clear();
    edgeEls.clear();
    msgEls.clear();
    revealEls.clear();
    cellEls.clear();
    svg?.querySelectorAll('[data-vc-node]').forEach((n) => nodeEls.set(n.getAttribute('data-vc-node') ?? '', n));
    svg?.querySelectorAll('[data-vc-edge]').forEach((n) => edgeEls.set(n.getAttribute('data-vc-edge') ?? '', n));
    svg?.querySelectorAll('[data-vc-msg]').forEach((n) => msgEls.set(Number(n.getAttribute('data-vc-msg')), n));
    svg?.querySelectorAll('[data-vc-reveal]').forEach((n) => revealEls.set(n.getAttribute('data-vc-reveal') ?? '', n));
    svg?.querySelectorAll('[data-vc-cell]').forEach((n) => cellEls.set(Number(n.getAttribute('data-vc-cell')), n));

    controlsAvailable = hasTimeline;
    renderControls();
    caption.style.display = hasTimeline ? '' : 'none';
    scenarioTabs.replaceChildren(
      ...diagram.scenarios.map((sc, i) => {
        const b = el('button', 'vc-chip');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.textContent = sc.name;
        b.addEventListener('click', () => api.setScenario(i));
        return b;
      }),
    );
    scenarioTabs.style.display = multiScenario ? '' : 'none';
    renderScenarioTabs();
    renderSpeed();
    range.max = String(Math.max(1, Math.round(timeline.duration)));
    renderTicks();

    const errs = diagnostics.filter((d) => d.severity === 'error');
    errors.style.display = options.showErrors !== false && errs.length > 0 ? '' : 'none';
    errors.textContent = errs.map((d) => `Line ${d.line}: ${d.message}${d.suggestion ? `\n  → ${d.suggestion}` : ''}`).join('\n');
    if (errs.length > 0) emit('error', errs);
    root.setAttribute('aria-label', title ?? `${diagram.kind} diagram`);
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
    caption.textContent = frame.caption ?? (frame.stepIndex >= 0 && stepLabel ? stepLabel : '');
    stepEl.textContent = `${Math.max(0, frame.stepIndex + 1)} / ${timeline.steps.length}`;
    range.value = String(Math.round(time));
    range.setAttribute('aria-valuetext', `${fmt(time)} of ${fmt(timeline.duration)}`);
    root.style.setProperty('--vc-progress', `${((time / (timeline.duration || 1)) * 100).toFixed(2)}%`);
    ticks.querySelectorAll<HTMLElement>('.vc-progress-tick').forEach((t) => {
      if (Number(t.dataset['end']) <= time + 1) t.setAttribute('data-done', '');
      else t.removeAttribute('data-done');
    });
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
          playBtn.innerHTML = ICONS.play;
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
    playBtn.innerHTML = ICONS.pause;
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
    playBtn.innerHTML = ICONS.play;
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
      renderTicks();
      renderScenarioTabs();
      time = 0;
      apply();
      if (was || wantPlay) start();
      emitState();
    },
    setSpeed(multiplier) {
      speed = multiplier > 0 ? multiplier : 1;
      renderSpeed();
    },
    get controlsVisible() {
      return controlsAvailable && controlsVisible;
    },
    setControlsVisible(next) {
      if (next === controlsVisible) return;
      controlsVisible = next;
      renderControls();
      emit('controls', next);
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
    } else if (e.key === 'c' && options.controlsToggle !== false && controlsAvailable) {
      e.preventDefault();
      api.setControlsVisible(!controlsVisible);
    } else if (e.key === 'Home' || e.key === '0') {
      e.preventDefault();
      api.seek(0);
    }
  };
  root.addEventListener('keydown', onKey);

  build(source);
  controlsVisible = options.controls ?? diagram.config.controls;
  renderControls();
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
