import * as vscode from 'vscode';
import { parse, renderAnimatedSvg } from '@vhyxchart/core';
import { vhyxMarkdownIt, documentDiagnostics, type FenceOptions, type MarkdownItLike } from './pure.js';

function options(): FenceOptions {
  const c = vscode.workspace.getConfiguration('vhyxchart');
  const theme = c.get<string>('theme', 'auto');
  return {
    mermaid: c.get<boolean>('renderMermaidFences', false),
    theme: theme === 'light' || theme === 'dark' ? theme : 'auto',
    autoplay: c.get<boolean>('autoplay', true),
  };
}

function nonce(): string {
  let out = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

class PreviewPanel {
  static readonly panels = new Map<string, PreviewPanel>();

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly document: vscode.TextDocument,
    extensionUri: vscode.Uri,
  ) {
    const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'vhyxchart.global.js'));
    const n = nonce();
    const theme = options().theme;
    panel.webview.html = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${n}' ${panel.webview.cspSource};">
<style>body{padding:16px;color:var(--vscode-foreground);font-family:var(--vscode-font-family)}</style>
</head><body><div id="root"></div>
<script nonce="${n}" src="${script}"></script>
<script nonce="${n}">
const vscodeApi = acquireVsCodeApi();
const dark = document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast');
const theme = ${JSON.stringify(theme)} === 'auto' ? (dark ? 'dark' : 'light') : ${JSON.stringify(theme)};
let player = null;
window.addEventListener('message', (e) => {
  if (e.data.type !== 'source') return;
  if (player) player.setSource(e.data.source);
  else player = VhyxChart.createPlayer(document.getElementById('root'), e.data.source, { theme });
});
vscodeApi.postMessage({ type: 'ready' });
</script></body></html>`;
    panel.webview.onDidReceiveMessage((m: { type: string }) => {
      if (m.type === 'ready') this.update();
    });
    panel.onDidDispose(() => PreviewPanel.panels.delete(document.uri.toString()));
  }

  static show(document: vscode.TextDocument, extensionUri: vscode.Uri): void {
    const key = document.uri.toString();
    const existing = PreviewPanel.panels.get(key);
    if (existing) {
      existing.panel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }
    const panel = vscode.window.createWebviewPanel('vhyxchart.preview', `▶ ${document.fileName.split(/[\\/]/).pop() ?? 'Diagram'}`, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
      retainContextWhenHidden: true,
    });
    PreviewPanel.panels.set(key, new PreviewPanel(panel, document, extensionUri));
  }

  update(): void {
    void this.panel.webview.postMessage({ type: 'source', source: this.document.getText() });
  }
}

/** Activation: diagnostics, preview panels, commands, and the markdown-it plugin. */
export function activate(context: vscode.ExtensionContext): { extendMarkdownIt: (md: MarkdownItLike) => MarkdownItLike } {
  const collection = vscode.languages.createDiagnosticCollection('vhyxchart');
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const lint = (doc: vscode.TextDocument): void => {
    if (doc.languageId !== 'vhyx' && doc.languageId !== 'markdown') return;
    const items = documentDiagnostics(doc.getText(), doc.languageId === 'markdown').map((d) => {
      const line = Math.min(d.line, Math.max(0, doc.lineCount - 1));
      const range = doc.lineAt(line).range;
      const diag = new vscode.Diagnostic(range, d.message, d.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
      diag.source = 'vhyxchart';
      diag.code = d.code;
      return diag;
    });
    collection.set(doc.uri, items);
  };

  const schedule = (doc: vscode.TextDocument): void => {
    const key = doc.uri.toString();
    clearTimeout(timers.get(key));
    timers.set(
      key,
      setTimeout(() => {
        lint(doc);
        PreviewPanel.panels.get(key)?.update();
      }, 150),
    );
  };

  const exportAs = async (kind: 'svg' | 'html'): Promise<void> => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const text = editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection);
    const base = editor.document.uri.with({ path: editor.document.uri.path.replace(/\.[^./]+$/, '') + `.${kind}` });
    const target = await vscode.window.showSaveDialog({ defaultUri: base, filters: kind === 'svg' ? { SVG: ['svg'] } : { HTML: ['html'] } });
    if (!target) return;
    const { diagram } = parse(text);
    let content: string;
    if (kind === 'svg') {
      content = renderAnimatedSvg(diagram, { theme: options().theme });
    } else {
      const bundle = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'dist', 'vhyxchart.global.js'));
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      content = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${(diagram.config.title ?? 'Diagram').replace(/</g, '&lt;')}</title></head><body style="padding:24px"><vhyx-chart theme="${options().theme}">${escaped}</vhyx-chart><script>${new TextDecoder().decode(bundle)}</script></body></html>`;
    }
    await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(content));
    void vscode.window.showInformationMessage(`VhyxChart: exported ${target.fsPath}`);
  };

  context.subscriptions.push(
    collection,
    vscode.workspace.onDidOpenTextDocument(lint),
    vscode.workspace.onDidChangeTextDocument((e) => schedule(e.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)),
    vscode.commands.registerCommand('vhyxchart.openPreview', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (doc) PreviewPanel.show(doc, context.extensionUri);
    }),
    vscode.commands.registerCommand('vhyxchart.exportSvg', () => exportAs('svg')),
    vscode.commands.registerCommand('vhyxchart.exportHtml', () => exportAs('html')),
  );
  vscode.workspace.textDocuments.forEach(lint);

  return { extendMarkdownIt: (md: MarkdownItLike) => vhyxMarkdownIt(md, options) };
}

export function deactivate(): void {}
