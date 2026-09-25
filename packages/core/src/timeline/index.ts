import type { CellValue, Diagram, FlowDiagram, NodeState, Step } from '../model.js';

/** A single timed visual action. */
export type Action =
  | { kind: 'travel'; edgeId: string; reverse: boolean; label?: string }
  | { kind: 'state'; node: string; state: NodeState }
  | { kind: 'pulse'; node: string }
  | { kind: 'note'; target?: string; text: string }
  | { kind: 'caption'; text: string }
  | { kind: 'reset' }
  | { kind: 'message'; index: number }
  | { kind: 'reveal'; id: string }
  | { kind: 'compare'; i: number; j: number }
  | { kind: 'swap'; i: number; j: number; itemA: number; itemB: number }
  | { kind: 'set'; i: number; value: CellValue; oldItem: number; newItem: number }
  | { kind: 'mark'; indices: number[]; state: NodeState | null }
  | { kind: 'pointer'; name: string; index: number | null };

/** Action placed on the timeline (ms). */
export interface TimedAction {
  start: number;
  end: number;
  /** Index into `Timeline.steps`. */
  step: number;
  action: Action;
}

/** A user-facing step boundary (for step forward/back and captions). */
export interface TimelineStep {
  start: number;
  end: number;
  label: string;
  line: number;
}

/** A compiled, replayable scenario. */
export interface Timeline {
  scenario: string;
  duration: number;
  actions: TimedAction[];
  steps: TimelineStep[];
  /** Initial array values (array diagrams). */
  initialValues: CellValue[];
}

const BASE = {
  state: 380,
  pulse: 520,
  note: 1300,
  caption: 250,
  reset: 300,
  compare: 650,
  swap: 850,
  set: 500,
  mark: 380,
  pointer: 380,
};

function edgeFor(d: FlowDiagram, from: string, to: string): { id: string; reverse: boolean } | null {
  const forward = d.edges.find((e) => e.from === from && e.to === to);
  if (forward) return { id: forward.id, reverse: false };
  const back = d.edges.find((e) => e.from === to && e.to === from);
  return back ? { id: back.id, reverse: true } : null;
}

function describe(step: Step): string {
  switch (step.kind) {
    case 'travel':
      return `${step.from} → ${step.to}${step.label ? `: ${step.label}` : ''}`;
    case 'state':
      return `${step.nodes.join(', ')} ${step.nodes.length > 1 ? 'are' : 'is'} ${step.state}`;
    case 'pulse':
      return `highlight ${step.nodes.join(', ')}`;
    case 'note':
      return step.text;
    case 'caption':
      return step.text;
    case 'wait':
      return `wait ${step.ms}ms`;
    case 'reset':
      return 'reset';
    case 'parallel':
      return step.steps.map(describe).join(' · ');
    case 'compare':
      return `compare [${step.i}] and [${step.j}]`;
    case 'swap':
      return `swap [${step.i}] and [${step.j}]`;
    case 'set':
      return `set [${step.i}] = ${step.value}`;
    case 'mark':
      return step.state ? `mark ${step.indices.join(', ')} ${step.state}` : `unmark ${step.indices.join(', ')}`;
    case 'pointer':
      return step.index === null ? `${step.name} cleared` : `${step.name} = ${step.index}`;
  }
}

/**
 * Compiles a scenario into a timeline. Pure and deterministic (I-003):
 * the same diagram and scenario always yield the same timeline.
 *
 * @param diagram - Parsed diagram.
 * @param scenarioIndex - Which scenario to compile (sequence diagrams have exactly one).
 * @example
 * const tl = compileTimeline(diagram, 0);
 * const frame = frameAt(tl, 1200);
 */
