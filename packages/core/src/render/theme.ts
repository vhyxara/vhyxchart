/**
 * Theme CSS for diagrams. All colours are CSS custom properties so a host
 * page can restyle every diagram with a few variables (e.g. map them to
 * VhyxUI tokens). State colours follow the Vhyxara colour language:
 * green = done/healthy, yellow = warning, red = error, blue = active/agent
 * activity, purple = capability/special, gray = inactive.
 */
const LIGHT = `
  --vc-bg:#ffffff;--vc-fg:#0f172a;--vc-muted:#64748b;--vc-subtle:#94a3b8;
  --vc-node-fill:#ffffff;--vc-node-stroke:#cbd5e1;--vc-node-text:#0f172a;
  --vc-edge:#94a3b8;--vc-edge-label-bg:#ffffff;
  --vc-group-fill:rgba(148,163,184,.08);--vc-group-stroke:#cbd5e1;--vc-group-text:#475569;
  --vc-note-fill:#fefce8;--vc-note-stroke:#eab308;--vc-note-text:#713f12;
  --vc-blue:#3b82f6;--vc-green:#22c55e;--vc-yellow:#eab308;--vc-red:#ef4444;--vc-purple:#a855f7;--vc-gray:#6b7280;
  --vc-blue-soft:rgba(59,130,246,.12);--vc-green-soft:rgba(34,197,94,.14);--vc-yellow-soft:rgba(234,179,8,.16);
  --vc-red-soft:rgba(239,68,68,.14);--vc-purple-soft:rgba(168,85,247,.14);--vc-gray-soft:rgba(107,114,128,.12);
  --vc-token:#3b82f6;--vc-cell-fill:#f8fafc;`;

const DARK = `
  --vc-bg:#0b1120;--vc-fg:#f9fafb;--vc-muted:#94a3b8;--vc-subtle:#64748b;
  --vc-node-fill:#111827;--vc-node-stroke:#334155;--vc-node-text:#f9fafb;
  --vc-edge:#64748b;--vc-edge-label-bg:#0b1120;
  --vc-group-fill:rgba(148,163,184,.06);--vc-group-stroke:#334155;--vc-group-text:#94a3b8;
  --vc-note-fill:#422006;--vc-note-stroke:#eab308;--vc-note-text:#fef9c3;
  --vc-blue-soft:rgba(59,130,246,.22);--vc-green-soft:rgba(34,197,94,.2);--vc-yellow-soft:rgba(234,179,8,.2);
  --vc-red-soft:rgba(239,68,68,.22);--vc-purple-soft:rgba(168,85,247,.22);--vc-gray-soft:rgba(107,114,128,.25);
  --vc-token:#60a5fa;--vc-cell-fill:#111827;`;

/** Built-in semantic classes usable as `A:::success` or `class A danger`. */
export const BUILTIN_CLASSES: Readonly<Record<string, { stroke: string; fill: string }>> = {
  success: { stroke: 'var(--vc-green)', fill: 'var(--vc-green-soft)' },
  done: { stroke: 'var(--vc-green)', fill: 'var(--vc-green-soft)' },
  info: { stroke: 'var(--vc-blue)', fill: 'var(--vc-blue-soft)' },
  primary: { stroke: 'var(--vc-blue)', fill: 'var(--vc-blue-soft)' },
  warn: { stroke: 'var(--vc-yellow)', fill: 'var(--vc-yellow-soft)' },
  warning: { stroke: 'var(--vc-yellow)', fill: 'var(--vc-yellow-soft)' },
  danger: { stroke: 'var(--vc-red)', fill: 'var(--vc-red-soft)' },
  error: { stroke: 'var(--vc-red)', fill: 'var(--vc-red-soft)' },
  accent: { stroke: 'var(--vc-purple)', fill: 'var(--vc-purple-soft)' },
  purple: { stroke: 'var(--vc-purple)', fill: 'var(--vc-purple-soft)' },
  muted: { stroke: 'var(--vc-gray)', fill: 'var(--vc-gray-soft)' },
};

