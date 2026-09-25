import { ChartErrorCode } from '../errors.js';
import type {
  ClassDefs,
  DiagramConfig,
  Direction,
  EdgeHead,
  EdgeStroke,
  FlowDiagram,
  FlowEdge,
  FlowGroup,
  FlowNode,
  NodeShape,
  Scenario,
} from '../model.js';
import { Diagnostics, normaliseLabel, splitIds, unquote, type SourceLine } from './common.js';
import { parseStepBlock } from './steps.js';

interface NodeRef {
  id: string;
  label?: string;
  shape?: NodeShape;
  classes: string[];
}

interface EdgeOp {
  stroke: EdgeStroke;
  head: EdgeHead;
  tail: EdgeHead;
  label?: string;
}

const SHAPES: ReadonlyArray<{ open: string; close: string; shape: NodeShape }> = [
  { open: '(((', close: ')))', shape: 'doublecircle' },
  { open: '((', close: '))', shape: 'circle' },
  { open: '([', close: '])', shape: 'stadium' },
  { open: '[(', close: ')]', shape: 'cylinder' },
  { open: '[[', close: ']]', shape: 'subroutine' },
  { open: '[/', close: '/]', shape: 'parallelogram' },
  { open: '[/', close: '\\]', shape: 'trapezoid' },
  { open: '[\\', close: '\\]', shape: 'parallelogram-alt' },
  { open: '[\\', close: '/]', shape: 'trapezoid-alt' },
  { open: '{{', close: '}}', shape: 'hexagon' },
  { open: '[', close: ']', shape: 'rect' },
  { open: '(', close: ')', shape: 'round' },
  { open: '{', close: '}', shape: 'diamond' },
  { open: '>', close: ']', shape: 'asymmetric' },
];

const ID_CHAR = /[A-Za-z0-9_À-￿$]/;

class Scanner {
  pos = 0;
  constructor(readonly text: string) {}

