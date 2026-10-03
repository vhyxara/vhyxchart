'use client';

import { MenuIcon, MoonIcon, SunIcon, WorkflowIcon, XIcon } from '@vhyxui/icons';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VhyxUIProvider } from '@vhyxui/react';
import { GITHUB, PLAYGROUND, VHYXSEAL, VHYXUI } from './links';
import { NAV } from './nav';

function GitHubIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

const MAIN: Array<{ label: string; href: string; match?: (p: string) => boolean; external?: boolean }> = [
  { label: 'Docs', href: '/docs/getting-started', match: (p) => ['/docs/getting-started', '/docs/why', '/docs/existing-diagrams'].some((s) => p.startsWith(s)) },
  { label: 'Syntax', href: '/docs/flowchart', match: (p) => ['/docs/flowchart', '/docs/scenarios', '/docs/sequence', '/docs/state', '/docs/arrays', '/docs/styling'].some((s) => p.startsWith(s)) },
  { label: 'Integrations', href: '/docs/markdown', match: (p) => ['/docs/markdown', '/docs/vscode', '/docs/react', '/docs/html', '/docs/cli', '/docs/api'].some((s) => p.startsWith(s)) },
  { label: 'Examples', href: '/docs/examples', match: (p) => p.startsWith('/docs/examples') },
  { label: 'Playground', href: PLAYGROUND, external: true },
];

type Theme = 'dark' | 'light';

interface ChartFrameProps {
  /** Docs pages show the sidebar and contents; the home page is full width. */
  toc?: Array<{ id: string; label: string }>;
  full?: boolean;
  children: React.ReactNode;
}

/** Header (family switcher, centred menu, theme, GitHub), docs sidebar and on-this-page contents. */
export function ChartFrame({ toc = [], full = false, children }: ChartFrameProps): React.ReactElement {
  const raw = usePathname() ?? '/';
  const pathname = raw.length > 1 ? raw.replace(/\/$/, '') : raw;
  const [theme, setTheme] = useState<Theme>('dark');
  const [menuOpen, setMenuOpen] = useState(false);

  // The inline script in layout.tsx has already applied a saved theme; mirror it.
  useEffect(() => {
    if (document.documentElement.dataset.theme === 'light') setTheme('light');
  }, []);

  function toggleTheme(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* storage blocked */ }
  }

  return (
    <VhyxUIProvider skipLink>
      <header className="ch-header">
        <div className="ch-header-start">
          {!full && (
            <button type="button" className="ch-icon-btn ch-hamburger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="ch-sidebar" onClick={() => { setMenuOpen((o) => !o); }}>
              {menuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
            </button>
          )}
          <Link href="/" className="ch-brand">
            <WorkflowIcon size={22} className="ch-brand-mark" />
            <span>VhyxChart</span>
          </Link>
          <nav className="ch-family" aria-label="Vhyxara libraries">
            <a href={VHYXUI} className="ch-family-link">UI</a>
            <a href={VHYXSEAL} className="ch-family-link">Seal</a>
            <Link href="/" className="ch-family-link" aria-current="true">Chart</Link>
          </nav>
        </div>
        <nav className="ch-nav" aria-label="Main navigation">
          {MAIN.map((m) => m.external
            ? <a key={m.label} href={m.href} className="ch-nav-link">{m.label}</a>
            : <Link key={m.label} href={m.href} className="ch-nav-link" aria-current={m.match?.(pathname) ? 'page' : undefined}>{m.label}</Link>)}
        </nav>
        <div className="ch-header-actions">
          <button type="button" className="ch-icon-btn" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={toggleTheme}>
            {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
          </button>
          <a href={GITHUB} className="ch-icon-btn" aria-label="VhyxChart on GitHub" target="_blank" rel="noopener noreferrer"><GitHubIcon /></a>
        </div>
      </header>

      {full ? (
        <main id="vhyx-main" className="ch-main ch-main--full">{children}</main>
      ) : (
        <div className="ch-body">
          <aside id="ch-sidebar" className="ch-sidebar" data-open={menuOpen ? 'true' : 'false'} aria-label="Docs navigation">
            {NAV.map((group) => (
              <div key={group.label} className="ch-sidebar-group">
                <span className="ch-sidebar-label">{group.label}</span>
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className="ch-sidebar-link" aria-current={pathname === item.href ? 'page' : undefined} onClick={() => { setMenuOpen(false); }}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </aside>
          {menuOpen && <div className="ch-scrim" aria-hidden="true" onClick={() => { setMenuOpen(false); }} />}
          <main id="vhyx-main" className="ch-main">
            <article className="prose">{children}</article>
          </main>
          {toc.length > 0 && (
            <nav className="ch-toc" aria-label="On this page">
              <span className="ch-sidebar-label">On this page</span>
              {toc.map((t) => <a key={t.id} href={`#${t.id}`} className="ch-toc-link">{t.label}</a>)}
            </nav>
          )}
        </div>
      )}
    </VhyxUIProvider>
  );
}
