import { describe, it, expect } from 'vitest';
import { parse, compileTimeline, renderAnimatedSvg } from '@vhyxchart/core';
import { EXAMPLES } from '../src/index.js';

describe('examples', () => {
  for (const ex of EXAMPLES) {
    it(`${ex.id} parses cleanly, has motion, and exports`, () => {
      const { diagram, diagnostics } = parse(ex.source);
      expect(diagnostics).toEqual([]);
      expect(compileTimeline(diagram, 0).duration).toBeGreaterThan(0);
      expect(renderAnimatedSvg(diagram)).toContain('<animate');
    });
  }
});
