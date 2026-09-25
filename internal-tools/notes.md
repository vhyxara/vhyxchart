# VhyxChart — Notes

## Push status
Resolved 2026-09-25: GitHub App access was granted and branch `claude/bold-davinci-7ucvi0` is pushed to origin.

## Publishing (you run it — nothing was published)
1. Publish VhyxSeal rc.3 and VhyxUI first (their notes.md).
2. Remove `pnpm.overrides` entries pointing at `.tarballs/` and set real versions in `apps/*/package.json`.
3. ```bash
   pnpm install && pnpm build && pnpm test
   pnpm --filter @vhyxchart/core --filter @vhyxchart/react --filter @vhyxchart/cli publish --tag alpha --access public
   ```
4. VS Code Marketplace: create publisher `vhyxara`, then `cd packages/vscode && npx @vscode/vsce publish` (or `package` and upload the `.vsix`). Open VSX: `npx ovsx publish`.
5. CDN: after npm publish, `https://unpkg.com/@vhyxchart/core/dist/vhyxchart.global.js` works (docs already reference it).

## Try it locally without publishing
```bash
pnpm install && pnpm build
pnpm --filter @vhyxchart/playground dev          # http://localhost:3101
pnpm --filter @vhyxchart/docs dev                # http://localhost:3100
node packages/cli/dist/bin.js render my.vhyx     # → my.svg (animated)
pnpm --filter vhyxchart-vscode package && code --install-extension packages/vscode/vhyxchart-vscode-0.1.0.vsix
# in another project:
pnpm add /path/to/vhyxchart/packages/core        # or: pnpm pack in packages/core and install the .tgz
```

## Sibling libraries
`.tarballs/` holds VhyxUI and VhyxSeal packages; refresh with `./scripts/sync-siblings.sh` (expects `../vhyxUI` and `../vhyxseal`).

## Roadmap (v0.2 → v1)
- Editor: syntax highlighting overlay and autocomplete in the playground (reuse the TextMate grammar via a tiny tokenizer).
- Layout: orthogonal edge routing option; better cluster containment (nodes outside a group inside its box are possible on dense graphs).
- More diagram kinds: timeline/Gantt with a moving "now", git graph, ER, C4 (maps onto flow + groups).
- Scenario features: `loop N` inside scenarios, conditional branches the viewer chooses (interactive "what if"), sound-free captions track (WebVTT) for accessibility.
- Export: MP4/GIF via headless browser in the CLI (`vhyxchart render --video`).
- AI authoring: prompt → diagram + scenarios (the model is small and text-first, ideal for LLMs).
- Record real traces (OpenTelemetry spans → scenario) — "replay production requests".
