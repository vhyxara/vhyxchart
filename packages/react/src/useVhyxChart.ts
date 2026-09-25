'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPlayer, type Player, type PlayerOptions } from '@vhyxchart/core/browser';
import type { Diagnostic } from '@vhyxchart/core';

/** Live playback state exposed by {@link useVhyxChart}. */
export interface VhyxChartState {
  playing: boolean;
  time: number;
  duration: number;
  scenario: number;
  scenarios: string[];
  diagnostics: Diagnostic[];
}

/** Return value of {@link useVhyxChart}. */
export interface UseVhyxChart {
  /** Attach to the element that should host the diagram. */
  ref: (element: HTMLElement | null) => void;
  /** Imperative player (null until mounted). */
  player: Player | null;
  state: VhyxChartState;
}

const EMPTY: VhyxChartState = { playing: false, time: 0, duration: 0, scenario: 0, scenarios: [], diagnostics: [] };

/**
 * Headless hook: mounts a VhyxChart player and exposes reactive state so you
 * can build your own controls (e.g. with @vhyxui/react Buttons).
 * Pass `controls: false` to hide the built-in bar.
 *
 * @example
 * const { ref, player, state } = useVhyxChart(source, { controls: false });
 * return <><div ref={ref} /><Button onClick={() => player?.toggle()}>{state.playing ? 'Pause' : 'Play'}</Button></>;
 */
export function useVhyxChart(source: string, options: PlayerOptions = {}): UseVhyxChart {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [state, setState] = useState<VhyxChartState>(EMPTY);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const sourceRef = useRef(source);

  const sync = useCallback((p: Player, playing: boolean, time: number): void => {
    setState({
      playing,
      time,
      duration: p.timeline.duration,
      scenario: p.scenario,
      scenarios: p.scenarios,
      diagnostics: p.diagnostics,
    });
  }, []);

  // Mount / unmount when the host element or structural options change.
  const { theme, controls, loop, autoplay, showErrors, pauseOffscreen } = options;
  useEffect(() => {
    if (!element) return undefined;
    const p = createPlayer(element, sourceRef.current, optionsRef.current);
    setPlayer(p);
    sync(p, p.playing, p.time);
    let lastSecond = -1;
    const offState = p.on('state', (s) => sync(p, s.playing, s.time));
    // Throttle frame-driven state updates to ~10/s to keep React work tiny.
    const offFrame = p.on('frame', (f) => {
      const bucket = Math.floor(f.time / 100);
      if (bucket !== lastSecond) {
        lastSecond = bucket;
        sync(p, p.playing, f.time);
      }
    });
    return () => {
      offState();
      offFrame();
      p.destroy();
      setPlayer(null);
    };
  }, [element, sync, theme, controls, loop, autoplay, showErrors, pauseOffscreen]);

  // Hot-swap source without remounting (keeps scenario and time).
  useEffect(() => {
    sourceRef.current = source;
    if (player) {
      player.setSource(source);
      sync(player, player.playing, player.time);
    }
  }, [source, player, sync]);

  useEffect(() => {
    if (player && options.speed !== undefined) player.setSpeed(options.speed);
  }, [player, options.speed]);

  useEffect(() => {
    if (player && options.scenario !== undefined && options.scenario !== player.scenario) player.setScenario(options.scenario);
  }, [player, options.scenario]);

  return { ref: setElement, player, state };
}
