import { ChartErrorCode } from '../errors.js';
import type {
  DiagramConfig,
  Participant,
  Scenario,
  SequenceDiagram,
  SequenceFrame,
  SequenceMessage,
  SequenceNote,
  Step,
} from '../model.js';
import { Diagnostics, normaliseLabel, parseDuration, unquote, type SourceLine } from './common.js';

const HEADER = /^(sequenceDiagram|sequence)\b\s*(.*)$/i;

/** Returns true for lines that start a sequence diagram. */
export function isSequenceHeader(text: string): boolean {
  return HEADER.test(text);
}

// Longest operators first so `-->>` is not read as `-->`.
const ARROWS: ReadonlyArray<{ op: string; stroke: 'solid' | 'dotted'; head: SequenceMessage['head'] }> = [
  { op: '-->>', stroke: 'dotted', head: 'arrow' },
  { op: '->>', stroke: 'solid', head: 'arrow' },
  { op: '--x', stroke: 'dotted', head: 'cross' },
  { op: '-x', stroke: 'solid', head: 'cross' },
  { op: '--)', stroke: 'dotted', head: 'async' },
  { op: '-)', stroke: 'solid', head: 'async' },
  { op: '-->', stroke: 'dotted', head: 'open' },
  { op: '->', stroke: 'solid', head: 'open' },
];

interface OpenFrame {
  frame: SequenceFrame;
  parBranch: number;
}

/**
 * Parses a sequence diagram (Mermaid `sequenceDiagram` compatible subset):
 * participants/actors, all arrow types, activations (`+`/`-`), notes,
 * loop/alt/else/opt/par/and/critical/break/rect frames, autonumber.
 * Messages animate in order; `par` branches play concurrently.
 */
