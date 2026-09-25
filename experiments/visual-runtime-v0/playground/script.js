import { createSequenceStructure, createSequenceRuntime } from '@vhyxui/visual-runtime';

// ---------------------------------------------------------------------------
// Structure + initial values — identical to demos/bubble-sort.ts.
// ---------------------------------------------------------------------------
const values = [5, 3, 8, 1, 9, 2];
const ids = values.map((_, i) => `c${i}`);
const structure = createSequenceStructure(ids.map((id, position) => ({ id, position })));
const initialValues = Object.fromEntries(ids.map((id, i) => [id, values[i]]));

// ---------------------------------------------------------------------------
// Algorithm / Scenario Generator: runs bubble sort ONCE against a throwaway
// runtime purely to decide the event sequence (compare/swap decisions depend
// on runtime state), then hands off the resulting flat event log. Per
// visual-runtime-architecture.md's own framing: "Algorithm / Scenario
// Generator --produces--> Event sequence --executed by--> Runtime." This
// generator runtime is producer-private — its instance is discarded; only
// its recorded history (an array of already-decided events) survives.
// ---------------------------------------------------------------------------
function generateBubbleSortEvents() {
  const generatorRuntime = createSequenceRuntime(structure, initialValues);
  const n = ids.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      const left = ids[j];
      const right = ids[j + 1];
      generatorRuntime.compare(left, right);
      const state = generatorRuntime.getState();
      if (state[left].value > state[right].value) {
        generatorRuntime.swap(left, right);
      }
    }
    generatorRuntime.commit(ids[n - 1 - i]);
  }
  generatorRuntime.commit(ids[0]);
  return generatorRuntime.getHistory();
}

const events = generateBubbleSortEvents();

// ---------------------------------------------------------------------------
// Display Runtime — the one actually driven by the UI, one event at a time.
// Step/Play/Reset never decide anything; they only advance a cursor through
// the pre-generated `events` array and replay each event's corresponding
// Runtime call. This is the literal "time lives in Runtime, Presentation is
// a stateless projection of runtime-at-time-T" decision from Section 6.
// ---------------------------------------------------------------------------
let displayRuntime = createSequenceRuntime(structure, initialValues);
let cursor = 0;
let playTimer = null;

function dispatch(event) {
  switch (event.type) {
    case 'compare':
      displayRuntime.compare(event.a, event.b);
      break;
    case 'swap':
      displayRuntime.swap(event.a, event.b);
      break;
    case 'commit':
      displayRuntime.commit(event.id);
      break;
    default:
      throw new Error(`Unhandled event type in playground dispatch: ${event.type}`);
  }
}

// ---------------------------------------------------------------------------
// render(structure, snapshot, transient) — testing H1. Reads only Structure
// (cell ids/positions), a Runtime snapshot (value/sorted per cell), and the
// single most-recently-applied event ("transient" decoration, per Section
// 6 — comparing/swapping are momentary, never persisted). No branch here
// ever checks an algorithm name, and nothing here is specific to Bubble
// Sort beyond the fact that `structure` happens to be a sequence — this
// same function would render any sequence Structure + snapshot correctly.
// ---------------------------------------------------------------------------
function render(structure, snapshot, transient) {
  const row = document.getElementById('row');
  row.innerHTML = '';
  for (const entity of structure.entities) {
    const cell = snapshot[entity.id];
    const div = document.createElement('div');
    div.className = 'cell';
    if (cell.sorted) {
      div.classList.add('sorted');
    } else if (transient && transient.type === 'compare' && (transient.a === entity.id || transient.b === entity.id)) {
      div.classList.add('comparing');
    } else if (transient && transient.type === 'swap' && (transient.a === entity.id || transient.b === entity.id)) {
      div.classList.add('swapping');
    }
    div.textContent = String(cell.value);
    row.appendChild(div);
  }
}

function describeEvent(event) {
  switch (event.type) {
    case 'compare':
      return `compare(${event.a}, ${event.b})`;
    case 'swap':
      return `swap(${event.a}, ${event.b})`;
    case 'commit':
      return `commit(${event.id})`;
    default:
      return event.type;
  }
}

function updateStatus() {
  const status = document.getElementById('status');
  const total = events.length;
  if (cursor === 0) {
    status.textContent = `Ready. ${total} events generated. Press Step or Play.`;
  } else if (cursor >= total) {
    const finalSnapshot = displayRuntime.getState();
    const finalValues = ids.map((id) => finalSnapshot[id].value);
    status.textContent = `Done — ${total}/${total} events applied.\nFinal values: [${finalValues.join(', ')}]`;
  } else {
    const lastEvent = events[cursor - 1];
    status.textContent = `Event ${cursor}/${total}: ${describeEvent(lastEvent)}`;
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
    // Check completion right after applying, not on the next tick — otherwise
    // the "Done" status lands one interval before the buttons re-enable.
    if (!more || cursor >= events.length) {
      pause();
    }
  }, 500);
}

function reset() {
  pause();
  displayRuntime = createSequenceRuntime(structure, initialValues);
  cursor = 0;
  render(structure, displayRuntime.getState(), null);
  updateStatus();
}

document.getElementById('btn-step').addEventListener('click', () => {
  pause();
  applyNextEvent();
});
document.getElementById('btn-play').addEventListener('click', play);
document.getElementById('btn-pause').addEventListener('click', pause);
document.getElementById('btn-reset').addEventListener('click', reset);

// Initial paint: default state, no transient decoration.
render(structure, displayRuntime.getState(), null);
updateStatus();
