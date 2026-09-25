import { createGraphStructure, createGraphRuntime } from '@vhyxui/visual-runtime';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------------------
// Structure — identical topology to Experiment 4 (demos/graph-traversal.ts):
// A->B, A->C, B->D, C->D, D->E. D is reachable via two paths (the same
// multi-path shape that originally stress-tested discover-once in v0.4).
// Structure carries only topology/identity (Section 10's schema — GraphNode
// is just {id}, no position). Positions below are a Presentation-only
// concern, authored by hand, never computed, never part of Structure.
// ---------------------------------------------------------------------------
const nodes = ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id }));
const edges = [
  { id: 'e-ab', from: 'A', to: 'B' },
  { id: 'e-ac', from: 'A', to: 'C' },
  { id: 'e-bd', from: 'B', to: 'D' },
  { id: 'e-cd', from: 'C', to: 'D' },
  { id: 'e-de', from: 'D', to: 'E' },
];
const structure = createGraphStructure(nodes, edges);

// Manually authored, fixed forever (H7-1: no layout computation, ever).
const NODE_POSITIONS = {
  A: { x: 200, y: 40 },
  B: { x: 100, y: 150 },
  C: { x: 300, y: 150 },
  D: { x: 200, y: 260 },
  E: { x: 200, y: 370 },
};

function edgesFrom(nodeId) {
  return edges.filter((e) => e.from === nodeId);
}

// ---------------------------------------------------------------------------
// Algorithm / Scenario Generators — run once against a throwaway runtime to
// decide event order, exactly like Experiment 6 and demos/graph-traversal.ts.
// The queue (BFS) / call stack (DFS) are producer-private (I-008): never
// pushed into Runtime state, only used to decide call order.
// ---------------------------------------------------------------------------
function generateBfsEvents() {
  const generatorRuntime = createGraphRuntime(structure);
  const visited = new Set(['A']);
  const queue = ['A'];
  generatorRuntime.discover('A');
  while (queue.length > 0) {
    const node = queue.shift();
    generatorRuntime.visit(node);
    for (const edge of edgesFrom(node)) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        generatorRuntime.traverseEdge(edge.id);
        generatorRuntime.discover(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return generatorRuntime.getHistory();
}

function generateDfsEvents() {
  const generatorRuntime = createGraphRuntime(structure);
  const visited = new Set();
  function visit(node) {
    visited.add(node);
    generatorRuntime.discover(node);
    generatorRuntime.visit(node);
    for (const edge of edgesFrom(node)) {
      if (!visited.has(edge.to)) {
        generatorRuntime.traverseEdge(edge.id);
        visit(edge.to);
      }
    }
  }
  visit('A');
  return generatorRuntime.getHistory();
}

const eventsByAlgo = {
  bfs: generateBfsEvents(),
  dfs: generateDfsEvents(),
};

// ---------------------------------------------------------------------------
// Display Runtime — one event at a time, driven only by cursor position.
// Identical harness pattern to Experiment 6: Step/Play/Reset never decide
// anything, they only replay pre-generated events against a real Runtime.
// ---------------------------------------------------------------------------
let activeAlgo = 'bfs';
let events = eventsByAlgo[activeAlgo];
let displayRuntime = createGraphRuntime(structure);
let cursor = 0;
let playTimer = null;

function dispatch(event) {
  switch (event.type) {
    case 'discover':
      displayRuntime.discover(event.node);
      break;
    case 'visit':
      displayRuntime.visit(event.node);
      break;
    case 'traverseEdge':
      displayRuntime.traverseEdge(event.edge);
      break;
    default:
      throw new Error(`Unhandled event type in graph playground dispatch: ${event.type}`);
  }
}

// ---------------------------------------------------------------------------
// render(structure, snapshot, transient) — testing H7-3. A second, separate
// renderer from Experiment 6's — it reads graph-native nodes/edges/runtime
// state directly, never sequence cells, never a shared render function.
// No branch here checks which algorithm (BFS vs DFS) produced the history;
// it only reads structure.nodes/edges, snapshot.nodes[id].discovered, and
// the single most-recent event as transient decoration.
// ---------------------------------------------------------------------------
function render(structure, snapshot, transient) {
  const svg = document.getElementById('graph-svg');
  for (const el of [...svg.querySelectorAll('.edge, .node, .node-label')]) {
    el.remove();
  }

  for (const edge of structure.edges) {
    const from = NODE_POSITIONS[edge.from];
    const to = NODE_POSITIONS[edge.to];
    const traversing = transient && transient.type === 'traverseEdge' && transient.edge === edge.id;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(from.x));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x));
    line.setAttribute('y2', String(to.y));
    line.setAttribute('class', traversing ? 'edge traversing' : 'edge');
    line.setAttribute('marker-end', traversing ? 'url(#arrow-active)' : 'url(#arrow)');
    svg.appendChild(line);
  }

  for (const node of structure.nodes) {
    const pos = NODE_POSITIONS[node.id];
    const nodeState = snapshot.nodes[node.id];
    const visiting = transient && transient.type === 'visit' && transient.node === node.id;

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(pos.x));
    circle.setAttribute('cy', String(pos.y));
    circle.setAttribute('r', '22');
    let cls = 'node';
    if (nodeState.discovered) cls += ' discovered';
    if (visiting) cls += ' visiting';
    circle.setAttribute('class', cls);
    svg.appendChild(circle);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String(pos.x));
    label.setAttribute('y', String(pos.y));
    label.setAttribute('class', 'node-label');
    label.textContent = node.id;
    svg.appendChild(label);
  }
}