export function parseSequence(lines: readonly SourceLine[], config: DiagramConfig, diags: Diagnostics): SequenceDiagram {
  const participants = new Map<string, Participant>();
  const messages: SequenceMessage[] = [];
  const notes: SequenceNote[] = [];
  const frames: SequenceFrame[] = [];
  const open: OpenFrame[] = [];
  const waits: Array<{ after: number; ms: number }> = [];
  let autonumber = false;
  let i = 0;

  const header = lines[0] ? HEADER.exec(lines[0].text) : null;
  if (header) {
    const t = (header[2] ?? '').trim();
    if (t && !config.title) config.title = unquote(t);
    i = 1;
  }

  const ensure = (id: string, line: number): string => {
    const clean = id.trim();
    if (!participants.has(clean)) participants.set(clean, { id: clean, label: clean, kind: 'participant', line });
    return clean;
  };

  for (; i < lines.length; i++) {
    const { text, line } = lines[i] as SourceLine;
    const lower = text.toLowerCase();

    if (lower === 'autonumber') {
      autonumber = true;
      continue;
    }
    const title = /^title\s*:?\s*(.+)$/i.exec(text);
    if (title) {
      if (!config.title) config.title = unquote(title[1] ?? '');
      continue;
    }
    const part = /^(participant|actor|database|queue)\s+(.+?)(?:\s+as\s+(.+))?$/i.exec(text);
    if (part) {
      const kind = (part[1] ?? 'participant').toLowerCase() as Participant['kind'];
      const id = unquote(part[2] ?? '');
      const label = part[3] ? normaliseLabel(part[3]) : id;
      const existing = participants.get(id);
      if (existing) {
        existing.label = label;
        existing.kind = kind;
      } else {
        participants.set(id, { id, label, kind, line });
      }
      continue;
    }
    const act = /^(activate|deactivate)\s+(.+)$/i.exec(text);
    if (act) {
      // Explicit activation lines attach to the latest message.
      const last = messages[messages.length - 1];
      const who = ensure(act[2] ?? '', line);
      if (last && (act[1] ?? '').toLowerCase() === 'activate' && last.to === who) last.activate = 'target';
      if (last && (act[1] ?? '').toLowerCase() === 'deactivate' && last.from === who) last.activate = 'source-end';
      continue;
    }
    const wait = /^(?:wait|pause|delay)\s+(.+)$/i.exec(text);
    if (wait) {
      const ms = parseDuration(wait[1] ?? '');
      if (ms !== null) waits.push({ after: messages.length - 1, ms });
      else diags.error(ChartErrorCode.BAD_VALUE, line, `Cannot read duration "${wait[1]}"`);
      continue;
    }
    const note = /^note\s+(left of|right of|over)\s+([^:]+):\s*(.*)$/i.exec(text);
    if (note) {
      const pos = (note[1] ?? '').toLowerCase();
      const ids = (note[2] ?? '').split(',').map((p) => ensure(p, line));
      notes.push({
        id: `note${notes.length}`,
        position: pos.startsWith('left') ? 'left' : pos.startsWith('right') ? 'right' : 'over',
        participants: ids,
        text: normaliseLabel(note[3] ?? ''),
        after: messages.length - 1,
        line,
      });
      continue;
    }
    const frameStart = /^(loop|alt|opt|par|rect|critical|break)\b\s*(.*)$/i.exec(text);
    if (frameStart) {
      const kind = (frameStart[1] ?? 'loop').toLowerCase() as SequenceFrame['kind'];
      const label = normaliseLabel(frameStart[2] ?? '');
      const frame: SequenceFrame = {
        id: `frame${frames.length}`,
        kind,
        label: kind === 'rect' ? '' : label,
        sections: [{ label: kind === 'rect' ? '' : label, startMessage: messages.length }],
        startMessage: messages.length,
        endMessage: messages.length - 1,
        depth: open.length,
        line,
      };
      frames.push(frame);
      open.push({ frame, parBranch: 0 });
      continue;
    }
    const section = /^(else|and|option)\b\s*(.*)$/i.exec(text);
    if (section) {
      const top = open[open.length - 1];
      if (!top) {
        diags.error(ChartErrorCode.UNEXPECTED_END, line, `"${section[1]}" outside alt/par`);
        continue;
      }
      top.frame.sections.push({ label: normaliseLabel(section[2] ?? ''), startMessage: messages.length });
      top.parBranch++;
      continue;
    }
    if (lower === 'end') {
      const top = open.pop();
      if (!top) diags.warn(ChartErrorCode.UNEXPECTED_END, line, '"end" without a matching block');
      else top.frame.endMessage = messages.length - 1;
      continue;
    }

    const arrow = ARROWS.map((a) => ({ a, idx: text.indexOf(a.op) })).filter((x) => x.idx > 0).sort((x, y) => x.idx - y.idx || y.a.op.length - x.a.op.length)[0];
    if (arrow) {
      const from = text.slice(0, arrow.idx).trim();
      let rest = text.slice(arrow.idx + arrow.a.op.length);
      let activate: SequenceMessage['activate'];
      if (rest.startsWith('+')) {
        activate = 'target';
        rest = rest.slice(1);
      } else if (rest.startsWith('-')) {
        activate = 'source-end';
        rest = rest.slice(1);
      }
      const colon = rest.indexOf(':');
      const to = (colon >= 0 ? rest.slice(0, colon) : rest).trim();
      const label = colon >= 0 ? normaliseLabel(rest.slice(colon + 1)) : '';
      if (!from || !to) {
        diags.error(ChartErrorCode.UNKNOWN_STATEMENT, line, `Cannot read message "${text}"`, 'Example: Alice->>Bob: Hello');
        continue;
      }
      const par = [...open].reverse().find((o) => o.frame.kind === 'par');
      messages.push({
        id: `m${messages.length}`,
        from: ensure(from, line),
        to: ensure(to, line),
        label,
        stroke: arrow.a.stroke,
        head: arrow.a.head,
        line,
        ...(activate ? { activate } : {}),
        ...(par ? { parGroup: par.frame.id, parBranch: par.parBranch } : {}),
      });
      continue;
    }
    diags.error(ChartErrorCode.UNKNOWN_STATEMENT, line, `Cannot read "${text}"`, 'Examples: participant A as Alice · A->>B: request · Note over A,B: text · loop every 5s … end');
  }

  for (const o of open) {
    diags.error(ChartErrorCode.UNCLOSED_BLOCK, o.frame.line, `"${o.frame.kind}" block is missing "end"`);
    o.frame.endMessage = messages.length - 1;
  }

  // The default scenario is the message order itself.
  // `line` on a wait step holds the message index it follows (-1 = before the first).
  const waitSteps: Step[] = waits.map((w) => ({ kind: 'wait', ms: w.ms, line: w.after }));
  const scenarios: Scenario[] = [{ name: 'Sequence', steps: waitSteps, line: 1 }];

  return { kind: 'sequence', participants: [...participants.values()], messages, notes, frames, autonumber, scenarios, config };
}