export function compileTimeline(diagram: Diagram, scenarioIndex = 0): Timeline {
  const speed = diagram.config.speed > 0 ? diagram.config.speed : 1;
  const scale = (ms: number): number => ms / speed;
  const travel = scale(diagram.config.travelMs);
  const actions: TimedAction[] = [];
  const steps: TimelineStep[] = [];

  if (diagram.kind === 'sequence') {
    const waits = new Map<number, number>();
    for (const s of diagram.scenarios[0]?.steps ?? []) if (s.kind === 'wait') waits.set(s.line, (waits.get(s.line) ?? 0) + scale(s.ms));
    let t = 0;
    const revealNotes = (after: number, at: number): void => {
      for (const n of diagram.notes) if (n.after === after) actions.push({ start: at, end: at + scale(250), step: Math.max(0, steps.length - 1), action: { kind: 'reveal', id: n.id } });
    };
    revealNotes(-1, 0);
    const handled = new Set<number>();
    diagram.messages.forEach((m, i) => {
      if (handled.has(i)) return;
      t += waits.get(i - 1) ?? 0;
      const frames = diagram.frames.filter((f) => f.startMessage === i);
      for (const f of frames) actions.push({ start: t, end: t + scale(200), step: steps.length, action: { kind: 'reveal', id: f.id } });
      const group = m.parGroup ? diagram.messages.map((x, k) => ({ x, k })).filter(({ x }) => x.parGroup === m.parGroup) : [{ x: m, k: i }];
      const branches = new Map<number, number[]>();
      for (const { x, k } of group) branches.set(x.parBranch ?? 0, [...(branches.get(x.parBranch ?? 0) ?? []), k]);
      let longest = 0;
      const stepIndex = steps.length;
      for (const ks of branches.values()) {
        let bt = t;
        for (const k of ks) {
          handled.add(k);
          const msg = diagram.messages[k];
          const dur = travel * (msg && msg.from === msg.to ? 0.8 : 1);
          actions.push({ start: bt, end: bt + dur, step: stepIndex, action: { kind: 'message', index: k } });
          bt += dur + scale(120);
          revealNotes(k, bt);
        }
        longest = Math.max(longest, bt - t);
      }
      steps.push({ start: t, end: t + longest, label: group.map(({ x }) => `${x.from} → ${x.to}${x.label ? `: ${x.label}` : ''}`).join(' · '), line: m.line });
      t += longest;
    });
    t += waits.get(diagram.messages.length - 1) ?? 0;
    return { scenario: diagram.scenarios[0]?.name ?? 'Sequence', duration: t, actions, steps, initialValues: [] };
  }

  const scenario = diagram.scenarios[scenarioIndex];
  if (!scenario) return { scenario: '', duration: 0, actions, steps, initialValues: diagram.kind === 'array' ? diagram.values : [] };

  // Array item identity: slot → item id. Values travel; cells stay put (I-007).
  const slots = diagram.kind === 'array' ? diagram.values.map((_, i) => i) : [];
  let nextItem = slots.length;

  const schedule = (step: Step, t: number, stepIndex: number): number => {
    const push = (dur: number, action: Action): number => {
      actions.push({ start: t, end: t + dur, step: stepIndex, action });
      return dur;
    };
    switch (step.kind) {
      case 'travel': {
        if (diagram.kind !== 'flow') return 0;
        const e = edgeFor(diagram, step.from, step.to);
        if (!e) return 0;
        push(travel, { kind: 'travel', edgeId: e.id, reverse: e.reverse, ...(step.label ? { label: step.label } : {}) });
        actions.push({ start: t + travel, end: t + travel + scale(BASE.pulse), step: stepIndex, action: { kind: 'pulse', node: step.to } });
        return travel;
      }
      case 'state':
        for (const node of step.nodes) actions.push({ start: t, end: t + scale(BASE.state), step: stepIndex, action: { kind: 'state', node, state: step.state } });
        return scale(BASE.state);
      case 'pulse':
        for (const node of step.nodes) actions.push({ start: t, end: t + scale(BASE.pulse), step: stepIndex, action: { kind: 'pulse', node } });
        return scale(BASE.pulse);
      case 'note':
        return push(scale(BASE.note), { kind: 'note', text: step.text, ...(step.target ? { target: step.target } : {}) });
      case 'caption':
        return push(scale(BASE.caption), { kind: 'caption', text: step.text });
      case 'wait':
        return scale(step.ms);
      case 'reset':
        return push(scale(BASE.reset), { kind: 'reset' });
      case 'parallel':
        return Math.max(0, ...step.steps.map((s) => schedule(s, t, stepIndex)));
      case 'compare':
        return push(scale(BASE.compare), { kind: 'compare', i: step.i, j: step.j });
      case 'swap': {
        const itemA = slots[step.i] ?? -1;
        const itemB = slots[step.j] ?? -1;
        if (itemA < 0 || itemB < 0) return 0;
        slots[step.i] = itemB;
        slots[step.j] = itemA;
        return push(scale(BASE.swap), { kind: 'swap', i: step.i, j: step.j, itemA, itemB });
      }
      case 'set': {
        const oldItem = slots[step.i] ?? -1;
        if (oldItem < 0) return 0;
        const newItem = nextItem++;
        slots[step.i] = newItem;
        return push(scale(BASE.set), { kind: 'set', i: step.i, value: step.value, oldItem, newItem });
      }
      case 'mark':
        return push(scale(BASE.mark), { kind: 'mark', indices: step.indices, state: step.state });
      case 'pointer':
        return push(scale(BASE.pointer), { kind: 'pointer', name: step.name, index: step.index });
    }
  };

  let t = 0;
  for (const step of scenario.steps) {
    const index = steps.length;
    const dur = schedule(step, t, index);
    steps.push({ start: t, end: t + dur, label: describe(step), line: step.line });
    t += dur;
  }
  return {
    scenario: scenario.name,
    duration: t,
    actions,
    steps,
    initialValues: diagram.kind === 'array' ? diagram.values : [],
  };
}

/** A positioned array value (identity preserved across swaps). */
export interface ArrayItem {
  id: number;
  value: CellValue;
  /** Fractional cell index (animates during swaps). */
  pos: number;
  /** 0..1 vertical lift while moving. */
  lift: number;
  opacity: number;
}