/** State → (stroke, fill) used by live frames and the animated export. */
export const STATE_COLORS: Readonly<Record<string, { stroke: string; fill: string }>> = {
  active: { stroke: 'var(--vc-blue)', fill: 'var(--vc-blue-soft)' },
  done: { stroke: 'var(--vc-green)', fill: 'var(--vc-green-soft)' },
  warn: { stroke: 'var(--vc-yellow)', fill: 'var(--vc-yellow-soft)' },
  error: { stroke: 'var(--vc-red)', fill: 'var(--vc-red-soft)' },
  skipped: { stroke: 'var(--vc-gray)', fill: 'var(--vc-gray-soft)' },
};

/** Base stylesheet shared by every diagram (safe to include many times). */
export function baseCss(): string {
  const states = Object.entries(STATE_COLORS)
    .map(
      ([s, c]) =>
        `.vc .vc-node[data-state="${s}"]>.vc-shape,.vc .vc-cell-g[data-state="${s}"]>.vc-cell{stroke:${c.stroke};fill:${c.fill};stroke-width:2.2}` +
        `.vc .vc-ov-${s}{stroke:${c.stroke};fill:${c.fill};stroke-width:2.2}`,
    )
    .join('');
  const builtins = Object.entries(BUILTIN_CLASSES)
    .map(([name, c]) => `.vc .vc-c-${name}>.vc-shape{stroke:${c.stroke};fill:${c.fill}}`)
    .join('');
  return `
.vc{${LIGHT}font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Inter,Roboto,sans-serif;}
.vc[data-vc-theme="dark"]{${DARK}}
@media (prefers-color-scheme:dark){.vc[data-vc-theme="auto"]{${DARK}}}
:root[data-theme="dark"] .vc[data-vc-theme="auto"],.dark .vc[data-vc-theme="auto"]{${DARK}}
:root[data-theme="light"] .vc[data-vc-theme="auto"],.light .vc[data-vc-theme="auto"]{${LIGHT}}
.vc .vc-bg{fill:var(--vc-bg)}
.vc text{fill:var(--vc-node-text);font-size:14px;dominant-baseline:central;text-anchor:middle}
.vc .vc-title{font-size:16px;font-weight:600;fill:var(--vc-fg)}
.vc .vc-shape{fill:var(--vc-node-fill);stroke:var(--vc-node-stroke);stroke-width:1.5;transition:fill .35s ease,stroke .35s ease,stroke-width .35s ease}
.vc .vc-node{transition:transform .25s ease}
.vc .vc-node[data-state="active"]>.vc-shape{filter:drop-shadow(0 0 6px rgba(59,130,246,.55))}
.vc .vc-node[data-state="error"]>.vc-shape{filter:drop-shadow(0 0 6px rgba(239,68,68,.5))}
.vc .vc-start{fill:var(--vc-fg);stroke:none}
.vc .vc-end-outer{fill:none;stroke:var(--vc-fg);stroke-width:1.5}
.vc .vc-end-inner{fill:var(--vc-fg)}
.vc .vc-edge-path{fill:none;stroke:var(--vc-edge);stroke-width:1.6;transition:stroke .35s ease,opacity .35s ease}
.vc .vc-edge[data-stroke="dotted"] .vc-edge-path{stroke-dasharray:4 4}
.vc .vc-edge[data-stroke="thick"] .vc-edge-path{stroke-width:3.2}
.vc .vc-edge[data-stroke="invisible"]{display:none}
.vc .vc-edge-glow{fill:none;stroke:var(--vc-blue);stroke-width:4;opacity:0;stroke-linecap:round;transition:opacity .25s ease}
.vc .vc-edge[data-visited] .vc-edge-path{stroke:var(--vc-blue);opacity:.75}
.vc .vc-edge[data-active] .vc-edge-glow{opacity:.28}
.vc .vc-edge[data-active] .vc-edge-path{stroke:var(--vc-blue)}
.vc .vc-marker{fill:var(--vc-edge);stroke:none}
.vc .vc-marker-open{fill:none;stroke:var(--vc-edge);stroke-width:1.4}
.vc .vc-edge-label rect{fill:var(--vc-edge-label-bg);stroke:var(--vc-node-stroke);stroke-width:1}
.vc .vc-edge-label text,.vc .vc-msg-label{font-size:12px;fill:var(--vc-muted)}
.vc .vc-group>rect{fill:var(--vc-group-fill);stroke:var(--vc-group-stroke);stroke-width:1.2;stroke-dasharray:5 4}
.vc .vc-group>text{font-size:12px;font-weight:600;fill:var(--vc-group-text);text-anchor:start;letter-spacing:.02em}
.vc .vc-token-dot{fill:var(--vc-token)}
.vc .vc-token-halo{fill:var(--vc-token);opacity:.25}
.vc .vc-token-label rect{fill:var(--vc-token)}
.vc .vc-token-label text{fill:#fff;font-size:11px;font-weight:600}
.vc .vc-note rect{fill:var(--vc-note-fill);stroke:var(--vc-note-stroke);stroke-width:1.2}
.vc .vc-note text{fill:var(--vc-note-text);font-size:12px}
.vc .vc-caption{font-size:13px;fill:var(--vc-muted);font-style:italic}
.vc .vc-lifeline{stroke:var(--vc-node-stroke);stroke-width:1.2;stroke-dasharray:4 5}
.vc .vc-activation{fill:var(--vc-node-fill);stroke:var(--vc-node-stroke)}
.vc .vc-msg-path{fill:none;stroke:var(--vc-fg);stroke-width:1.5}
.vc .vc-msg[data-stroke="dotted"] .vc-msg-path{stroke-dasharray:5 4}
.vc .vc-msg{transition:opacity .3s ease}
.vc .vc-msg[data-state="pending"]{opacity:.14}
.vc .vc-msg[data-state="sending"] .vc-msg-path{stroke:var(--vc-blue)}
.vc .vc-msg-marker{fill:var(--vc-fg)}
.vc .vc-msg-marker-open{fill:none;stroke:var(--vc-fg);stroke-width:1.4}
.vc .vc-num circle{fill:var(--vc-blue)}.vc .vc-num text{fill:#fff;font-size:10px;font-weight:700}
.vc .vc-frame rect.vc-frame-box{fill:none;stroke:var(--vc-subtle);stroke-width:1.2}
.vc .vc-frame path{fill:var(--vc-bg);stroke:var(--vc-subtle)}
.vc .vc-frame text{font-size:11px;fill:var(--vc-muted);text-anchor:start}
.vc .vc-frame .vc-frame-kind{font-weight:700;fill:var(--vc-fg)}
.vc .vc-frame line{stroke:var(--vc-subtle);stroke-dasharray:4 4}
.vc .vc-reveal[data-hidden]{opacity:0}
.vc .vc-reveal{transition:opacity .3s ease}
.vc .vc-cell{fill:var(--vc-cell-fill);stroke:var(--vc-node-stroke);stroke-width:1.5;transition:fill .3s ease,stroke .3s ease}
.vc .vc-cell-g[data-compare] .vc-cell{stroke:var(--vc-blue);fill:var(--vc-blue-soft);stroke-width:2.2}
.vc .vc-index{font-size:11px;fill:var(--vc-subtle)}
.vc .vc-item text{font-size:18px;font-weight:600;fill:var(--vc-fg)}
.vc .vc-pointer path{fill:var(--vc-purple)}
.vc .vc-pointer text{font-size:12px;font-weight:700;fill:var(--vc-purple)}
.vc.vc-ambient .vc-edge-path{stroke-dasharray:6 5;animation:vc-flow 1.1s linear infinite}
.vc.vc-ambient .vc-edge[data-stroke="thick"] .vc-edge-path{stroke-dasharray:9 6}
@keyframes vc-flow{to{stroke-dashoffset:-22}}
@media (prefers-reduced-motion:reduce){.vc.vc-ambient .vc-edge-path{animation:none}.vc *{transition:none!important}}
${builtins}${states}`.replace(/\n/g, '');
}
