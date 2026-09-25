'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VhyxChart } from '@vhyxchart/react';
import { Button, HStack, VhyxUIProvider } from '@vhyxui/react';
import { DocsLayout, type TocItem } from '@vhyxui/blocks';
import { NAV } from './nav';

const PLAYGROUND = process.env.NEXT_PUBLIC_PLAYGROUND_URL ?? 'http://localhost:3101';

/** Source + live preview side by side. */
export function Example({ source, height }: { source: string; height?: number }): React.ReactElement {
  return (
    <div className="example">
      <pre className="code" style={height ? { maxHeight: height } : undefined}>{source.trim()}</pre>
      <VhyxChart source={source} />
    </div>
  );
}

/** Plain code block. */
export function Code({ children }: { children: string }): React.ReactElement {
  return <pre className="code">{children.trim()}</pre>;
}

/** Docs frame: VhyxUI DocsLayout with active nav state. */
export function DocsShell({ toc, children }: { toc?: TocItem[]; children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const nav = NAV.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, active: pathname === i.href || pathname === `${i.href}/` })) }));
  return (
    <VhyxUIProvider theme="system" skipLink>
      <DocsLayout
        linkAs={Link}
        navbar={{
          brand: <b>VhyxChart</b>,
          links: [
            { label: 'Docs', href: '/docs/getting-started' },
            { label: 'Syntax', href: '/docs/flowchart' },
            { label: 'Playground', href: PLAYGROUND, external: true },
          ],
          actions: (
            <HStack gap={2}>
              <Button size="sm" variant="ghost" asChild><a href="https://github.com/vhyxara/vhyxchart">GitHub</a></Button>
            </HStack>
          ),
        }}
        nav={nav}
        toc={toc ?? []}
      >
        <article className="prose">{children}</article>
      </DocsLayout>
    </VhyxUIProvider>
  );
}

export { PLAYGROUND };
