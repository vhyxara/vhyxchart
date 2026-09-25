'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { VhyxChart } from '@vhyxchart/react';
import { EXAMPLES } from '@vhyxchart/examples';
import { Button, Card, Container, HStack, Stack, Text, VhyxUIProvider } from '@vhyxui/react';
import { CTASection, FeatureGrid, Hero, MarketingLayout } from '@vhyxui/blocks';
import { PLAYGROUND } from '../components/ui';

const SHOWCASE = ['checkout', 'oauth', 'bubble', 'pipeline'];

export default function Home(): React.ReactElement {
  const [active, setActive] = useState(SHOWCASE[0] ?? 'checkout');
  const example = EXAMPLES.find((e) => e.id === active) ?? EXAMPLES[0];
  return (
    <VhyxUIProvider theme="system">
      <MarketingLayout
        navbar={{
          brand: <b>VhyxChart</b>,
          linkAs: Link,
          links: [
            { label: 'Docs', href: '/docs/getting-started' },
            { label: 'Examples', href: '/docs/examples' },
            { label: 'Playground', href: PLAYGROUND, external: true },
          ],
          actions: <Button size="sm" asChild><Link href="/docs/getting-started">Get started</Link></Button>,
        }}
        footer={{
          brand: 'VhyxChart',
          tagline: 'Diagrams that move. MIT licensed, part of the Vhyxara family with VhyxUI and VhyxSeal.',
          columns: [
            { title: 'Docs', links: [{ label: 'Getting started', href: '/docs/getting-started' }, { label: 'Syntax', href: '/docs/flowchart' }, { label: 'Scenarios', href: '/docs/scenarios' }] },
            { title: 'Use it', links: [{ label: 'Markdown & GitHub', href: '/docs/markdown' }, { label: 'VS Code', href: '/docs/vscode' }, { label: 'React', href: '/docs/react' }] },
          ],
          legal: '© 2026 Vhyxara',
        }}
      >
        <Hero
          eyebrow="Mermaid-compatible · 30 KB · animated SVG for GitHub"
          title="Diagrams that move."
          description="Write architecture, flows, sequences and algorithms as text. Add a scenario and watch requests travel, services fail, and values sort — in docs, READMEs, VS Code and React."
          actions={[{ label: 'Get started', href: '/docs/getting-started' }, { label: 'Open playground', href: PLAYGROUND, variant: 'outline' }]}
          linkAs={Link}
        />
        <Container size="xl" style={{ paddingBottom: 'var(--vhyx-space-16)' }}>
          <Stack gap={4}>
            <HStack gap={2} wrap justify="center" role="tablist" aria-label="Showcase">
              {SHOWCASE.map((id) => {
                const e = EXAMPLES.find((x) => x.id === id);
                return (
                  <Button key={id} size="sm" variant={id === active ? 'primary' : 'ghost'} role="tab" aria-selected={id === active} onClick={() => setActive(id)}>
                    {e?.title}
                  </Button>
                );
              })}
            </HStack>
            <Card variant="elevated" padding="lg">
              <Stack direction="row" gap={6} collapseBelow="lg" align="start">
                <pre style={{ flex: '0 0 34%', minWidth: 0, margin: 0, maxHeight: 440, overflow: 'auto', font: '12px/1.6 var(--vhyx-font-mono)', background: 'var(--vhyx-color-bg-subtle)', padding: 16, borderRadius: 8 }}>{example?.source}</pre>
                <div style={{ flex: 1, minWidth: 0 }}><VhyxChart key={active} source={example?.source ?? ''} /></div>
              </Stack>
            </Card>
            <Text size="sm" tone="subtle" align="center">{example?.description}</Text>
          </Stack>
        </Container>
        <FeatureGrid
          title="Text in, motion out"
          description="Everything you know from Mermaid, plus a timeline."
          features={[
            { icon: '▶', title: 'Scenarios', description: 'Tokens travel edges, nodes change state, notes appear. Many scenarios per diagram, one layout.' },
            { icon: '⏯', title: 'Play, step, scrub', description: 'Every frame is a pure function of time — scrubbing backwards is exact.' },
            { icon: '🐙', title: 'Animated on GitHub', description: 'Export SMIL-animated SVG that plays inside README images. No JavaScript.' },
            { icon: '🧩', title: 'Mermaid-compatible', description: 'Flowcharts, sequence and state diagrams render unchanged.' },
            { icon: '💻', title: 'VS Code live preview', description: 'Fences animate in the Markdown preview; .vhyx files preview as you type.' },
            { icon: '🪶', title: 'Tiny and deterministic', description: '~30 KB gzipped, zero dependencies, same output in Node and the browser.' },
          ]}
        />
        <CTASection title="Make your next diagram move" description="Paste a Mermaid diagram into the playground and add a scenario." actions={[{ label: 'Open playground', href: PLAYGROUND }, { label: 'Read the docs', href: '/docs/getting-started', variant: 'outline' }]} linkAs={Link} />
      </MarketingLayout>
    </VhyxUIProvider>
  );
}
