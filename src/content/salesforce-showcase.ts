export type CaptureAsset = { src: string; width: number; height: number; alt: string };
export type ProductViewId = 'explorer' | 'registrations' | 'flow' | 'dependencies' | 'vscode';
export type SurfaceId = 'explorer' | 'sequence' | 'context' | 'flow' | 'source' | 'dependencies' | 'vscode' | 'target' | 'order' | 'template' | 'verified' | 'compatibility' | 'register' | 'result';
export type ProductVariant = { id: SurfaceId; title: string; asset: number };
export type ProductView = { id: ProductViewId; title: string; description: string; limitation?: string; variants: readonly ProductVariant[] };
export type TriggerAction = { name: string; implementation: string; developerName: string; order: number; type: 'APEX' | 'FLOW'; operation: 'BEFORE_UPDATE' | 'AFTER_INSERT' };
export const actions: readonly TriggerAction[] = [
  { name: 'Demo Account Normalize', implementation: 'DemoAccountNormalizeHandler', developerName: 'Demo_Account_Normalize', order: 100, type: 'APEX', operation: 'BEFORE_UPDATE' },
  { name: 'Demo Account Route', implementation: 'DemoAccountRoutingHandler', developerName: 'Demo_Account_Route', order: 200, type: 'APEX', operation: 'BEFORE_UPDATE' },
  { name: 'Demo Account Review', implementation: 'Demo_Account_Prepare_Review', developerName: 'Demo_Account_Review', order: 300, type: 'FLOW', operation: 'BEFORE_UPDATE' },
];
export const createdAction: TriggerAction = { name: 'My Account Handler AFTER INSERT', implementation: 'My_Account_Handler', developerName: 'My_Account_Handler_AFTER_INSERT', order: 100, type: 'APEX', operation: 'AFTER_INSERT' };
export const productViews: readonly ProductView[] = [
  { id: 'explorer', title: 'Architecture Explorer', description: 'The captured Account architecture: one inactive Apex trigger, no matching record-triggered Flows, and three inactive registered Trigger Actions.', variants: [{ id: 'explorer', title: 'Account architecture', asset: 1 }] },
  { id: 'registrations', title: 'Registration Manager', description: 'Follow the actual 100 / 200 / 300 execution sequence, then switch to the captured implementation grouping. All three registrations are inactive.', variants: [{ id: 'sequence', title: 'Execution Sequence', asset: 2 }, { id: 'context', title: 'Context Handlers', asset: 6 }] },
  { id: 'flow', title: 'Flow Discovery', description: 'Opportunity architecture with Demo Opportunity Discount Review and DemoLegacyOpportunityTrigger. Both are inactive in this scratch-org capture.', limitation: 'This is the captured Flow discovery overview. A detailed Flow Inspector has not been supplied; no decision graph is inferred.', variants: [{ id: 'flow', title: 'Opportunity architecture', asset: 3 }] },
  { id: 'dependencies', title: 'Dependencies & Source', description: 'Inspect the visible DemoLegacyOpportunityTrigger source excerpt and the actual captured dependency tree, including the confirmed DemoLegacySalesPolicyService relationship.', variants: [{ id: 'source', title: 'Source', asset: 4 }, { id: 'dependencies', title: 'Dependencies', asset: 5 }] },
  { id: 'vscode', title: 'Develop with Context', description: 'The captured DemoAccountTrigger inspector includes Open in VS Code. The optional Vibes extension can hand a selected working set to a dedicated desktop workspace.', limitation: 'The desktop workspace capture is still pending. The handoff can include related source, tests, AUGARCH_CONTEXT.md and AGENTS.md; local Salesforce CLI authentication and appropriate package permissions are required. No automatic deployment is claimed.', variants: [{ id: 'vscode', title: 'Captured inspector action', asset: 7 }] },
];
export const walkthroughSteps = [
  { title: 'Choose object and trigger operation', description: 'The demonstration targets Account and AFTER_INSERT. This is a different event from the three existing BEFORE_UPDATE registrations.', variants: [{ id: 'target', title: 'Automation target', asset: 8 }] },
  { title: 'Set execution order', description: 'Execution Order is 100. The captured wizard reports no existing Trigger Actions for this object and operation.', variants: [{ id: 'order', title: 'Execution order', asset: 9 }] },
  { title: 'Create and verify the handler', description: 'The captures show My_Account_Handler and its companion test template, followed by a successful handler-bundle creation and capability verification in the scratch org.', note: 'The template capture contains earlier guidance directing deployment through DX, CLI or Tooling API. The later capture records successful creation in this demonstration. Direct creation depends on environment and authorization; the website does not create or deploy classes.', variants: [{ id: 'template', title: 'Handler template', asset: 10 }, { id: 'verified', title: 'Created & verified', asset: 11 }] },
  { title: 'Validate compatibility', description: 'The captured review validates the object, operation, implementation and object compatibility, and checks for a duplicate registration.', variants: [{ id: 'compatibility', title: 'Compatibility review', asset: 12 }] },
  { title: 'Register an inactive Trigger Action', description: 'Review the Custom Metadata registration, then inspect the captured result: a fourth inactive action for Account / AFTER_INSERT, at order 100. Registration and capability checks do not prove handler execution or business outcomes.', variants: [{ id: 'register', title: 'Registration review', asset: 13 }, { id: 'result', title: 'Captured result', asset: 14 }] },
] satisfies readonly { title: string; description: string; note?: string; variants: readonly ProductVariant[] }[];
export const showcaseCopy = {
  title: 'Explore the working product',
  description: 'Actual application captures from a fictional Salesforce scratch org, with readable reconstructions of reduced-scale interfaces. This website is an interactive walkthrough, not a connection to the org.',
  reconstruction: 'Interface reconstruction based on an actual application capture.',
  actual: 'Actual application capture — application-only crop.',
  readOnly: 'Captured controls are shown for context. They do not perform Salesforce operations here.',
  scrollHint: 'Scroll within the product view to inspect. Complex views retain readable text on mobile.',
  expand: 'Expand product view', actualCapture: 'View actual capture', close: 'Close expanded view', fit: 'Fit image', actualSize: 'Actual size',
  walkthroughEyebrow: 'CREATE TRIGGER ACTION · GUIDED WALKTHROUGH', walkthroughTitle: 'From target to inactive registration.',
  walkthroughDescription: 'A five-step journey through the working product using the supplied scratch-org captures. Moving through these steps only changes the presentation; no org operations run.',
  previous: 'Previous', next: 'Next', step: 'Step', of: 'of',
  sourceNote: 'Visible source excerpt transcribed from the capture. The remaining trigger source is outside the supplied viewport.',
  verificationNote: 'The org-specific ApexClass identifier has been omitted. Only the captured readiness checks are shown.',
};
export const accountSource = `trigger DemoAccountTrigger on Account (before update) {
    AugArch.TriggerDispatcher.dispatch();
}`;
export const opportunitySource = `trigger DemoLegacyOpportunityTrigger on Opportunity (before insert, before update) {
    // Deliberately centralized legacy responsibilities for architecture inspection.
    // Each block touches only this record's synthetic fields and performs no DML.
    for (Opportunity record : Trigger.new) {
        if (record.Demo_Enabled__c != true) {
            continue;
        }

        // Pricing responsibility: compute an illustrative discounted value.
        // Discount is clamped by the policy service, without changing Amount.
        Decimal amount = record.Amount == null ? 0 : record.Amount;
        Decimal discount = record.Demo_Discount_Percent__c == null
            ? 0 : record.Demo_Discount_Percent__c;
        record.Demo_Net_Value__c =
            DemoLegacySalesPolicyService.netValue(amount, discount);

        // Approval responsibility: classify discount and deal value.
        if (discount > 20) {
            record.Demo_Approval__c = 'Finance Review';
        } else if (amount >= 100000) {
            record.Demo_Approval__c = 'Sales Director Review';`;
