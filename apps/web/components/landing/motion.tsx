'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  as?: 'div' | 'section' | 'li';
  className?: string;
}): React.ReactElement {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return React.createElement(
    Tag,
    {
      ref,
      className: ['reveal', className].filter(Boolean).join(' '),
      'data-visible': visible ? 'true' : 'false',
      style: { '--reveal-delay': `${delay}ms` } as React.CSSProperties,
    },
    children,
  );
}

/** Counts up to `to` once visible (shows the final value straight away under reduced motion). */
export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }): React.ReactElement {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(to);
  useEffect(() => {
    const el = ref.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!el || reduce || typeof IntersectionObserver === 'undefined') return undefined;
    setValue(0);
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number): void => {
        const t = Math.min(1, (now - start) / 1400);
        setValue(Math.round(to * (1 - Math.pow(1 - t, 4))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

/** Tracks the pointer inside bento tiles so their glow follows it. */
export function useTileGlow(): (event: React.PointerEvent<HTMLElement>) => void {
  return (event) => {
    const el = event.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--tile-x', `${event.clientX - r.left}px`);
    el.style.setProperty('--tile-y', `${event.clientY - r.top}px`);
  };
}
