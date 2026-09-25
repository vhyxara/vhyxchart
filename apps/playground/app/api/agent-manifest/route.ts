import { NextResponse } from 'next/server';
import { defineContract, generateManifest } from '@vhyxseal/core';

const common = { requires: [], requiredPermissions: [], affects: [], reversible: true, requiresConfirmation: false, destructive: false, contractVersion: '1.0.0' } as const;

// Contracts for what an AI agent can do in the playground.
const CONTRACTS = [
  defineContract({ ...common, id: 'example-picker', type: 'input', intent: 'apply-filter', description: 'Load one of the curated example diagrams', consequence: 'Replaces the editor content', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'diagram-editor', type: 'input', intent: 'edit-diagram', description: 'VhyxChart source text for the live preview', consequence: 'Re-renders the diagram', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'export-svg', type: 'action', intent: 'download-file', description: 'Download the diagram as an animated SVG', consequence: 'Browser downloads a file', safetyLevel: 'low' }),
  defineContract({ ...common, id: 'share-link', type: 'action', intent: 'share-item', description: 'Copy a link that encodes the diagram', consequence: 'Clipboard changes', safetyLevel: 'medium' }),
];

export function GET(request: Request): NextResponse {
  const domain = new URL(request.url).hostname || 'localhost';
  const manifest = generateManifest(CONTRACTS, {
    domain,
    domainVerified: false,
    verificationToken: '',
    agentPolicy: { allowedAgents: ['*'], allowedActions: ['*'] },
  });
  return NextResponse.json(manifest, { headers: { 'Cache-Control': 'public, max-age=3600', 'X-VhyxSeal-Version': manifest.vhyxseal } });
}