export const readinessChecks = ['Class exists', 'Implements ITriggerHandler', 'Capability declared', 'Supports selected object'] as const;
export const compatibilityChecks = ['Object exists', 'Operation valid', 'Handler exists', 'Implements ITriggerHandler', 'Object compatibility satisfied', 'No duplicate registration'] as const;

export const captureAssets: Readonly<Record<number, CaptureAsset>> = {
  1: {"src": "/images/salesforce-showcase/01-architecture-explorer.png", "width": 2046, "height": 884, "alt": "Account architecture with DemoAccountTrigger and three inactive actions"},
  2: {"src": "/images/salesforce-showcase/02-registration-manager.png", "width": 1986, "height": 614, "alt": "Account execution sequence at orders 100, 200 and 300 with inactive registrations"},
  3: {"src": "/images/salesforce-showcase/03-native-flow-discovery.png", "width": 1988, "height": 735, "alt": "Opportunity discovery with an inactive native Flow and legacy trigger"},
  4: {"src": "/images/salesforce-showcase/04-apex-source-inspector.png", "width": 1954, "height": 870, "alt": "DemoLegacyOpportunityTrigger source inspector, visible excerpt"},
  5: {"src": "/images/salesforce-showcase/05-apex-dependencies.png", "width": 1234, "height": 1375, "alt": "Actual captured dependency tree for DemoLegacyOpportunityTrigger"},
  6: {"src": "/images/salesforce-showcase/06-context-handler-grouping.png", "width": 1987, "height": 688, "alt": "Account Context Handlers with inactive implementation groups"},
  7: {"src": "/images/salesforce-showcase/07-open-in-vscode-button.png", "width": 1990, "height": 509, "alt": "DemoAccountTrigger source and the Open in VS Code action"},
  8: {"src": "/images/salesforce-showcase/08-wizard-target.png", "width": 1950, "height": 620, "alt": "Create Trigger Action target: Account and AFTER_INSERT"},
  9: {"src": "/images/salesforce-showcase/09-wizard-execution-order.png", "width": 1928, "height": 513, "alt": "Execution Order 100 and no existing actions for this event"},
  10: {"src": "/images/salesforce-showcase/10-wizard-create-handler.png", "width": 1954, "height": 846, "alt": "Handler template with My_Account_Handler and companion test artifacts"},
  11: {"src": "/images/salesforce-showcase/11-wizard-handler-verified.png", "width": 1840, "height": 298, "alt": "Captured readiness checks after handler creation; org-specific identifier excluded"},
  12: {"src": "/images/salesforce-showcase/12-wizard-compatibility.png", "width": 1878, "height": 369, "alt": "Compatibility review with six passing checks"},
  13: {"src": "/images/salesforce-showcase/13-wizard-register.png", "width": 1935, "height": 580, "alt": "Inactive registration review for My_Account_Handler_AFTER_INSERT"},
  14: {"src": "/images/salesforce-showcase/14-registration-success.png", "width": 2046, "height": 1082, "alt": "Captured fourth inactive Account action, under AFTER_INSERT at order 100"},
};

