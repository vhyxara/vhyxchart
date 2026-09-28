'use client';

import { CirclePlayIcon, FeatherIcon, GitBranchIcon, LifeBuoyIcon, PlayIcon, PuzzleIcon } from '@vhyxui/icons';
import React, { useState } from 'react';
import { VhyxChart } from '@vhyxchart/react';
import { EXAMPLES } from '@vhyxchart/examples';
import { Badge, Button, Card, Container, Heading, HStack, Stack, Text, VhyxUIProvider, toast } from '@vhyxui/react';
import { CTASection, FeatureGrid, Hero, MarketingLayout } from '@vhyxui/blocks';
import { PIPELINE } from '../components/diagram';
import { DOCS, GITHUB, NPM, VHYXSEAL, VHYXUI, VHYXARA } from '../components/links';

const INSTALL = 'npm install @vhyxchart/react';
const GALLERY = ['checkout', 'oauth', 'agent', 'bubble', 'order-states'];

const USES = [
  { title: 'Architecture docs', text: 'Show how a request really moves through your services — not just which boxes exist.' },
  { title: 'Incident reviews', text: 'Replay the failure path step by step: the timeout, the retry, the queue backing up.' },
  { title: 'Teaching algorithms', text: 'Values swap and pointers move, so sorting and search finally make sense.' },
  { title: 'API and auth flows', text: 'Walk through OAuth, webhooks and handshakes one message at a time.' },
];

const PLACES = [
  { title: 'GitHub READMEs', code: 'npx @vhyxchart/cli render flow.vhyx\n![Flow](flow.svg)', text: 'Animated SVG that plays inside images. No JavaScript.' },
  { title: 'React', code: '<VhyxChart source={source} autoplay controls />', text: 'Interactive player, headless hook, server component.' },
  { title: 'Any web page', code: '<vhyx-chart>\nflowchart LR\n  a --> b\n</vhyx-chart>', text: 'One script tag and a custom element.' },
  { title: 'VS Code', code: '```vhyx\nflowchart LR\n  a --> b\n```', text: 'Live preview in Markdown and .vhyx files.' },
];

function copyInstall(): void {
  void navigator.clipboard?.writeText(INSTALL).then(
    () => toast.success('Install command copied'),
    () => toast.danger('Could not copy — select the command instead'),
  );
}

function Gallery() {
  const [active, setActive] = useState(GALLERY[0]!);
  const example = EXAMPLES.find((e) => e.id === active) ?? EXAMPLES[0]!;
  return (
    <Stack gap={4}>
      <HStack gap={2} wrap justify="center" role="tablist" aria-label="Example diagrams">
        {GALLERY.map((id) => {
          const e = EXAMPLES.find((x) => x.id === id);
          return (
            <Button
              key={id}
              size="sm"
              role="tab"
              aria-selected={id === active}
              variant={id === active ? 'primary' : 'ghost'}
              onClick={() => setActive(id)}
              contract={{ id: 'example-picker', intent: 'apply-filter', description: 'Show a different example diagram' }}
            >
              {e?.title ?? id}
            </Button>
          );
        })}
      </HStack>
      <Card variant="elevated" padding="lg">
        <div className="stage">
          <pre className="code" aria-label="Diagram source">{example.source}</pre>
          <VhyxChart key={active} source={example.source} autoplay loop controls aria-label={example.title} />
        </div>
      </Card>
      <Text size="sm" tone="subtle" align="center">{example.description}</Text>
    </Stack>
  );
}

