'use client';

import { MoonIcon, SunIcon } from '@vhyxui/icons';
import React, { useEffect, useState } from 'react';
import { Button } from '@vhyxui/react';

export interface SiteHeaderProps {
  brand: string;
  /** Brand mark (inline SVG, coloured by the site accent). */
  mark: React.ReactNode;
  /** Which family member this site is. */
  current: 'ui' | 'seal' | 'chart';
  family: { ui: string; seal: string; chart: string };
  nav: Array<{ label: string; href: string }>;
  github: string;
  getStarted: string;
}

function GitHubIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

/** The Vhyxara family header: brand + family switcher | centred menu | theme, GitHub, Get started. */
export function SiteHeader({ brand, mark, current, family, nav, github, getStarted }: SiteHeaderProps): React.ReactElement {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    if (document.documentElement.dataset.theme === 'light') setTheme('light');
  }, []);
  const toggle = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  };
  const fam = [
    { id: 'ui', label: 'UI', href: family.ui },
    { id: 'seal', label: 'Seal', href: family.seal },
    { id: 'chart', label: 'Chart', href: family.chart },
  ] as const;

  return (
    <header className="lp-header">
      <div className="lp-header-start">
        <a href="/" className="lp-brand">
          {mark}
          <span>{brand}</span>
        </a>
        <nav className="lp-family" aria-label="Vhyxara libraries">
          {fam.map((f) => (
            <a key={f.id} href={f.id === current ? '/' : f.href} aria-current={f.id === current ? 'true' : undefined}>
              {f.label}
            </a>
          ))}
        </nav>
      </div>
      <nav className="lp-nav" aria-label="Main navigation">
        {nav.map((n) => (
          <a key={n.label} href={n.href}>
            {n.label}
          </a>
        ))}
      </nav>
      <div className="lp-header-actions">
        <button type="button" className="lp-icon-btn" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={toggle}>
          {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>
        <a href={github} className="lp-icon-btn" aria-label={`${brand} on GitHub`} target="_blank" rel="noopener noreferrer">
          <GitHubIcon />
        </a>
        <Button size="sm" asChild>
          <a href={getStarted}>Get started</a>
        </Button>
      </div>
    </header>
  );
}