export type MarketingCapture = { title: string; description: string; asset: CaptureAsset };

export const realSalesforceShowcase = {
  enlarge: 'Enlarge screenshot',
  actual: 'Actual product capture from a fictional scratch org. Captured controls are not interactive on this website.',
  workflowLabel: 'A PRACTICAL DEVELOPMENT WORKFLOW',
  workflow: ['Discover', 'Inspect', 'Open in VS Code', 'Develop with AI assistance', 'Review and validate'],
  discoveryTitle: 'Less time hunting through automation. More time improving it.',
  discoveryDescription: 'Use Salesforce metadata and Tooling API capabilities to explore available Apex triggers, record-triggered Flows, and related metadata for a selected object. Inspect confirmed relationships where supported before planning a change.',
  fieldsLabel: 'Inspect referenced fields',
  registrationsLabel: 'See the Registration Manager example',
  captureBoundary: 'These are fictional scratch-org examples. The new Account Explorer shows four registered actions; the earlier Registration Manager example shows three inactive actions at orders 100, 200, and 300. The Explorer reports no matching record-triggered Flows. Inactive registrations do not demonstrate executed automation, and dependency inspection is not exhaustive.',
  workspaceTitle: 'From Salesforce trigger to AI-ready workspace.',
  workspaceDescription: 'Open relevant available source and metadata in a focused VS Code workspace. Generated AUGARCH_CONTEXT.md, AGENTS.md, and related guidance give your preferred AI coding assistant a clearer starting point for investigation, refactoring, code and test development.',
  workspaceBoundary: 'The captures show retrieved files, a manifest, and a generated context snapshot—not completed AI debugging or successful deployment. Developers still review changes, run tests, obtain authorization, and deploy through a controlled process.',
  overview: {
    title: 'Architecture Command Center',
    description: 'A starting point for object-level discovery, dependency inspection, and supported Trigger Action registration workflows.',
    asset: { src: '/images/salesforce-showcase-2/command-center-overview.png', width: 2035, height: 520, alt: 'Architecture Command Center home with Architecture Explorer, Registration Manager, Automation Portfolio and Audit Center entry points' },
  },
  explorer: {
    title: 'Discover object-level automation',
    description: 'Account architecture with one inactive Apex trigger, no matching record-triggered Flows, and four registered Trigger Actions. The action list continues beyond the captured viewport.',
    asset: { src: '/images/salesforce-showcase-2/architecture-explorer.png', width: 2048, height: 886, alt: 'Account Architecture Explorer with object, phase, operation and status filters, one inactive trigger, zero matching Flows and four Trigger Actions' },
  },
  dependencies: {
    title: 'Inspect confirmed relationships',
    description: 'The Opportunity trigger inspector identifies DemoLegacySalesPolicyService, the Opportunity object, and supported referenced fields.',
    asset: { src: '/images/salesforce-showcase-2/trigger-dependencies.png', width: 1190, height: 1468, alt: 'Inactive Opportunity trigger dependency inspector showing before-insert and before-update contexts and confirmed Apex service, object and field relationships' },
  },
  fields: {
    title: 'Referenced field detail',
    description: 'A closer look at the six referenced Opportunity fields in this captured dependency tree.',
    asset: { src: '/images/salesforce-showcase-2/metadata-field-dependencies.png', width: 872, height: 1364, alt: 'Confirmed relationships to the Opportunity service class, object and six demo custom fields' },
  },
  registrations: {
    title: 'Maintain independent Trigger Actions',
    description: 'The earlier Registration Manager capture shows three inactive BEFORE_UPDATE actions at configured orders 100, 200, and 300. Custom Metadata records define supported registrations, order, and active state.',
    asset: captureAssets[2],
  },
  open: {
    title: 'Open in VS Code',
    description: 'Use the captured inspector action to hand the selected context to the optional local extension.',
    asset: { src: '/images/salesforce-showcase-2/open-in-vscode-action.png', width: 746, height: 117, alt: 'Actual inspector footer with Close and Open in VS Code buttons' },
  },
  source: {
    title: 'Retrieve a focused working set',
    description: 'The workspace includes the Opportunity trigger, its supporting Apex service, a retrieval manifest, and development guidance. The editor shown here contains package.xml.',
    asset: { src: '/images/salesforce-showcase-2/vscode-source-files.png', width: 1973, height: 1025, alt: 'VS Code Explorer with retrieved Opportunity trigger and Apex service files, AGENTS.md, AUGARCH_CONTEXT.md and an open package.xml manifest' },
  },
  context: {
    title: 'Give AI assistants architecture context',
    description: 'AUGARCH_CONTEXT.md records the selected trigger, metadata context, and retrieved working set. It is a timestamped snapshot; org identity details have been redacted.',
    asset: { src: '/images/salesforce-showcase-2/vscode-ai-context.png', width: 1770, height: 1390, alt: 'Generated AUGARCH_CONTEXT.md in VS Code showing its snapshot caveat, trigger context and supporting source paths, with org identity rows redacted' },
  },
} as const satisfies {
  enlarge: string; actual: string; workflowLabel: string; workflow: readonly string[];
  discoveryTitle: string; discoveryDescription: string; fieldsLabel: string; registrationsLabel: string; captureBoundary: string;
  workspaceTitle: string; workspaceDescription: string; workspaceBoundary: string;
  overview: MarketingCapture; explorer: MarketingCapture; dependencies: MarketingCapture; fields: MarketingCapture;
  registrations: MarketingCapture; open: MarketingCapture; source: MarketingCapture; context: MarketingCapture;
};
