'use client';

import { ArrowRightIcon, CirclePlayIcon, FeatherIcon, GitBranchIcon, LifeBuoyIcon, PlayIcon, PuzzleIcon } from '@vhyxui/icons';
import React, { useState } from 'react';
import { VhyxChart } from '@vhyxchart/react';
import { EXAMPLES } from '@vhyxchart/examples';
import { Button, Stack, VhyxUIProvider, toast } from '@vhyxui/react';
import { SiteHeader } from '../components/landing/SiteHeader';
import { CountUp, Reveal } from '../components/landing/motion';
import { PIPELINE } from '../components/diagram';
import { DOCS, EXAMPLES_DOCS, GET_STARTED, GITHUB, NPM, PLAYGROUND, REACT_DOCS, VHYXSEAL, VHYXUI, VHYXARA, OPENVSX, MARKETPLACE } from '../components/links';

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
  { title: 'VS Code', code: '```vhyx\nflowchart LR\n  a --> b\n```', text: 'Live preview in Markdown and .vhyx files.', link: { label: 'Install from the VS Code Marketplace', href: MARKETPLACE } },
];

function copyInstall(): void {
  void navigator.clipboard?.writeText(INSTALL).then(
    () => toast.success('Install command copied'),
    () => toast.danger('Could not copy — select the command instead'),
  );
}

const MARK = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
    <path d="M7 11v3a3 3 0 0 0 3 3h3" />
  </svg>
);

const FEATURES = [
  { icon: <PlayIcon size={18} />, title: 'Scenarios', text: 'Many stories on one layout. Switch between success, failure and edge cases.' },
  { icon: <CirclePlayIcon size={18} />, title: 'Play, step, scrub', text: 'Keyboard controls, reduced-motion support, pauses when off-screen.' },
  { icon: <GitBranchIcon size={18} />, title: 'Animated on GitHub', text: 'SMIL-animated SVG plays inside README images — no JavaScript, no GIFs.' },
  { icon: <PuzzleIcon size={18} />, title: 'Bring existing diagrams', text: 'Flowcharts, sequence and state diagrams you already have render unchanged.' },
  { icon: <LifeBuoyIcon size={18} />, title: 'Helpful errors', text: 'Invalid text never crashes: you get the line, the problem and a suggestion.' },
  { icon: <FeatherIcon size={18} />, title: 'Tiny and deterministic', text: '~30 KB gzipped, zero dependencies, identical output in Node and the browser.' },
];

const HERO_SOURCE = EXAMPLES.find((e) => e.id === 'checkout')?.source ?? PIPELINE;

function Gallery(): React.ReactElement {
  const [active, setActive] = useState(GALLERY[0]!);
  const example = EXAMPLES.find((e) => e.id === active) ?? EXAMPLES[0]!;
  return (
    <div>
      <div className="lp-gallery-tabs" role="tablist" aria-label="Example diagrams">
        {GALLERY.map((id) => {
          const e = EXAMPLES.find((x) => x.id === id);
          return (
            <button key={id} type="button" role="tab" aria-selected={id === active} onClick={() => setActive(id)}>
              {e?.title ?? id}
            </button>
          );
        })}
      </div>
      <div className="lp-gallery">
        <pre aria-label="Diagram source">{example.source}</pre>
        <div>
          <VhyxChart key={active} source={example.source} autoplay loop layout="plain" aria-label={example.title} />
        </div>
      </div>
      <p className="lp-caption">{example.description}</p>
    </div>
  );
}

const FAMILY = [
  { lib: 'ui', name: 'VhyxUI', role: 'Components', text: 'Accessible React components with agent contracts built in.', href: VHYXUI, current: false },
  { lib: 'seal', name: 'VhyxSeal', role: 'Agent contracts', text: 'The contract layer that tells AI agents what your UI does — and when to ask a person.', href: VHYXSEAL, current: false },
  { lib: 'chart', name: 'VhyxChart', role: 'Diagrams', text: 'Text-defined diagrams that animate — in docs, READMEs, VS Code and React.', href: '/', current: true },
] as const;

