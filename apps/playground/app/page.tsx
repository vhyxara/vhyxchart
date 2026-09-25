'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parse, render, renderAnimatedSvg, type Diagnostic } from '@vhyxchart/core';
import { VhyxChart } from '@vhyxchart/react';
import { EXAMPLES } from '@vhyxchart/examples';
import { Alert, Badge, Button, HStack, Kbd, Select, Text, VhyxUIProvider, toast, type VhyxTheme } from '@vhyxui/react';

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

  // Restore from #src=… once on mount.
  useEffect(() => {
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
        <header className="pg-toolbar" style={{ justifyContent: 'space-between' }}>
          <HStack gap={3}>
            <Text as="span" weight="bold">VhyxChart</Text>
            <Badge variant="info" size="sm">playground</Badge>
          </HStack>
          <HStack gap={2} wrap>
            <Button size="sm" variant="ghost" asChild><a href="https://github.com/vhyxara/vhyxchart">GitHub</a></Button>
            <Button size="sm" variant="ghost" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </Button>
          </HStack>
        </header>

        <main className="pg-main" id="vhyx-main">
          <section className="pg-pane" aria-label="Editor">
            <div className="pg-toolbar">
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

          <section className="pg-pane" aria-label="Preview">
            <div className="pg-toolbar">
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