function describeEvent(event) {
  switch (event.type) {
    case 'discover':
      return `discover(${event.node})`;
    case 'visit':
      return `visit(${event.node})`;
    case 'traverseEdge':
      return `traverseEdge(${event.edge})`;
    default:
      return event.type;
  }
}

function updateStatus() {
  const status = document.getElementById('status');
  const total = events.length;
  const label = activeAlgo.toUpperCase();
  if (cursor === 0) {
    status.textContent = `[${label}] Ready. ${total} events generated. Press Step or Play.`;
  } else if (cursor >= total) {
    status.textContent = `[${label}] Done — ${total}/${total} events applied. All reachable nodes discovered.`;
  } else {
    const lastEvent = events[cursor - 1];
    status.textContent = `[${label}] Event ${cursor}/${total}: ${describeEvent(lastEvent)}`;
  }
}

function applyNextEvent() {
  if (cursor >= events.length) {
    return false;
  }
  const event = events[cursor];
  dispatch(event);
  cursor++;
  render(structure, displayRuntime.getState(), event);
  updateStatus();
  return true;
}

function pause() {
  if (playTimer !== null) {
    clearInterval(playTimer);
    playTimer = null;
  }
  document.getElementById('btn-play').disabled = false;
  document.getElementById('btn-pause').disabled = true;
}

function play() {
  if (playTimer !== null) return;
  document.getElementById('btn-play').disabled = true;
  document.getElementById('btn-pause').disabled = false;
  playTimer = setInterval(() => {
    const more = applyNextEvent();
    if (!more || cursor >= events.length) {
      pause();
    }
  }, 500);
}

function reset() {
  pause();
  displayRuntime = createGraphRuntime(structure);
  cursor = 0;
  render(structure, displayRuntime.getState(), null);
  updateStatus();
}

function selectAlgorithm(name) {
  activeAlgo = name;
  events = eventsByAlgo[activeAlgo];
  reset();
}

document.getElementById('btn-step').addEventListener('click', () => {
  pause();
  applyNextEvent();
});
document.getElementById('btn-play').addEventListener('click', play);
document.getElementById('btn-pause').addEventListener('click', pause);
document.getElementById('btn-reset').addEventListener('click', reset);
document.getElementById('algo-bfs').addEventListener('change', () => selectAlgorithm('bfs'));
document.getElementById('algo-dfs').addEventListener('change', () => selectAlgorithm('dfs'));

// Initial paint: default state, no transient decoration.
render(structure, displayRuntime.getState(), null);
updateStatus();
