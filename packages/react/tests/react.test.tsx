import { describe, it, expect, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { VhyxChart, VhyxChartStatic, useVhyxChart, dedent } from '../src/index.js';

const SRC = 'flowchart LR\n  a --> b\nscenario s\n  a -> b\n  b is done';

describe('dedent', () => {
  it('removes shared indentation', () => {
    expect(dedent('\n    flowchart\n      a --> b\n  ')).toBe('flowchart\n  a --> b');
  });
});

describe('<VhyxChart>', () => {
  it('renders a diagram from children and reports readiness', async () => {
    const onReady = vi.fn();
    const { container } = render(<VhyxChart autoplay={false} onReady={onReady}>{SRC}</VhyxChart>);
    await waitFor(() => expect(container.querySelector('svg.vc')).not.toBeNull());
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('updates in place when the source changes', async () => {
    const { container, rerender } = render(<VhyxChart autoplay={false} source={SRC} />);
    await waitFor(() => expect(container.querySelectorAll('[data-vc-node]')).toHaveLength(2));
    rerender(<VhyxChart autoplay={false} source={SRC.replace('a --> b', 'a --> b --> c')} />);
    await waitFor(() => expect(container.querySelectorAll('[data-vc-node]')).toHaveLength(3));
  });
});

describe('useVhyxChart', () => {
  function Custom(): React.ReactElement {
    const { ref, player, state } = useVhyxChart(SRC, { autoplay: false, controls: false });
    return (
      <div>
        <div ref={ref} />
        <button onClick={() => player?.step(1)}>next</button>
        <output>{state.scenarios.join(',')}|{Math.round(state.time)}</output>
      </div>
    );
  }

  it('exposes player and reactive state for custom controls', async () => {
    const { container, getByText } = render(<Custom />);
    await waitFor(() => expect(container.querySelector('output')?.textContent).toBe('s|0'));
    expect((container.querySelector('[role="toolbar"]') as HTMLElement).style.display).toBe('none');
    act(() => getByText('next').click());
    await waitFor(() => expect(container.querySelector('output')?.textContent).not.toBe('s|0'));
  });
});

describe('<VhyxChartStatic>', () => {
  it('server-renders an animated SVG without hooks', () => {
    const html = renderToString(<VhyxChartStatic>{SRC}</VhyxChartStatic>);
    expect(html).toContain('<svg');
    expect(html).toContain('animateMotion');
    expect(renderToString(<VhyxChartStatic animated={false} source={SRC} />)).not.toContain('animateMotion');
  });
});
