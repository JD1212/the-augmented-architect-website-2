# Salesforce offering page captures

Route: /salesforce. Edit src/content/salesforce.ts to attach approved screenshots.
No Salesforce screenshot exists in this repository at implementation time. Pending
panels are editorial states, not simulated application UI.

Place images in public/images/salesforce/. For each matching capture entry replace
image: null with { src: '/images/salesforce/explorer.png', alt: 'Accurate description',
width: 1920, height: 1080 }, using the actual dimensions. Preserve original colors.
Use 1600px or wider source captures. The viewer preserves a readable minimum width,
supports internal horizontal/vertical scrolling, and provides native modal expansion
with 50–200% size controls. Mobile browser pinch zoom remains enabled.

Required real, public-safe assets:
- explorer.png: Architecture Explorer, Account and three synthetic Northstar actions.
- registrations.png: Registration Manager, BEFORE_UPDATE, orders 100/200/300 and actual states.
- flow.png: Opportunity demo Flow inspector, meaningful decision structure.
- dependencies.png: Account handler inspector, related policy service and test context.
- vscode.png: actual dedicated handoff workspace with source, tests, AUGARCH_CONTEXT.md and AGENTS.md.

Do not expose credentials, tokens, client identifiers or customer records. Do not imply
inactive fixtures have proven runtime execution. Capture and verify the UI first.
No Audit Center or Portfolio dashboard claim is made. No fabricated product screenshots.

Publishing: use a feature branch through the existing GitHub integration for Vercel Preview.
Do not merge/promote as part of this page task; main triggers production.

