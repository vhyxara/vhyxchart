'use client';

import React from 'react';
import { VhyxChart } from '@vhyxchart/react';
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

/** Plain code block. */
export function Code({ children }: { children: string }): React.ReactElement {
  return <pre className="code">{children.trim()}</pre>;
}

/** Docs frame: shared Vhyxara header, sidebar and on-this-page contents. */
export function DocsShell({ toc, children }: { toc?: TocItem[]; children: React.ReactNode }): React.ReactElement {
  return <ChartFrame toc={toc ?? []}>{children}</ChartFrame>;
}

export { PLAYGROUND };
