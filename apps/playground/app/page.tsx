'use client';

import { MoonIcon, SunIcon, WorkflowIcon } from '@vhyxui/icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parse, render, renderAnimatedSvg, type Diagnostic } from '@vhyxchart/core';
import { VhyxChart } from '@vhyxchart/react';
import { EXAMPLES } from '@vhyxchart/examples';
import { Alert, Button, HStack, Kbd, Select, Text, VhyxUIProvider, toast, type VhyxTheme } from '@vhyxui/react';
import { DOCS, GITHUB, VHYXSEAL, VHYXUI } from '../components/links';

const MAIN = [
  { label: 'Docs', href: `${DOCS}/docs/getting-started` },
  { label: 'Syntax', href: `${DOCS}/docs/flowchart` },
  { label: 'Integrations', href: `${DOCS}/docs/markdown` },
  { label: 'Examples', href: `${DOCS}/docs/examples` },
];

function GitHubIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

const DEFAULT = EXAMPLES[0]?.source ?? 'flowchart LR\n  a --> b';

function encode(source: string): string {
  const bytes = new TextEncoder().encode(source);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(hash: string): string | null {
  try {
    const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Playground(): React.ReactElement {
  const [source, setSource] = useState(DEFAULT);
  const [rendered, setRendered] = useState(DEFAULT);
  const [theme, setTheme] = useState<Exclude<VhyxTheme, 'system'>>('dark');
  const [exampleId, setExampleId] = useState(EXAMPLES[0]?.id ?? '');
  const editor = useRef<HTMLTextAreaElement>(null);

  // Restore the saved theme and #src=… once on mount.
  useEffect(() => {
    try { if (localStorage.getItem('theme') === 'light') setTheme('light'); } catch { /* storage blocked */ }
    const m = /src=([^&]+)/.exec(window.location.hash);
    const restored = m?.[1] ? decode(m[1]) : null;
    if (restored) {
      setSource(restored);
      setRendered(restored);
      setExampleId('');
    }
  }, []);

  // Debounced render keeps typing smooth on large diagrams.
  useEffect(() => {
    const t = setTimeout(() => setRendered(source), 180);
    return () => clearTimeout(t);
  }, [source]);

  const diagnostics: Diagnostic[] = useMemo(() => parse(rendered).diagnostics, [rendered]);
  const title = useMemo(() => parse(rendered).diagram.config.title ?? 'diagram', [rendered]);
  const fileBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram';

  const jumpTo = useCallback((line: number) => {
    const el = editor.current;
    if (!el) return;
    const lines = el.value.split('\n');
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    el.focus();
    el.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: end, value } = el;
    const next = value.slice(0, s) + '  ' + value.slice(end);
    setSource(next);
    requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
  };

  const share = async (): Promise<void> => {
    const url = `${window.location.origin}${window.location.pathname}#src=${encode(source)}`;
    window.history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.info('Link is in the address bar');
    }
  };

  return (
    <VhyxUIProvider theme={theme} skipLink={false}>
      <div className="pg">
        <header className="ch-header">
          <div className="ch-header-start">
            <a href={DOCS} className="ch-brand">
              <WorkflowIcon size={22} className="ch-brand-mark" />
              <span>VhyxChart</span>
              <span className="ch-brand-tag">Playground</span>
            </a>
            <nav className="ch-family" aria-label="Vhyxara libraries">
              <a href={VHYXUI} className="ch-family-link">UI</a>
              <a href={VHYXSEAL} className="ch-family-link">Seal</a>
              <a href={DOCS} className="ch-family-link" aria-current="true">Chart</a>
            </nav>
          </div>
          <nav className="ch-nav" aria-label="Main navigation">
            {MAIN.map((m) => <a key={m.label} href={m.href} className="ch-nav-link">{m.label}</a>)}
            <a href="/" className="ch-nav-link" aria-current="page">Playground</a>
          </nav>
          <div className="ch-header-actions">
            <button
              type="button"
              className="ch-icon-btn"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                setTheme(next);
                try { localStorage.setItem('theme', next); } catch { /* storage blocked */ }
              }}
            >
              {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </button>
            <a href={GITHUB} className="ch-icon-btn" aria-label="VhyxChart on GitHub" target="_blank" rel="noopener noreferrer"><GitHubIcon /></a>
          </div>
        </header>

        <main className="pg-main" id="vhyx-main">
          <section className="pg-pane" aria-label="Editor">
            <div className="pg-toolbar">
              <span className="pg-pane-label">Source</span>
              <div style={{ minWidth: 220, flex: 1 }}>
                <Select
                  value={exampleId}
                  onValueChange={(id) => {
                    const ex = EXAMPLES.find((e) => e.id === id);
                    if (!ex) return;
                    setExampleId(id);
                    setSource(ex.source);
                    setRendered(ex.source);
                  }}
                  placeholder="Examples…"
                  size="sm"
                  aria-label="Examples"
                >
                  <Select.Trigger id="example-picker" />
                  <Select.Content>
                    {EXAMPLES.map((ex) => (
                      <Select.Item key={ex.id} value={ex.id}>{ex.category} · {ex.title}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <Text as="span" size="xs" tone="muted"><Kbd>Tab</Kbd> indents</Text>
            </div>
            <textarea
              id="diagram-editor"
              ref={editor}
              className="pg-editor"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setExampleId('');
              }}
              onKeyDown={onKeyDown}
              spellCheck={false}
              aria-label="Diagram source"
            />
            {diagnostics.length > 0 && (
              <div className="pg-diag" aria-label="Problems">
                {diagnostics.map((d, i) => (
                  <button key={i} type="button" onClick={() => jumpTo(d.line)} style={{ all: 'unset', cursor: 'pointer' }}>
                    <Alert variant={d.severity === 'error' ? 'danger' : 'warning'} title={`Line ${d.line}: ${d.message}`}>
                      {d.suggestion ?? d.code}
                    </Alert>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="pg-pane pg-pane--preview" aria-label="Preview">
            <div className="pg-toolbar">
              <span className="pg-pane-label">Preview</span>
              <HStack gap={2} wrap>
                <Button id="export-svg" size="sm" onClick={() => download(`${fileBase}.svg`, renderAnimatedSvg(parse(rendered).diagram, { theme: 'auto' }), 'image/svg+xml')} contract={{ intent: 'download-file' }}>
                  Animated SVG
                </Button>
                <Button size="sm" variant="outline" onClick={() => download(`${fileBase}.static.svg`, render(rendered, { theme }).svg, 'image/svg+xml')}>Static SVG</Button>
                <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText('```vhyx\n' + source.trimEnd() + '\n```\n').then(() => toast.success('Markdown copied')); }}>Copy Markdown</Button>
                <Button id="share-link" size="sm" variant="ghost" onClick={() => void share()} contract={{ intent: 'share-item' }}>Share link</Button>
              </HStack>
            </div>
            <div className="pg-stage">
              <VhyxChart source={rendered} theme={theme} showErrors={false} />
            </div>
          </section>
        </main>
      </div>
    </VhyxUIProvider>
  );
}
