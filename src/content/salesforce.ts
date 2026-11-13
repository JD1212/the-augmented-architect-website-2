export type SalesforceCapture = {
  id: string; title: string; description: string; capture: string;
  image: { src: string; alt: string; width: number; height: number } | null;
};
export const salesforceCaptures: readonly SalesforceCapture[] = [
  { id: 'explorer', title: 'Architecture Explorer', description: 'See triggers, native Flows, registered actions and their relationships in one object-focused workspace.', capture: 'Account selected, showing the thin framework trigger and the three Northstar demo actions.', image: null },
  { id: 'registrations', title: 'Registration Manager', description: 'Review implementation identity, lifecycle state and explicit ordering for registered actions.', capture: 'Account / BEFORE_UPDATE with actions ordered 100, 200 and 300, and their real activation states visible.', image: null },
  { id: 'flow', title: 'Flow inspection', description: 'Understand native record-triggered Flows separately from compatible framework Flows.', capture: 'Demo Opportunity Discount Review inspector showing its decisions and metadata.', image: null },
  { id: 'dependencies', title: 'Dependencies & source', description: 'Follow a selected implementation into related source and bounded dependencies.', capture: 'DemoAccountNormalizeHandler inspector showing DemoAccountPolicyService and related test context.', image: null },
  { id: 'vscode', title: 'Develop with context', description: 'Take the selected implementation and supporting context into a dedicated VS Code workspace.', capture: 'Actual handoff workspace showing source, related tests, AUGARCH_CONTEXT.md and AGENTS.md; no tokens or credentials.', image: null },
];
export const salesforceProblems = [
  ['Triggers that do everything', 'Pricing, routing, approvals and data quality become tangled in one class. A small change demands a large investigation.'],
  ['Flows without a clear map', 'Native Flows accumulate alongside Apex. It becomes difficult to understand which automation owns a business outcome.'],
  ['Dependencies hidden in the details', 'Related services, metadata and tests are easy to miss when a team inherits an unfamiliar org.'],
  ['Changes that feel risky', 'Unclear execution boundaries and undocumented behavior make maintenance harder than it needs to be.'],
] as const;

