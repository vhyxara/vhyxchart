import {
  ArrowRightIcon,
  BrushIcon,
  CirclePlayIcon,
  CodeIcon,
  GitBranchIcon,
  LayoutGridIcon,
  NetworkIcon,
  PuzzleIcon,
  TerminalIcon,
  WorkflowIcon,
} from '@vhyxui/icons';
import React from 'react';
import Link from 'next/link';
import { ChartFrame } from '../components/ChartFrame';
import { GITHUB, PLAYGROUND, SITE, VHYXARA, VHYXSEAL, VHYXUI } from '../components/links';

const INSTALL = 'pnpm add @vhyxchart/react';

const STEPS = [
  { n: '01', title: 'Get started', text: 'Install, render your first diagram and press play — in about a minute.', href: '/docs/getting-started' },
  { n: '02', title: 'Add a scenario', text: 'Tokens travel edges, nodes change state and notes appear, all from text.', href: '/docs/scenarios' },
  { n: '03', title: 'Ship it anywhere', text: 'GitHub READMEs, docs sites, VS Code, React or any page with one script tag.', href: '/docs/markdown' },
];

const SECTIONS = [
  { icon: <WorkflowIcon />, title: 'Flowcharts & architecture', text: 'Nodes, edges, groups and shapes for systems and services.', href: '/docs/flowchart' },
  { icon: <CirclePlayIcon />, title: 'Scenarios', text: 'The timeline: tokens, states, notes and many stories on one layout.', href: '/docs/scenarios' },
  { icon: <NetworkIcon />, title: 'Sequence diagrams', text: 'Messages between participants, played one at a time.', href: '/docs/sequence' },
  { icon: <GitBranchIcon />, title: 'State diagrams', text: 'States and transitions that light up as the machine runs.', href: '/docs/state' },
  { icon: <LayoutGridIcon />, title: 'Arrays & algorithms', text: 'Swaps, pointers and comparisons for teaching and explaining code.', href: '/docs/arrays' },
  { icon: <BrushIcon />, title: 'Styling & themes', text: 'Themes, CSS variables, player options and per-part classes.', href: '/docs/styling' },
  { icon: <CodeIcon />, title: 'React', text: 'The player component, a headless hook and server rendering.', href: '/docs/react' },
  { icon: <TerminalIcon />, title: 'CLI', text: 'Render animated or static SVG for READMEs and CI.', href: '/docs/cli' },
  { icon: <PuzzleIcon />, title: 'Bring existing diagrams', text: 'Flowchart, sequence and state text you already have renders unchanged.', href: '/docs/existing-diagrams' },
];

const PLACES = [
  { label: 'Markdown & GitHub', href: '/docs/markdown' },
  { label: 'VS Code', href: '/docs/vscode' },
  { label: 'React', href: '/docs/react' },
  { label: 'Any website', href: '/docs/html' },
  { label: 'JavaScript API', href: '/docs/api' },
  { label: 'Examples', href: '/docs/examples' },
];

/** Docs start page: where to begin and a map of the docs. The pitch and the gallery live at vhyxchart.com. */
export default function Home(): React.ReactElement {
  return (
    <ChartFrame full>
      <div className="dh">
        <section className="dh-hero atmo-hero">
          <div className="atmo-aurora" aria-hidden="true"><span /><span /><span /></div>
          <div className="dh-inner dh-hero-inner">
            <Link href="/docs/styling" className="dh-pill"><b>0.2</b> Player header, controls toggle and themes <ArrowRightIcon size="1em" /></Link>
            <span className="atmo-eyebrow">Documentation</span>
            <h1 className="dh-title">Learn VhyxChart, <span className="atmo-gradient-text">one scenario at a time</span>.</h1>
            <p className="dh-lead">
              Write a diagram as text, add a scenario that plays it, and put it in your README, docs, editor or app.
            </p>
            <div className="dh-actions">
              <Link href="/docs/getting-started" className="dh-btn dh-btn--primary">Get started</Link>
              <a href={PLAYGROUND} className="dh-btn dh-btn--outline">Open playground</a>
              <span className="dh-install">
                <span className="dh-install-prompt" aria-hidden="true">$</span>
                <code>{INSTALL}</code>
              </span>
            </div>
          </div>
        </section>

        <section className="dh-section">
          <div className="dh-inner">
            <h2 className="dh-h2">Start here</h2>
            <div className="dh-steps">
              {STEPS.map((s) => (
                <Link key={s.n} href={s.href} className="atmo-card">
                  <span className="dh-step-n">{s.n}</span>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                  <span className="atmo-card-more">Read <ArrowRightIcon size="1em" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="dh-section">
          <div className="dh-inner">
            <h2 className="dh-h2">Explore the docs</h2>
            <div className="dh-grid">
              {SECTIONS.map((s) => (
                <Link key={s.title} href={s.href} className="atmo-card">
                  <span className="atmo-card-icon" aria-hidden="true">{s.icon}</span>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="dh-section">
          <div className="dh-inner">
            <div className="dh-heading-row">
              <h2 className="dh-h2">Use it where you write</h2>
              <Link href="/docs/why" className="dh-link">Why VhyxChart <ArrowRightIcon size="1em" /></Link>
            </div>
            <div className="dh-chips">
              {PLACES.map((p) => <Link key={p.href} href={p.href} className="dh-chip">{p.label}</Link>)}
            </div>
          </div>
        </section>

        <section className="dh-section">
          <div className="dh-inner">
            <div className="atmo-card dh-banner">
              <div>
                <strong>Edit a diagram and watch it play</strong>
                <p>The playground has every example, a live editor and exports for animated SVG, static SVG and Markdown.</p>
              </div>
              <div className="dh-banner-actions">
                <a href={PLAYGROUND} className="dh-btn dh-btn--primary">Open playground</a>
                <a href={SITE} className="dh-btn dh-btn--ghost">About VhyxChart</a>
              </div>
            </div>
          </div>
        </section>

        <footer className="dh-footer">
          <span className="atmo-family-bar" aria-hidden="true" />
          <div className="dh-footer-row">
            <span>A <a href={VHYXARA}>Vhyxara</a> project · MIT licensed</span>
            <span className="dh-footer-links">
              <a href={VHYXUI}>VhyxUI</a>
              <a href={VHYXSEAL}>VhyxSeal</a>
              <a href={GITHUB}>GitHub</a>
            </span>
          </div>
        </footer>
      </div>
    </ChartFrame>
  );
}