/** Everything the renderer needs to draw one instant. */
export interface Frame {
  time: number;
  /** Index of the step being played (or last completed). */
  stepIndex: number;
  nodeStates: Record<string, NodeState>;
  pulses: Record<string, number>;
  activeEdges: Record<string, number>;
  visitedEdges: Record<string, true>;
  tokens: Array<{ edgeId: string; progress: number; reverse: boolean; label?: string }>;
  notes: Array<{ target?: string; text: string; opacity: number }>;
  caption?: string;
  /** Sequence: message index → draw progress (0..1). Missing = not yet sent. */
  messages: Record<number, number>;
  revealed: Record<string, true>;
  array?: {
    items: ArrayItem[];
    marks: Record<number, NodeState>;
    compare: [number, number] | null;
    pointers: Record<string, number>;
  };
}

/** Smooth start and stop. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Computes the visual frame at time `t` (ms) by folding every action that
 * started at or before `t`. Stateless: scrubbing backwards is exact.
 */
export function frameAt(timeline: Timeline, t: number): Frame {
  const frame: Frame = {
    time: t,
    stepIndex: -1,
    nodeStates: {},
    pulses: {},
    activeEdges: {},
    visitedEdges: {},
    tokens: [],
    notes: [],
    messages: {},
    revealed: {},
  };
  const isArray = timeline.initialValues.length > 0;
  const items = new Map<number, ArrayItem>();
  const slotOf: number[] = [];
  if (isArray) {
    timeline.initialValues.forEach((value, i) => {
      items.set(i, { id: i, value, pos: i, lift: 0, opacity: 1 });
      slotOf.push(i);
    });
    frame.array = { items: [], marks: {}, compare: null, pointers: {} };
  }
  const notes = new Map<string, { target?: string; text: string; start: number }>();

  for (const a of timeline.actions) {
    // An action starting exactly at t belongs to the next step (except at 0),
    // so "end of step N" never shows the first effect of step N+1.
    if (a.start > t || (a.start === t && t > 0)) continue;
    const p = a.end > a.start ? clamp01((t - a.start) / (a.end - a.start)) : 1;
    const running = t < a.end;
    if (a.start < t) frame.stepIndex = Math.max(frame.stepIndex, a.step);
    const act = a.action;
    switch (act.kind) {
      case 'travel':
        if (running) {
          frame.tokens.push({ edgeId: act.edgeId, progress: easeInOut(p), reverse: act.reverse, ...(act.label ? { label: act.label } : {}) });
          frame.activeEdges[act.edgeId] = 1;
        } else {
          frame.visitedEdges[act.edgeId] = true;
        }
        break;
      case 'state':
        frame.nodeStates[act.node] = act.state;
        break;
      case 'pulse':
        if (running) frame.pulses[act.node] = Math.sin(p * Math.PI);
        break;
      case 'note':
        notes.set(act.target ?? '', { ...(act.target ? { target: act.target } : {}), text: act.text, start: a.start });
        break;
      case 'caption':
        frame.caption = act.text;
        break;
      case 'reset':
        frame.nodeStates = {};
        frame.visitedEdges = {};
        notes.clear();
        if (frame.array) {
          frame.array.marks = {};
          frame.array.pointers = {};
        }
        break;
      case 'message':
        frame.messages[act.index] = easeInOut(p);
        break;
      case 'reveal':
        frame.revealed[act.id] = true;
        break;
      case 'compare':
        if (frame.array && running) frame.array.compare = [act.i, act.j];
        break;
      case 'swap': {
        const A = items.get(act.itemA);
        const B = items.get(act.itemB);
        if (A && B) {
          const e = easeInOut(p);
          A.pos = act.i + (act.j - act.i) * e;
          B.pos = act.j + (act.i - act.j) * e;
          const lift = running ? Math.sin(p * Math.PI) : 0;
          A.lift = lift;
          B.lift = -lift;
          if (!running) {
            A.pos = act.j;
            B.pos = act.i;
          }
        }
        if (frame.array && running) frame.array.compare = [act.i, act.j];
        break;
      }
      case 'set': {
        const old = items.get(act.oldItem);
        if (old) old.opacity = running ? 1 - p : 0;
        items.set(act.newItem, { id: act.newItem, value: act.value, pos: act.i, lift: 0, opacity: running ? p : 1 });
        if (!running) items.delete(act.oldItem);
        break;
      }
      case 'mark':
        if (frame.array) for (const i of act.indices) {
          if (act.state === null) delete frame.array.marks[i];
          else frame.array.marks[i] = act.state;
        }
        break;
      case 'pointer':
        if (frame.array) {
          if (act.index === null) delete frame.array.pointers[act.name];
          else frame.array.pointers[act.name] = act.index;
        }
        break;
    }
  }
  for (const n of notes.values()) {
    frame.notes.push({ ...(n.target ? { target: n.target } : {}), text: n.text, opacity: clamp01((t - n.start) / 250) });
  }
  if (frame.array) frame.array.items = [...items.values()].filter((it) => it.opacity > 0).sort((a, b) => a.id - b.id);
  return frame;
}

/** The final frame of a timeline (useful for static renders). */
export function finalFrame(timeline: Timeline): Frame {
  return frameAt(timeline, timeline.duration + 1);
}