  skipSpace(): void {
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos] ?? '')) this.pos++;
  }

  done(): boolean {
    this.skipSpace();
    return this.pos >= this.text.length;
  }

  startsWith(s: string): boolean {
    return this.text.startsWith(s, this.pos);
  }

  /** Reads a node id. Allows inner hyphens (`cart-btn`) but not `--`. */
  readId(): string | null {
    this.skipSpace();
    if (this.startsWith('[*]')) {
      this.pos += 3;
      return '[*]';
    }
    const start = this.pos;
    while (this.pos < this.text.length) {
      const ch = this.text[this.pos] ?? '';
      if (ID_CHAR.test(ch)) {
        this.pos++;
      } else if ((ch === '-' || ch === '.') && ID_CHAR.test(this.text[this.pos + 1] ?? '') && this.pos > start) {
        this.pos++;
      } else {
        break;
      }
    }
    return this.pos > start ? this.text.slice(start, this.pos) : null;
  }

  /** Reads a bracketed label and returns [label, shape]. */
  readShape(): { label: string; shape: NodeShape } | null {
    // Several shapes share an opener (`[/` → parallelogram or trapezoid), so
    // among candidates with the longest matching opener pick the nearest closer.
    let best: { end: number; open: string; close: string; shape: NodeShape } | null = null;
    for (const s of SHAPES) {
      if (!this.startsWith(s.open)) continue;
      if (best && s.open.length < best.open.length) break;
      const bodyStart = this.pos + s.open.length;
      let end: number;
      if (this.text[bodyStart] === '"') {
        let i = bodyStart + 1;
        while (i < this.text.length && !(this.text[i] === '"' && this.text[i - 1] !== '\\')) i++;
        end = this.text.startsWith(s.close, i + 1) ? i + 1 : -1;
      } else {
        end = this.text.indexOf(s.close, bodyStart);
      }
      if (end < 0) continue;
      if (!best || end < best.end) best = { end, open: s.open, close: s.close, shape: s.shape };
    }
    if (!best) return null;
    const bodyStart = this.pos + best.open.length;
    this.pos = best.end + best.close.length;
    return { label: normaliseLabel(this.text.slice(bodyStart, best.end)), shape: best.shape };
  }

  readClassSuffix(): string[] {
    const out: string[] = [];
    while (this.startsWith(':::')) {
      this.pos += 3;
      const start = this.pos;
      while (this.pos < this.text.length && /[\w-]/.test(this.text[this.pos] ?? '')) this.pos++;
      out.push(this.text.slice(start, this.pos));
    }
    return out;
  }

  readNode(): NodeRef | null {
    const save = this.pos;
    const id = this.readId();
    if (id === null) {
      this.pos = save;
      return null;
    }
    const shape = id === '[*]' ? null : this.readShape();
    const classes = this.readClassSuffix();
    return { id, classes, ...(shape ? { label: shape.label, shape: shape.shape } : {}) };
  }

  /** Reads `A & B & C`. */
  readGroup(): NodeRef[] | null {
    const first = this.readNode();
    if (!first) return null;
    const out = [first];
    for (;;) {
      const save = this.pos;
      this.skipSpace();
      if (this.text[this.pos] !== '&') {
        this.pos = save;
        return out;
      }
      this.pos++;
      const next = this.readNode();
      if (!next) {
        this.pos = save;
        return out;
      }
      out.push(next);
    }
  }

  /** Reads an edge operator with optional inline or piped label. */
  readEdge(): EdgeOp | null {
    this.skipSpace();
    const rest = this.text.slice(this.pos);
    // Inline text forms: `-- text -->`, `-. text .->`, `== text ==>`
    const inline =
      /^(<)?--\s+(.+?)\s+(-{2,}[>ox]|-{3,})(?=\s|[A-Za-z0-9_[(]|$)/.exec(rest) ??
      /^(<)?-\.\s+(.+?)\s+(\.-[>ox]?|\.+-+[>ox]?)(?=\s|[A-Za-z0-9_[(]|$)/.exec(rest) ??
      /^(<)?==\s+(.+?)\s+(={2,}[>ox]|={3,})(?=\s|[A-Za-z0-9_[(]|$)/.exec(rest);
    if (inline) {
      const closer = inline[3] ?? '';
      this.pos += inline[0].length;
      return {
        stroke: closer.includes('=') ? 'thick' : closer.includes('.') ? 'dotted' : 'solid',
        head: headOf(closer),
        tail: inline[1] ? 'arrow' : 'none',
        label: normaliseLabel(inline[2] ?? ''),
      };
    }
    const op = /^(<|o(?=[-=.])|x(?=[-=.]))?(-{2,}|={2,}|-\.+-|-\.+|~{3,})([>ox])?/.exec(rest);
    if (!op) return null;
    const body = op[2] ?? '';
    const headChar = op[3];
    // `A --- B`, `A === B`, `A -.- B` are valid without a head; `--`/`==` alone are not.
    if (!headChar && (body === '--' || body === '==')) return null;
    this.pos += op[0].length;
    const edge: EdgeOp = {
      stroke: body.startsWith('~') ? 'invisible' : body.startsWith('=') ? 'thick' : body.includes('.') ? 'dotted' : 'solid',
      head: headChar === '>' ? 'arrow' : headChar === 'o' ? 'circle' : headChar === 'x' ? 'cross' : 'none',
      tail: op[1] === '<' ? 'arrow' : op[1] === 'o' ? 'circle' : op[1] === 'x' ? 'cross' : 'none',
    };
    this.skipSpace();
    if (this.text[this.pos] === '|') {
      const end = this.text.indexOf('|', this.pos + 1);
      if (end > 0) {
        edge.label = normaliseLabel(this.text.slice(this.pos + 1, end));
        this.pos = end + 1;
      }
    }
    return edge;
  }
}

function headOf(closer: string): EdgeHead {
  const last = closer[closer.length - 1];
  return last === '>' ? 'arrow' : last === 'o' ? 'circle' : last === 'x' ? 'cross' : 'none';
}

function parseStyleList(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(',')) {
    const colon = part.indexOf(':');
    if (colon <= 0) continue;
    const key = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim().replace(/;$/, '');
    if (/^[a-z-]+$/i.test(key) && value) out[key] = value;
  }
  return out;
}

const HEADER = /^(flowchart|graph|flow|architecture|arch|state|statediagram(?:-v2)?)\b\s*(TB|TD|BT|LR|RL)?\s*(.*)$/i;

/** Returns true for lines that start a flow diagram. */
export function isFlowHeader(text: string): boolean {
  return HEADER.test(text);
}

/**
 * Parses a flowchart / architecture / state diagram.
 * Mermaid flowchart syntax is accepted as-is; `scenario` blocks add motion.
 */
export function parseFlow(lines: readonly SourceLine[], config: DiagramConfig, diags: Diagnostics): FlowDiagram {
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const groups: FlowGroup[] = [];
  const classDefs: ClassDefs = {};
  const scenarios: Scenario[] = [];
  const groupStack: string[] = [];
  let direction: Direction = 'TB';
  let isState = false;
  let i = 0;

  const first = lines[0];
  const header = first ? HEADER.exec(first.text) : null;
  if (header) {
    const kind = (header[1] ?? '').toLowerCase();
    isState = kind.startsWith('state');
    const dir = (header[2] ?? '').toUpperCase();
    if (dir === 'TD' || dir === 'TB') direction = 'TB';
    else if (dir === 'BT' || dir === 'LR' || dir === 'RL') direction = dir;
    else if (kind === 'architecture' || kind === 'arch') direction = 'LR';
    const inlineTitle = (header[3] ?? '').trim();
    if (inlineTitle && !config.title) config.title = unquote(inlineTitle);
    i = 1;
  }

  const ensureNode = (ref: NodeRef, line: number, role: 'source' | 'target'): string => {
    let id = ref.id;
    let shape: NodeShape | undefined = ref.shape;
    let label = ref.label;
    if (id === '[*]') {
      const scope = groupStack[groupStack.length - 1] ?? 'root';
      id = role === 'source' ? `__start_${scope}` : `__end_${scope}`;
      shape = role === 'source' ? 'start' : 'end';
      label = '';
    }
    const existing = nodes.get(id);
    const group = groupStack[groupStack.length - 1];
    if (existing) {
      if (label !== undefined) existing.label = label;
      if (shape !== undefined) existing.shape = shape;
      for (const c of ref.classes) if (!existing.classes.includes(c)) existing.classes.push(c);
      if (existing.group === undefined && group !== undefined) existing.group = group;
    } else {
      nodes.set(id, {
        id,
        label: label ?? id,
        shape: shape ?? (isState ? 'round' : 'rect'),
        classes: [...ref.classes],
        style: {},
        ...(group !== undefined ? { group } : {}),
        line,
      });
    }
    return id;
  };

  const addEdge = (from: string, to: string, op: EdgeOp, line: number): void => {
    const base = `${from}->${to}`;
    let id = base;
    let n = 2;
    while (edges.some((e) => e.id === id)) id = `${base}#${n++}`;
    edges.push({ id, from, to, stroke: op.stroke, head: op.head, tail: op.tail, line, ...(op.label ? { label: op.label } : {}) });
  };

  const isScenarioHeader = (text: string): boolean => /^(scenario|play|story)\b/i.test(text);

  while (i < lines.length) {
    const src = lines[i] as SourceLine;
    const { text, line } = src;
    const lower = text.toLowerCase();

    if (isScenarioHeader(text)) {
      const m = /^(?:scenario|play|story)\s*:?\s*(.*)$/i.exec(text);
      const name = unquote((m?.[1] ?? '').replace(/\s+loop$/i, '')) || `Scenario ${scenarios.length + 1}`;
      const block = parseStepBlock(lines, i + 1, 'flow', diags, isScenarioHeader);
      scenarios.push({ name, steps: block.steps, line });
      i = block.next;
      continue;
    }

    const sub = /^subgraph\s+(.+)$/i.exec(text);
    if (sub) {
      const spec = (sub[1] ?? '').trim();
      const withLabel = /^([\w-]+)\s*\[(.*)\]$/.exec(spec);
      const id = withLabel ? (withLabel[1] ?? '') : /^[\w-]+$/.test(spec) ? spec : `group${groups.length + 1}`;
      const label = withLabel ? normaliseLabel(withLabel[2] ?? '') : normaliseLabel(spec);
      const parent = groupStack[groupStack.length - 1];
      groups.push({ id, label, classes: [], line, ...(parent !== undefined ? { parent } : {}) });
      groupStack.push(id);
      i++;
      continue;
    }
    if (lower === 'end') {
      if (groupStack.length === 0) diags.warn(ChartErrorCode.UNEXPECTED_END, line, '"end" without a matching subgraph');
      groupStack.pop();
      i++;
      continue;
    }
    const dirLine = /^direction\s+(TB|TD|BT|LR|RL)$/i.exec(text);
    if (dirLine) {
      if (groupStack.length === 0) {
        const d = (dirLine[1] ?? 'TB').toUpperCase();
        direction = d === 'TD' ? 'TB' : (d as Direction);
      }
      i++;
      continue;
    }
    const classDef = /^classDef\s+([\w,-]+)\s+(.+)$/i.exec(text);
    if (classDef) {
      for (const name of splitIds(classDef[1] ?? '')) classDefs[name] = { ...classDefs[name], ...parseStyleList(classDef[2] ?? '') };
      i++;
      continue;
    }
    const cls = /^class\s+([\w,\s-]+?)\s+([\w-]+)$/i.exec(text);
    if (cls) {
      for (const id of splitIds(cls[1] ?? '')) {
        const node = nodes.get(id);
        const group = groups.find((g) => g.id === id);
        if (node && !node.classes.includes(cls[2] ?? '')) node.classes.push(cls[2] ?? '');
        else if (group) group.classes.push(cls[2] ?? '');
        else diags.warn(ChartErrorCode.UNKNOWN_NODE, line, `class: unknown node "${id}"`);
      }
      i++;
      continue;
    }
    const style = /^style\s+([\w-]+)\s+(.+)$/i.exec(text);
    if (style) {
      const node = nodes.get(style[1] ?? '');
      if (node) Object.assign(node.style, parseStyleList(style[2] ?? ''));
      else diags.warn(ChartErrorCode.UNKNOWN_NODE, line, `style: unknown node "${style[1]}"`);
      i++;
      continue;
    }
    if (/^(click|linkStyle|accTitle|accDescr|title)\b/i.test(text)) {
      const t = /^title\s*:?\s*(.+)$/i.exec(text);
      if (t && !config.title) config.title = unquote(t[1] ?? '');
      i++;
      continue;
    }
    // State diagram: `state "Long label" as id` and `id : description`
    const stateAlias = /^state\s+"(.+)"\s+as\s+([\w-]+)$/i.exec(text);
    if (stateAlias) {
      ensureNode({ id: stateAlias[2] ?? '', label: normaliseLabel(stateAlias[1] ?? ''), shape: 'round', classes: [] }, line, 'source');
      i++;
      continue;
    }
    if (isState) {
      const desc = /^([\w-]+)\s*:\s*(.+)$/.exec(text);
      if (desc && !/--|==|-\./.test(text)) {
        ensureNode({ id: desc[1] ?? '', label: normaliseLabel(desc[2] ?? ''), classes: [] }, line, 'source');
        i++;
        continue;
      }
    }

    // Node / edge chain
    const scanner = new Scanner(text);
    let left = scanner.readGroup();
    if (!left) {
      diags.error(ChartErrorCode.UNKNOWN_STATEMENT, line, `Cannot read "${text}"`, 'Examples: A[Client] --> B[API] · subgraph api [API] … end · scenario Happy path');
      i++;
      continue;
    }
    let leftIds = left.map((r) => ensureNode(r, line, 'source'));
    let lastEdgeStart = edges.length;
    let ok = true;
    while (!scanner.done()) {
      // Trailing `: label` (state diagram style) applies to the last hop.
      if (scanner.text[scanner.pos] === ':' && scanner.text[scanner.pos + 1] !== ':') {
        const label = normaliseLabel(scanner.text.slice(scanner.pos + 1));
        for (let k = lastEdgeStart; k < edges.length; k++) {
          const e = edges[k];
          if (e) e.label = label;
        }
        scanner.pos = scanner.text.length;
        break;
      }
      const op = scanner.readEdge();
      if (!op) {
        ok = false;
        break;
      }
      const right = scanner.readGroup();
      if (!right) {
        ok = false;
        break;
      }
      const rightIds = right.map((r) => ensureNode(r, line, 'target'));
      lastEdgeStart = edges.length;
      for (const a of leftIds) for (const b of rightIds) addEdge(a, b, op, line);
      left = right;
      leftIds = rightIds;
    }
    if (!ok) {
      diags.error(
        ChartErrorCode.UNKNOWN_STATEMENT,
        line,
        `Cannot read the rest of "${text}" (near "${scanner.text.slice(scanner.pos, scanner.pos + 12)}")`,
        'Edges look like A --> B, A -->|label| B, A -.-> B, A ==> B, A --- B',
      );
    }
    i++;
  }

  if (groupStack.length > 0) {
    const g = groups.find((x) => x.id === groupStack[groupStack.length - 1]);
    diags.error(ChartErrorCode.UNCLOSED_BLOCK, g?.line ?? 1, `subgraph "${g?.label ?? ''}" is missing "end"`, 'Close every subgraph with a line containing only: end');
  }

  return { kind: 'flow', direction, nodes: [...nodes.values()], edges, groups, classDefs, scenarios, config };
}
