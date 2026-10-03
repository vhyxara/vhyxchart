'use client';

import { CirclePlayIcon, FeatherIcon, GitBranchIcon, LaptopIcon, PlayIcon, PuzzleIcon } from '@vhyxui/icons';
import React, { useState } from 'react';
import Link from 'next/link';
import { VhyxChart } from '@vhyxchart/react';
import { EXAMPLES } from '@vhyxchart/examples';
import { ChartFrame } from '../components/ChartFrame';
import { GITHUB, PLAYGROUND, VHYXARA, VHYXSEAL, VHYXUI } from '../components/links';

const SHOWCASE = ['checkout', 'oauth', 'agent', 'bubble', 'pipeline'];

const FEATURES = [
  { icon: <PlayIcon size={20} />, title: 'Scenarios', text: 'Tokens travel edges, nodes change state, notes appear. Many scenarios per diagram, one layout.' },
  { icon: <CirclePlayIcon size={20} />, title: 'Play, step, scrub', text: 'Every frame is a pure function of time, so scrubbing backwards is exact.' },
  { icon: <GitBranchIcon size={20} />, title: 'Animated on GitHub', text: 'Export SMIL-animated SVG that plays inside README images. No JavaScript.' },
  { icon: <PuzzleIcon size={20} />, title: 'Bring existing diagrams', text: 'Flowcharts, sequence and state diagrams you already have render unchanged.' },
  { icon: <LaptopIcon size={20} />, title: 'VS Code live preview', text: 'Fences animate in the Markdown preview; .vhyx files preview as you type.' },
  { icon: <FeatherIcon size={20} />, title: 'Tiny and deterministic', text: '~30 KB gzipped, zero dependencies, same output in Node and the browser.' },
];

const RUNS = [
  { href: '/docs/markdown', code: '```vhyx', text: 'Markdown fences in docs sites and GitHub READMEs' },
  { href: '/docs/vscode', code: 'code --install-extension', text: 'Live preview in VS Code as you type' },
  { href: '/docs/react', code: '<VhyxChart />', text: 'React component, headless hook and server render' },
  { href: '/docs/html', code: '<vhyx-chart>', text: 'Any page with one script tag' },
];

export default function Home(): React.ReactElement {
  const [active, setActive] = useState(SHOWCASE[0] ?? 'checkout');
  const example = EXAMPLES.find((e) => e.id === active) ?? EXAMPLES[0];

  return (
    <ChartFrame full>
      <section className="ch-hero ch-grid-bg">
        <div className="ch-home-inner ch-hero-copy">
          <span className="ch-eyebrow">Text-first · 30 KB · animated SVG for GitHub</span>
          <h1 className="ch-hero-title">Diagrams that move.</h1>
          <p className="ch-hero-lead">
            Write architecture, flows, sequences and algorithms as text. Add a scenario and watch requests travel,
            services fail and values sort — in docs, READMEs, VS Code and React.
          </p>
          <div className="ch-actions">
            <Link href="/docs/getting-started" className="ch-btn ch-btn--primary">Get started</Link>
            <a href={PLAYGROUND} className="ch-btn ch-btn--ghost">Open playground</a>
            <span className="ch-install"><span aria-hidden="true">$</span>pnpm add @vhyxchart/react</span>
          </div>
        </div>

        <div className="ch-home-inner">
          <div className="ch-showcase">
            <div className="ch-showcase-tabs" role="tablist" aria-label="Showcase">
              {SHOWCASE.map((id) => {
                const e = EXAMPLES.find((x) => x.id === id);
                return e ? (
                  <button key={id} type="button" role="tab" aria-selected={id === active} className="ch-tab" onClick={() => { setActive(id); }}>
                    {e.title}
                  </button>
                ) : null;
              })}
            </div>
            <div className="ch-showcase-body" role="tabpanel">
              <pre className="ch-showcase-source">{example?.source}</pre>
              <div className="ch-showcase-stage"><VhyxChart key={active} source={example?.source ?? ''} autoplay controls /></div>
            </div>
            <p className="ch-showcase-caption">{example?.description}</p>
          </div>
        </div>
      </section>

      <section className="ch-section">
        <div className="ch-home-inner">
          <div className="ch-section-head">
            <h2 className="ch-h2">Text in, motion out</h2>
            <p className="ch-section-lead">Familiar diagram syntax, plus a timeline. Nothing to draw by hand.</p>
          </div>
          <div className="ch-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="ch-feature">{f.icon}<strong>{f.title}</strong><p>{f.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="ch-section" style={{ paddingTop: 0 }}>
        <div className="ch-home-inner">
          <div className="ch-section-head">
            <h2 className="ch-h2">Runs where your docs live</h2>
            <p className="ch-section-lead">The same text renders everywhere, with the same output.</p>
          </div>
          <div className="ch-runs">
            {RUNS.map((r) => (
              <Link key={r.href} href={r.href} className="ch-run"><code>{r.code}</code><span>{r.text}</span></Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="ch-footer">
        <span>A <a href={VHYXARA}>Vhyxara</a> project · MIT licensed</span>
        <span className="ch-footer-links">
          <a href={VHYXUI}>VhyxUI</a>
          <a href={VHYXSEAL}>VhyxSeal</a>
          <a href={GITHUB}>GitHub</a>
        </span>
      </footer>
    </ChartFrame>
  );
}
