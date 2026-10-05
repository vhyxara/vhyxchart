'use client';

import React, { useEffect } from 'react';
import type { Player, PlayerOptions, PlayerSlot } from '@vhyxchart/core/browser';
import { useVhyxChart, type VhyxChartState } from './useVhyxChart.js';

/** Props for {@link VhyxChart}. */
export interface VhyxChartProps extends Omit<PlayerOptions, 'styles'> {
  /** Diagram source text. Alternatively pass it as children. */
  source?: string;
  children?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Accessible label for the region. Defaults to the diagram title. */
  'aria-label'?: string;
  /** Called once the player is mounted. */
  onReady?: (player: Player) => void;
  /** Called whenever playback state changes. */
  onStateChange?: (state: VhyxChartState) => void;
  /**
   * Called when the controller is shown or hidden from the header switch. Pair with `controls`
   * to keep visibility in your own state.
   */
  onControlsChange?: (visible: boolean) => void;
  /** Inline styles per part of the player, e.g. `{ stage: { padding: 24 }, controls: { order: -1 } }`. */
  styles?: Partial<Record<PlayerSlot, React.CSSProperties>>;
}

/**
 * VhyxChart — animated, interactive diagram from text.
 *
 * @example
 * <VhyxChart theme="dark">{`
 *   flowchart LR
 *     client --> api --> db[(DB)]
 *   scenario Request
 *     client -> api -> db
 *     db is done
 * `}</VhyxChart>
 */
export function VhyxChart({
  source,
  children,
  className,
  style,
  onReady,
  onStateChange,
  onControlsChange,
  styles,
  'aria-label': ariaLabel,
  ...options
}: VhyxChartProps): React.ReactElement {
  const text = dedent(source ?? children ?? '');
  const { ref, player, state } = useVhyxChart(text, { ...options, ...(styles ? { styles: toCssText(styles) } : {}) });

  useEffect(() => {
    if (!player || !onControlsChange) return undefined;
    return player.on('controls', onControlsChange);
  }, [player, onControlsChange]);

  useEffect(() => {
    if (player) onReady?.(player);
    // onReady intentionally fires once per player instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  return <div ref={ref} className={className} style={style} role="figure" aria-label={ariaLabel} data-vhyxchart="" />;
}

/** Turns React style objects into CSS text for the player's per-part styles. */
function toCssText(styles: Partial<Record<PlayerSlot, React.CSSProperties>>): Partial<Record<PlayerSlot, string>> {
  const out: Partial<Record<PlayerSlot, string>> = {};
  for (const [slot, css] of Object.entries(styles) as Array<[PlayerSlot, React.CSSProperties | undefined]>) {
    if (!css) continue;
    out[slot] = Object.entries(css)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => {
        const prop = k.startsWith('--') ? k : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        const value = typeof v === 'number' && !UNITLESS.has(k) ? `${v}px` : String(v);
        return `${prop}:${value}`;
      })
      .join(';');
  }
  return out;
}

const UNITLESS = new Set(['opacity', 'zIndex', 'flex', 'flexGrow', 'flexShrink', 'order', 'fontWeight', 'lineHeight', 'zoom']);

/** Removes common indentation so template literals can be indented in JSX. */
export function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)?.[0].length ?? 0));
  return Number.isFinite(indent) && indent > 0 ? lines.map((l) => l.slice(indent)).join('\n') : lines.join('\n');
}
