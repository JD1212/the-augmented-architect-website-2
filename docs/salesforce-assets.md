# Salesforce consulting page and retained capture library

Route: `/salesforce`. This is a consulting services page for architecture
assessment, automation cleanup, and incremental modernization. Edit its copy in
`src/content/salesforce.ts`; Salesforce SEO metadata remains in `src/content/site.ts`.

The public page uses exactly two static, focused interface reconstructions:
Architecture Explorer (capture 01) and Registration Manager (capture 02). Both
reuse the captured data and interface primitives, with a visible reconstruction
label and inactive states. They have no application controls or simulated org
operations. The five-tab viewer and Create Trigger Action walkthrough are no
longer mounted on the public page. Their components and all fourteen public-safe
captures are retained for future use, along with the untouched private originals.

`consulting-proof.tsx` composes these focused views from `product-interfaces.tsx`.
Shared captured data, source excerpts, and image sizes remain in
`src/content/salesforce-showcase.ts`. Page and proof styles are scoped CSS Modules;
shared site tokens remain unchanged. The sections are rendered as Server Components.

The following mapping and fidelity notes document the retained capture library;
they do not imply that all fourteen views appear on the consulting page.

## Capture mapping

| Capture | Product view / walkthrough |
| --- | --- |
| 01 | Architecture Explorer: Account and three inactive Trigger Actions |
| 02 | Registration Manager: execution sequence 100 / 200 / 300 |
| 03 | Flow Discovery: Opportunity trigger and record-triggered Flow |
| 04 | Dependencies & Source: captured Opportunity source excerpt |
| 05 | Dependencies: authentic readable dependency-tree image |
| 06 | Registration Manager: Context Handlers grouping |
| 07 | Develop with Context: Account source and Open in VS Code action |
| 08 | Step 1: Account / AFTER_INSERT target |
| 09 | Step 2: execution order 100, no existing actions for this event |
| 10 | Step 3: handler and companion-test template artifacts |
| 11 | Step 3: successful creation and capability verification |
| 12 | Step 4: six compatibility checks |
| 13 | Step 5: review inactive Custom Metadata registration |
| 14 | Step 5: fourth inactive action in the captured result |

## Representation and fidelity

Reduced-scale captures are reconstructed as readable HTML/CSS, with the label
“Interface reconstruction based on an actual application capture.” The actual
application-only capture remains available from each view. Capture 05 is used
directly for the dependency tree. No image is regenerated, recolored, stretched,
or AI-upscaled. Actual-size image inspection is the default in expanded capture
views; Fit image is optional. Complex views scroll internally on mobile.

In the retained full-viewer components, application controls are read-only visual
context. Their tabs, walkthrough navigation, expansion, and image-fit controls are
not mounted on the current public page.
Nothing connects to Salesforce or creates, activates, or deploys anything.
All trigger, Flow, and registration states remain inactive. Order 100 in the new
AFTER_INSERT event does not replace existing BEFORE_UPDATE orders 100/200/300.
Registration and capability verification do not prove handler execution, passing
tests, or business outcomes.

The source excerpt ends at the last visible captured line; omitted source is not
invented. Template source is available in the actual capture, but its tiny text is
not speculatively transcribed. The early template guidance and later successful
scratch-org creation are distinguished; direct creation depends on environment
and authorization. The org-specific ApexClass identifier is omitted.

Missing evidence: a detailed Flow Inspector and a completed VS Code desktop
workspace. The page describes Flow discovery and the captured IDE handoff action,
not those missing screens. Vibes is optional; related source/tests,
AUGARCH_CONTEXT.md and AGENTS.md depend on local authentication and permissions.
No automatic deployment is claimed.

## Public assets and preserved originals

Published application-only PNG crops are in `public/images/salesforce-showcase/`.
Browser/application navigation, the organizer badge, terminal slivers, and the
org-specific class identifier were excluded with rectangular pixel crops. Crop
coordinates, source hashes, and public hashes are recorded in
`salesforce-capture-manifest.json`. Crop coordinates use original pixel units.
Pixel buffers were compared to the corresponding source extracts, with no image
resizing or color conversion. The complete fourteen original PNGs and README are
preserved byte-for-byte in ignored `.local-assets/salesforce-website-captures/`,
outside public hosting. The existing screenshot-backup Git stash is retained.
Do not move unreviewed originals back under `public/` or stage the private archive.

## Validation and release

Run `npm run lint`, `npx tsc --noEmit`, `node --test tests/*.test.mjs`,
`npm run build`, and the browser checks against a production preview. The
Salesforce-specific check is `node tests/salesforce-showcase.browser.mjs URL`.
It covers the six consulting sections, two labeled product proofs, captured
inactive states and order, absence of simulator/wizard UI, booking and approach
links, SEO, responsive layouts, image availability, and browser errors.
Use the existing GitHub main → automatic Vercel Production workflow. Do not
change domains, DNS, or deployment assignments.