export default function Home() {
  return (
    <VhyxUIProvider>
      <SiteHeader
        brand="VhyxChart"
        mark={MARK}
        current="chart"
        family={{ ui: VHYXUI, seal: VHYXSEAL, chart: '/' }}
        nav={[
          { label: 'Examples', href: '#examples' },
          { label: 'How it works', href: '#how' },
          { label: 'Use it', href: '#use' },
          { label: 'Docs', href: DOCS },
          { label: 'Playground', href: PLAYGROUND },
        ]}
        github={GITHUB}
        getStarted={GET_STARTED}
      />

      <main id="vhyx-main">
        <section className="lp-hero">
          <div className="lp-aurora" aria-hidden="true"><span /><span /><span /></div>
          <div className="lp-inner lp-hero-grid">
            <div className="lp-hero-copy">
              <a className="lp-pill" href={PLAYGROUND}><b>0.2</b> New player: header, controls toggle, themes <ArrowRightIcon size={14} /></a>
              <h1 className="lp-title">
                Diagrams that <span className="lp-gradient-text">move</span>.
              </h1>
              <p className="lp-lead">
                Write architecture, flows, sequences and algorithms as text. Add a scenario and watch requests travel, services
                fail and values sort — in docs, READMEs, VS Code and React.
              </p>
              <div className="lp-actions">
                <Button size="lg" asChild><a href={GET_STARTED}>Get started</a></Button>
                <Button size="lg" variant="outline" asChild><a href={PLAYGROUND}>Open playground</a></Button>
              </div>
              <div className="lp-install">
                <span aria-hidden="true">$</span>
                <code>{INSTALL}</code>
                <button type="button" onClick={copyInstall}>Copy</button>
              </div>
            </div>
            <Reveal delay={150}>
              <div className="lp-frame">
                <div className="lp-frame-inner">
                  <div className="lp-frame-bar" aria-hidden="true"><i /><i /><i /><span>checkout.vhyx</span></div>
                  <div className="lp-hero-chart">
                    <VhyxChart source={HERO_SOURCE} autoplay loop layout="plain" aria-label="A checkout request travelling through services" />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="lp-inner">
          <Reveal className="lp-stats">
            <div className="lp-stat"><strong>~<CountUp to={30} /> KB</strong><span>gzipped, zero dependencies</span></div>
            <div className="lp-stat"><strong><CountUp to={4} /></strong><span>diagram kinds: flow, sequence, state, arrays</span></div>
            <div className="lp-stat"><strong><CountUp to={4} /></strong><span>places: GitHub, React, any page, VS Code</span></div>
            <div className="lp-stat"><strong><CountUp to={0} /></strong><span>lines of JavaScript in README SVGs</span></div>
          </Reveal>
        </div>

        <section id="examples" className="lp-section">
          <div className="lp-inner">
            <Reveal className="lp-head lp-head--center">
              <span className="lp-eyebrow">Examples</span>
              <h2 className="lp-h2">Text in, motion out</h2>
              <p className="lp-sub">Pick an example: the source on the left is exactly what draws the diagram on the right.</p>
            </Reveal>
            <Reveal><Gallery /></Reveal>
          </div>
        </section>

        <section id="how" className="lp-section">
          <div className="lp-inner lp-split">
            <Reveal>
              <Stack gap={4}>
                <span className="lp-eyebrow">How it works</span>
                <h2 className="lp-h2">Structure plus a story</h2>
                <p className="lp-sub">
                  The structure is ordinary diagram text: nodes, edges, groups. A <code>scenario</code> block adds the story —
                  tokens travel along edges, nodes become active, done or failed, notes appear. One diagram can hold many
                  scenarios: the happy path, the timeout, the retry.
                </p>
                <p className="lp-sub">
                  Layout is computed once and never jumps. Every frame is a pure function of time, so scrubbing backwards is exact
                  and the same text renders the same everywhere.
                </p>
              </Stack>
            </Reveal>
            <Reveal delay={100}>
              <VhyxChart source={PIPELINE} autoplay loop aria-label="From diagram text to an animated SVG in a GitHub README" />
            </Reveal>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-inner">
            <Reveal className="lp-head">
              <span className="lp-eyebrow">Features</span>
              <h2 className="lp-h2">Built for real documentation</h2>
            </Reveal>
            <div className="lp-bento">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} className="lp-tile lp-tile--2" delay={(i % 3) * 80}>
                  <span className="lp-tile-icon">{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-inner">
            <Reveal className="lp-head">
              <span className="lp-eyebrow">Use cases</span>
              <h2 className="lp-h2">When a static diagram isn&apos;t enough</h2>
            </Reveal>
            <div className="lp-uses">
              {USES.map((u, i) => (
                <Reveal key={u.title} delay={i * 70}>
                  <div className="lp-tile" style={{ minHeight: 0 }}><h3>{u.title}</h3><p>{u.text}</p></div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="use" className="lp-section">
          <div className="lp-inner">
            <Reveal className="lp-head">
              <span className="lp-eyebrow">Everywhere you write</span>
              <h2 className="lp-h2">One text format, four ways to show it</h2>
            </Reveal>
            <div className="lp-places">
              {PLACES.map((p, i) => (
                <Reveal key={p.title} delay={i * 70}>
                  <div className="lp-place">
                    <h3>{p.title}</h3>
                    <pre>{p.code}</pre>
                    <p>{p.text}</p>
                    {'link' in p && p.link ? <a href={p.link.href}>{p.link.label} →</a> : null}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-inner">
            <Reveal className="lp-head lp-head--center">
              <div className="lp-mark" aria-hidden="true" />
              <h2 className="lp-h2">Part of the Vhyxara family</h2>
              <p className="lp-sub">This page is built with VhyxUI and publishes a VhyxSeal manifest for AI agents.</p>
            </Reveal>
            <div className="lp-family-grid">
              {FAMILY.map((f, i) => (
                <Reveal key={f.lib} delay={i * 90}>
                  <a className="lp-fam" data-lib={f.lib} href={f.href} aria-current={f.current ? 'page' : undefined}>
                    <span className="lp-fam-name">{f.name}<small>{f.role}</small></span>
                    <p>{f.text}</p>
                    <span className="go">{f.current ? 'You are here' : `Visit ${f.name} →`}</span>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-inner">
            <Reveal className="lp-cta">
              <h2 className="lp-h2">Make your next diagram move</h2>
              <p className="lp-sub">Write it as text, add a scenario, and ship it to your docs, README or app.</p>
              <div className="lp-actions" style={{ justifyContent: 'center' }}>
                <Button size="lg" asChild><a href={GET_STARTED}>Get started</a></Button>
                <Button size="lg" variant="outline" asChild><a href={PLAYGROUND}>Open playground</a></Button>
                <Button size="lg" variant="ghost" asChild><a href={GITHUB}>Star on GitHub</a></Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <div className="lp-inner">
        <footer className="lp-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700, color: 'var(--vhyx-color-text)', fontSize: 16 }}>
              <span style={{ color: 'var(--lp-brand)', display: 'inline-flex' }}>{MARK}</span>VhyxChart
            </span>
            <span>Diagrams that move. MIT licensed, by <a href={VHYXARA}>Vhyxara</a>.</span>
            <div className="lp-mark" aria-hidden="true" style={{ width: 120 }} />
          </div>
          <nav aria-label="Footer">
            <div><strong>Learn</strong><a href={DOCS}>Documentation</a><a href={EXAMPLES_DOCS}>Examples</a><a href={REACT_DOCS}>React</a><a href={PLAYGROUND}>Playground</a></div>
            <div><strong>Family</strong><a href={VHYXUI}>VhyxUI</a><a href={VHYXSEAL}>VhyxSeal</a><a href={VHYXARA}>Vhyxara</a></div>
            <div><strong>Project</strong><a href={NPM}>npm</a><a href={MARKETPLACE}>VS Code Marketplace</a><a href={OPENVSX}>Open VSX</a><a href={GITHUB}>GitHub</a></div>
          </nav>
        </footer>
      </div>
    </VhyxUIProvider>
  );
}
