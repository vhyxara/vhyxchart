import type { NodeShape, Participant, SequenceFrame, SequenceMessage, SequenceNote, CellValue, FlowEdge, FlowNode } from '../model.js';
import type { Point, Rect, Route } from './geometry.js';

/** A positioned flow node (x/y = centre). */
export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: NodeShape;
  lines: string[];
  node: FlowNode;
}

/** A routed flow edge. */
export interface LaidOutEdge {
  id: string;
  from: string;
  to: string;
  route: Route;
  path: string;
  label?: { lines: string[]; x: number; y: number; width: number; height: number };
  edge: FlowEdge;
}

/** A positioned subgraph box. */
export interface LaidOutGroup {
  id: string;
  label: string;
  rect: Rect;
  depth: number;
  classes: string[];
}

/** Complete flow layout. */
export interface FlowLayout {
  kind: 'flow';
  width: number;
  height: number;
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  groups: LaidOutGroup[];
  titleHeight: number;
  horizontal: boolean;
}

/** Sequence layout. */
export interface SequenceLayout {
  kind: 'sequence';
  width: number;
  height: number;
  titleHeight: number;
  participants: Array<{ participant: Participant; x: number; headY: number; footY: number; width: number; height: number; lines: string[] }>;
  lifelineTop: number;
  lifelineBottom: number;
  messages: Array<{ message: SequenceMessage; index: number; y: number; x1: number; x2: number; path: string; self: boolean; labelLines: string[]; labelX: number; labelY: number; number: number }>;
  notes: Array<{ note: SequenceNote; rect: Rect; lines: string[] }>;
  frames: Array<{ frame: SequenceFrame; rect: Rect; sectionYs: Array<{ y: number; label: string }> }>;
  activations: Array<{ participant: string; x: number; y1: number; y2: number; startMessage: number }>;
}

/** Array layout. */
export interface ArrayLayout {
  kind: 'array';
  width: number;
  height: number;
  titleHeight: number;
  cellSize: number;
  cells: Array<{ index: number; x: number; y: number }>;
  values: CellValue[];
  pointerY: number;
  noteY: number;
}

/** Any layout. */
export type Layout = FlowLayout | SequenceLayout | ArrayLayout;

export type { Point, Rect, Route };
