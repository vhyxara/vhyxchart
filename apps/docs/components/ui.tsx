'use client';

import React from 'react';
import { VhyxChart, type VhyxChartProps } from '@vhyxchart/react';
import { ChartFrame } from './ChartFrame';
import { PLAYGROUND } from './links';

interface TocItem { id: string; label: string }

/** Source + live preview side by side. */
export function Example({ source, height }: { source: string; height?: number }): React.ReactElement {
  return (
    <div className="example">
      <pre className="code" style={height ? { maxHeight: height } : undefined}>{source.trim()}</pre>
      <VhyxChart source={source} />
    </div>
  );
}

/** A live chart with player options, shown above the code that produces it. */
export function Demo({ code, ...props }: VhyxChartProps & { code: string }): React.ReactElement {
  return (
    <div className="demo">
      <VhyxChart autoplay={false} {...props} />
      <pre className="code">{code.trim()}</pre>
    </div>
  );
}

/** Developer-controlled visibility: the app owns the state and hides the reader switch. */
export function ControlledDemo({ source }: { source: string }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="demo">
      <div className="demo-toolbar">
        <button type="button" className="demo-btn" onClick={() => { setOpen((o) => !o); }}>
          {open ? 'Hide controller' : 'Show controller'}
        </button>
        <span>Your own button; the header switch is hidden with controlsToggle={'{false}'}.</span>
      </div>
      <VhyxChart source={source} autoplay={false} controls={open} controlsToggle={false} />
    </div>
  );
}

/** Plain code block. */
export function Code({ children }: { children: string }): React.ReactElement {
  return <pre className="code">{children.trim()}</pre>;
}

/** Docs frame: shared Vhyxara header, sidebar and on-this-page contents. */
export function DocsShell({ toc, children }: { toc?: TocItem[]; children: React.ReactNode }): React.ReactElement {
  return <ChartFrame toc={toc ?? []}>{children}</ChartFrame>;
}

export { PLAYGROUND };
