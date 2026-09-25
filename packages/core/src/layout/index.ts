import type { Diagram } from '../model.js';
import { layoutFlow } from './layered.js';
import { layoutSequence } from './sequence.js';
import { layoutArray } from './array.js';
import type { Layout } from './types.js';

export * from './types.js';
export { pointAt, routeToPath, sampleRoute } from './geometry.js';
export { measure, lineWidth, wrapText } from './text.js';
export { nodeSize } from './layered.js';

/**
 * Computes a deterministic layout for any diagram. Layout depends only on
 * structure — scenarios never move anything (continuity is free).
 * @example
 * const layout = layout(parse(src).diagram);
 */
export function layout(diagram: Diagram): Layout {
  switch (diagram.kind) {
    case 'flow':
      return layoutFlow(diagram);
    case 'sequence':
      return layoutSequence(diagram);
    case 'array':
      return layoutArray(diagram);
  }
}