export default function Home() {
  return (
    <VhyxUIProvider theme="system">
      <MarketingLayout
        navbar={{
          brand: <b>VhyxChart</b>,
          links: [
            { label: 'Examples', href: '#examples' },
            { label: 'How it works', href: '#how' },
            { label: 'Use it', href: '#use' },
            { label: 'GitHub', href: GITHUB, external: true },
          ],
          actions: (
            <Button size="sm" asChild contract={{ id: 'get-started', intent: 'navigate', description: 'Open the VhyxChart documentation' }}>
              <a href={DOCS}>Get started</a>
            </Button>
          ),
        }}
        footer={{
          brand: 'VhyxChart',
          tagline: <>Diagrams that move. MIT licensed, by <a href={VHYXARA} className="brand-link">Vhyxara</a>.</>,
          columns: [
            { title: 'Project', links: [{ label: 'Documentation', href: DOCS }, { label: 'npm', href: NPM }, { label: 'GitHub', href: GITHUB }] },
            { title: 'Family', links: [{ label: 'VhyxUI — components', href: VHYXUI }, { label: 'VhyxSeal — agent contracts', href: VHYXSEAL }] },
          ],
          legal: <>© 2026 <a href={VHYXARA} className="brand-link">Vhyxara</a></>,
        }}
      >
        <Hero
          eyebrow="Text-first · ~30 KB · animated SVG for GitHub"
          title="Diagrams that move."
          description="Write architecture, flows, sequences and algorithms as plain text. Add a scenario and watch requests travel, services change state and values sort — in docs, READMEs, VS Code and React."
          actions={[
            { label: 'Get started', href: DOCS },
            { label: 'View on GitHub', href: GITHUB, variant: 'outline' },
          ]}
        />

        <Container size="md">
          <div className="install">
              <pre className="code">{INSTALL}</pre>
            <Button variant="outline" onClick={copyInstall} contract={{ id: 'copy-install', intent: 'copy-text', description: 'Copy the npm install command' }}>
              Copy
            </Button>
          </div>
        </Container>

        <section id="examples" className="section" style={{ paddingTop: 0 }}>
          <Container size="xl">
            <Gallery />
          </Container>
        </section>

        <section id="how" className="section section--tint">
          <Container size="xl">
            <div className="split">
              <Stack gap={4}>
                <div className="tag"><Badge variant="info">How it works</Badge></div>
                <Heading level={2}>Structure plus a story</Heading>
                <Text tone="muted">
                  The structure is ordinary diagram text: nodes, edges, groups. A <code>scenario</code> block adds the story —
                  tokens travel along edges, nodes become active, done or failed, notes appear. One diagram can hold many
                  scenarios: the happy path, the timeout, the retry.
                </Text>
                <Text tone="muted">
                  Layout is computed once and never jumps. Every frame is a pure function of time, so scrubbing backwards is exact
                  and the same text renders the same everywhere.
                </Text>
              </Stack>
              <Card variant="elevated" padding="lg">
                <VhyxChart source={PIPELINE} autoplay loop controls aria-label="From diagram text to an animated SVG in a GitHub README" />
              </Card>
            </div>
          </Container>
        </section>

        <FeatureGrid
          title="Built for real documentation"
          features={[
            { icon: <PlayIcon />, title: 'Scenarios', description: 'Many stories on one layout. Switch between success, failure and edge cases.' },
            { icon: <CirclePlayIcon />, title: 'Play, step, scrub', description: 'Keyboard controls, reduced-motion support, pauses when off-screen.' },
            { icon: <GitBranchIcon />, title: 'Animated on GitHub', description: 'SMIL-animated SVG plays inside README images — no JavaScript, no GIFs.' },
            { icon: <PuzzleIcon />, title: 'Bring existing diagrams', description: 'Flowcharts, sequence and state diagrams you already have render unchanged.' },
            { icon: <LifeBuoyIcon />, title: 'Helpful errors', description: 'Invalid text never crashes: you get the line, the problem and a suggestion.' },
            { icon: <FeatherIcon />, title: 'Tiny and deterministic', description: '~30 KB gzipped, zero dependencies, identical output in Node and the browser.' },
          ]}
        />

        <section className="section section--tint">
          <Container size="xl">
            <div className="section-head">
              <Heading level={2}>When a static diagram isn’t enough</Heading>
            </div>
            <div className="uses">
              {USES.map((u) => (
                <Card key={u.title} variant="outline" padding="lg">
                  <Stack gap={2}>
                    <Text weight="semibold">{u.title}</Text>
                    <Text size="sm" tone="muted">{u.text}</Text>
                  </Stack>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section id="use" className="section">
          <Container size="xl">
            <div className="section-head">
              <Heading level={2}>Use it wherever you write</Heading>
              <Text tone="muted">One text format, four ways to show it.</Text>
            </div>
            <div className="places">
              {PLACES.map((p) => (
                <Card key={p.title} variant="outline" padding="lg">
                  <Stack gap={3}>
                    <Text weight="semibold">{p.title}</Text>
                    <pre className="code">{p.code}</pre>
                    <Text size="sm" tone="muted">{p.text}</Text>
                  </Stack>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section className="section section--tint">
          <Container size="xl">
            <div className="section-head">
              <Heading level={2}>Part of the <a href={VHYXARA} className="brand-link">Vhyxara</a> family</Heading>
              <Text tone="muted">This page is built with VhyxUI and publishes a VhyxSeal manifest for AI agents.</Text>
            </div>
            <div className="family">
              {[
                { name: 'VhyxUI', role: 'Components', text: 'Accessible React components with agent contracts built in.', href: VHYXUI },
                { name: 'VhyxSeal', role: 'Agents', text: 'The contract layer that tells AI agents what your UI does.', href: VHYXSEAL },
                { name: 'VhyxChart', role: 'Diagrams', text: 'Text-defined diagrams that animate.', href: GITHUB },
              ].map((p) => (
                <Card key={p.name} variant="outline" padding="lg">
                  <Stack gap={2}>
                    <HStack gap={2} align="center"><Text weight="semibold">{p.name}</Text><Badge>{p.role}</Badge></HStack>
                    <Text size="sm" tone="muted">{p.text}</Text>
                    <Text size="sm"><a href={p.href}>Learn more →</a></Text>
                  </Stack>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <Container size="xl" style={{ paddingBlock: 'var(--vhyx-space-16)' }}>
          <CTASection
            title="Make your next diagram move"
            description="Write it as text, add a scenario, and ship it to your docs, README or app."
            actions={[
              { label: 'Get started', href: DOCS },
              { label: 'Star on GitHub', href: GITHUB, variant: 'outline' },
            ]}
          />
        </Container>
      </MarketingLayout>
    </VhyxUIProvider>
  );
}
