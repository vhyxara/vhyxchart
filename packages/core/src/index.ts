/**
 * @vhyxchart/core — diagrams that move.
 *
 *   text ──parse──▶ Diagram ──layout──▶ Layout ──render──▶ SVG
 *                      │
 *                      └──compileTimeline──▶ Timeline ──frameAt(t)──▶ Frame
 *
 * Structure is immutable and laid out once; scenarios replay on top of it
 * as a pure function of time, so play/pause/scrub/step are free and exact.
 */
export * from './model.js';
export * from './errors.js';
export { parse, parseStrict, type ParseResult } from './parser/index.js';
export { layout } from './layout/index.js';
export type * from './layout/types.js';
export { pointAt, routeToPath, measure, lineWidth, nodeSize } from './layout/index.js';
export { compileTimeline, frameAt, finalFrame, easeInOut } from './timeline/index.js';
export type { Timeline, TimelineStep, TimedAction, Action, Frame, ArrayItem } from './timeline/index.js';
export { renderSvg, renderDynamic, viewHeight, bottomBand, hashId, esc, type RenderOptions } from './render/svg.js';
export { baseCss, BUILTIN_CLASSES, STATE_COLORS } from './render/theme.js';
export { renderAnimatedSvg, type AnimatedSvgOptions } from './render/animate.js';
export { render, renderMarkdown, extractBlocks, type RenderResult, type MarkdownBlock } from './convenience.js';
export { traceArray, type ArrayTracer } from './trace.js';
