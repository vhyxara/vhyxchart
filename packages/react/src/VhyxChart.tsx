'use client';

import React, { useEffect } from 'react';
import type { Player, PlayerOptions } from '@vhyxchart/core/browser';
import { useVhyxChart, type VhyxChartState } from './useVhyxChart.js';

/** Props for {@link VhyxChart}. */
export interface VhyxChartProps extends PlayerOptions {
  /** Diagram source (VhyxChart or Mermaid-compatible text). Alternatively pass it as children. */
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
export function VhyxChart({ source, children, className, style, onReady, onStateChange, 'aria-label': ariaLabel, ...options }: VhyxChartProps): React.ReactElement {
  const text = dedent(source ?? children ?? '');
  const { ref, player, state } = useVhyxChart(text, options);

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

/** Removes common indentation so template literals can be indented in JSX. */
export function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)?.[0].length ?? 0));
  return Number.isFinite(indent) && indent > 0 ? lines.map((l) => l.slice(indent)).join('\n') : lines.join('\n');
}
