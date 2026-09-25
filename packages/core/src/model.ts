/**
 * VhyxChart diagram model.
 *
 * Structure (nodes, edges, groups, participants, cells) is immutable once
 * parsed. Behaviour lives in scenarios — ordered steps replayed by the
 * timeline. Layout never depends on scenario state, so nothing moves
 * structurally during playback (invariants I-001, I-004, I-007 from the
 * visual-runtime experiments).
 */

/** Diagram families. */
export type DiagramKind = 'flow' | 'sequence' | 'array';

/** Layout direction for flow diagrams. */
export type Direction = 'TB' | 'BT' | 'LR' | 'RL';

/** Node shapes (Mermaid-compatible syntax, see parser). */
export type NodeShape =
  | 'rect'
  | 'round'
  | 'stadium'
  | 'subroutine'
  | 'cylinder'
  | 'circle'
  | 'doublecircle'
  | 'diamond'
  | 'hexagon'
  | 'parallelogram'
  | 'parallelogram-alt'
  | 'trapezoid'
  | 'trapezoid-alt'
  | 'asymmetric'
  | 'start'
  | 'end';

/** Runtime state a node can be in during a scenario. */
export type NodeState = 'idle' | 'active' | 'done' | 'error' | 'warn' | 'skipped';

/** Edge line style. */
export type EdgeStroke = 'solid' | 'dotted' | 'thick' | 'invisible';

/** Edge end decoration. */
export type EdgeHead = 'arrow' | 'none' | 'circle' | 'cross';

/** A flow node. */
export interface FlowNode {
  id: string;
  label: string;
  shape: NodeShape;
  classes: string[];
  /** Inline style overrides from `style id fill:...`. */
  style: Record<string, string>;
  /** Group (subgraph) id, if any. */
  group?: string;
  /** 1-based source line where the node was first declared. */
  line: number;
}

/** A flow edge. Directed from `from` to `to`. */
export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  stroke: EdgeStroke;
  head: EdgeHead;
  tail: EdgeHead;
  line: number;
}

/** A subgraph / group of nodes. */
export interface FlowGroup {
  id: string;
  label: string;
  parent?: string;
  classes: string[];
  line: number;
}

/** Sequence diagram participant. */
export interface Participant {
  id: string;
  label: string;
  kind: 'participant' | 'actor' | 'database' | 'queue';
  line: number;
}

/** Sequence message arrow. */
export interface SequenceMessage {
  id: string;
  from: string;
  to: string;
  label: string;
  stroke: 'solid' | 'dotted';
  head: 'arrow' | 'open' | 'cross' | 'async';
  /** Activation change on the receiver (+) or sender (-). */
  activate?: 'target' | 'source-end';
  /** Parallel branch key: messages with the same `parGroup` start together. */
  parGroup?: string;
  parBranch?: number;
  line: number;
}

/** A note in a sequence diagram. */
export interface SequenceNote {
  id: string;
  position: 'left' | 'right' | 'over';
  participants: string[];
  text: string;
  /** Index of the message this note follows (-1 = before all). */
  after: number;
  line: number;
}

/** A loop/alt/opt/par/rect frame drawn around messages. */
export interface SequenceFrame {
  id: string;
  kind: 'loop' | 'alt' | 'opt' | 'par' | 'rect' | 'critical' | 'break';
  label: string;
  /** Section labels for alt/else and par/and, with the first message index of each section. */
  sections: Array<{ label: string; startMessage: number }>;
  startMessage: number;
  endMessage: number;
  depth: number;
  line: number;
}

/** Array cell value. */
export type CellValue = number | string;

/** One scenario step (flow/array). */
export type Step =
  | { kind: 'travel'; from: string; to: string; label?: string; line: number }
  | { kind: 'state'; nodes: string[]; state: NodeState; line: number }
  | { kind: 'pulse'; nodes: string[]; line: number }
  | { kind: 'note'; target?: string; text: string; line: number }
  | { kind: 'caption'; text: string; line: number }
  | { kind: 'wait'; ms: number; line: number }
  | { kind: 'reset'; line: number }
  | { kind: 'parallel'; steps: Step[]; line: number }
  | { kind: 'compare'; i: number; j: number; line: number }
  | { kind: 'swap'; i: number; j: number; line: number }
  | { kind: 'set'; i: number; value: CellValue; line: number }
  | { kind: 'mark'; indices: number[]; state: NodeState | null; line: number }
  | { kind: 'pointer'; name: string; index: number | null; line: number };

/** A named, replayable scenario. */
export interface Scenario {
  name: string;
  steps: Step[];
  line: number;
}

/** Style definition from `classDef`. */
export type ClassDefs = Record<string, Record<string, string>>;

/** Frontmatter / header options. */
export interface DiagramConfig {
  title?: string;
  theme: 'auto' | 'light' | 'dark';
  /** Playback speed multiplier. */
  speed: number;
  loop: boolean;
  autoplay: boolean;
  controls: boolean;
  /** Ambient edge animation when there is no scenario. */
  ambient: boolean;
  /** Milliseconds for one token to travel an edge at speed 1. */
  travelMs: number;
  /** Visual density. */
  spacing: 'compact' | 'normal' | 'relaxed';
}

interface DiagramBase {
  config: DiagramConfig;
  scenarios: Scenario[];
}

/** Flowchart / architecture / state diagram. */
export interface FlowDiagram extends DiagramBase {
  kind: 'flow';
  direction: Direction;
  nodes: FlowNode[];
  edges: FlowEdge[];
  groups: FlowGroup[];
  classDefs: ClassDefs;
}

/** Sequence diagram. */
export interface SequenceDiagram extends DiagramBase {
  kind: 'sequence';
  participants: Participant[];
  messages: SequenceMessage[];
  notes: SequenceNote[];
  frames: SequenceFrame[];
  autonumber: boolean;
}

/** Array / algorithm diagram. */
export interface ArrayDiagram extends DiagramBase {
  kind: 'array';
  values: CellValue[];
}

/** Any parsed diagram. */
export type Diagram = FlowDiagram | SequenceDiagram | ArrayDiagram;

/** Default config values. */
export const DEFAULT_CONFIG: Readonly<DiagramConfig> = Object.freeze({
  theme: 'auto',
  speed: 1,
  loop: true,
  autoplay: true,
  controls: true,
  ambient: true,
  travelMs: 900,
  spacing: 'normal',
});
