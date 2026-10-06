import { defineContract, generateManifest } from '@vhyxseal/core';

// Serves /__agent__/manifest.json (a folder starting with %5F becomes a URL segment starting with "_").
// Static: the docs site is exported, so the manifest is written as a file at build time.
export const dynamic = 'force-static';

const common = { requires: [], requiredPermissions: [], affects: [], reversible: true, requiresConfirmation: false, destructive: false, contractVersion: '1.0.0' } as const;

// What an AI agent can do on the VhyxChart docs. Nothing here changes data, so every action is low risk.
const CONTRACTS = [
  defineContract({ ...common, id: 'open-page', type: 'navigation', intent: 'navigate', description: 'Open a docs page: getting started, a diagram type, scenarios, styling or an integration', consequence: 'Navigates within the docs', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'play-diagram', type: 'action', intent: 'play-media', description: 'Play, pause, step or scrub an example diagram', consequence: 'Changes the diagram playback', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'switch-scenario', type: 'input', intent: 'apply-filter', description: 'Switch an example diagram to another scenario', consequence: 'Replays the diagram with that story', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'copy-code', type: 'action', intent: 'copy-text', description: 'Copy a code example or the install command', consequence: 'Clipboard changes', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'toggle-theme', type: 'action', intent: 'apply-filter', description: 'Switch between the dark and light theme', consequence: 'Changes colours on this device only', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'open-playground', type: 'navigation', intent: 'navigate', description: 'Open the VhyxChart playground to edit diagrams live', consequence: 'Navigates to play.vhyxchart.com', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'family-switch', type: 'navigation', intent: 'navigate', description: 'Switch to the VhyxUI or VhyxSeal documentation', consequence: 'Navigates to another docs site', safetyLevel: 'low' }),
];

export function GET(): Response {
  const manifest = generateManifest(CONTRACTS, {
    domain: 'docs.vhyxchart.com',
    domainVerified: false,
    verificationToken: '',
    agentPolicy: { allowedAgents: ['*'], allowedActions: ['*'] },
  });
  return Response.json(manifest, { headers: { 'Cache-Control': 'public, max-age=3600', 'X-VhyxSeal-Version': manifest.vhyxseal } });
}
