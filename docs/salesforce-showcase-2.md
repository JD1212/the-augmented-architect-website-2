# Salesforce real-product showcase

The Salesforce Modernization page uses seven authentic, reviewed screenshot derivatives in `public/images/salesforce-showcase-2/`. It also retains the earlier Registration Manager capture from `public/images/salesforce-showcase/`. All six existing top-level consulting sections, the hero, Trigger Runtime diagram, engagement stages and consultation destinations remain in place.

## Presentation and editable content

The existing tools section follows **Discover → Inspect → Open in VS Code → Develop with AI assistance → Review and validate**. It presents:

| Image | Purpose |
| --- | --- |
| `command-center-overview.png` | Wide Command Center introduction. |
| `architecture-explorer.png` | Account automation discovery with the four-action count and empty Flow state intact. |
| `trigger-dependencies.png` | Confirmed Opportunity trigger/service/configuration relationships. |
| `metadata-field-dependencies.png` | Optional referenced-field detail in a native disclosure. |
| `open-in-vscode-action.png` | Supporting view of the authentic inspector action. |
| `vscode-source-files.png` | Retrieved trigger/class workspace and open `package.xml` manifest. |
| `vscode-ai-context.png` | Generated context snapshot with org identity rows permanently redacted. |

The earlier Registration Manager example remains available in a disclosure. It demonstrates three inactive actions at orders 100, 200 and 300 and is explicitly distinguished from the new four-action Explorer capture.

Headings, descriptions, image dimensions, alt text and demonstration qualifications live in `realSalesforceShowcase` in `src/content/salesforce-showcase.ts`. The surrounding offering content remains in `src/content/salesforce.ts`; only its existing Custom Metadata benefit gains a sentence explaining Registration Manager.

The server-rendered `ConsultingProof` composes the story. Images reuse the existing native-dialog product viewer, including native pixel inspection, Fit image, Actual size, keyboard access, Escape, backdrop close and trigger-focus restoration. Thumbnails preserve the complete prepared images; the viewer supplies readable full-resolution detail on desktop and mobile. No image library or simulated product operation was added.

## Original sources and security

The original ZIP was moved intact to:

`.local-assets/salesforce-website-captures/salesforce-showcase-2/salesforce-new-real-captures.zip`

That directory is already ignored by the root `.gitignore`. The source ZIP's SHA-256 is:

`b346b0848703519968f74bfa2eaa33646563ca3f972318ff3930aa6fc6841e3c`

Raw temporary extractions remain outside `public/`. The preparation manifest is stored in `docs/salesforce-showcase-2-manifest.json`, outside the publicly served tree. No unredacted originals, source archives or error captures belong in the release. No ignore, environment or deployment configuration change is needed.

Processing preserved original colors and native resolution, using exact crops and lossless PNG compression with ancillary metadata removed. No interfaces were generated or reconstructed. The context derivative has a flattened opaque redaction over the org-ID, alias, username and wrapped instance-URL rows. The entire minimap was cropped out because it duplicates that information. All other retained pixels match their source.

Seven selected originals total 2,533,739 bytes; the derivatives total 2,156,869 bytes (about 15% smaller). The manifest records source/output hashes, crop and mask coordinates, and dimensions. Local macOS Vision OCR found no email-address, org-ID, instance-domain or excluded error-message patterns in the prepared PNGs; visual inspection supplements this check.

Selected source captures: **01, 02, 06, 08, 09, 10, 11**.

Excluded:

- **03, 04:** visible `Disconnected or Canceled` errors. They were not retouched to imply success.
- **05:** XML diagnostic underline and diagnostic count; weaker evidence than the clean Opportunity workspace.
- **07:** duplicate Explorer view with more clipped controls/content than 02.

All 14 existing files in `public/images/salesforce-showcase/` remain unchanged.

## Demonstration boundaries

- The examples use a fictional scratch org. Inactive registrations do not establish executed automation or business outcomes.
- The Explorer reports zero matching record-triggered Flows, so no populated Flow inspector or decision graph is claimed.
- Confirmed relationships are specific supported discoveries, not an exhaustive org-wide dependency graph.
- The source-workspace image shows filenames and a retrieval manifest, not an open Apex implementation body.
- Context is a timestamped snapshot, not a live-sync guarantee. These captures do not prove completed AI debugging, successful tests or deployments.
- Command Center navigation tiles do not establish operational completeness of Automation Portfolio or Audit Center.
- Local CLI authentication, package permissions and the optional Vibes extension remain prerequisites. The extension is not advertised as automatically fixing or deploying code.
- Custom Metadata orders supported registered actions; it does not control Salesforce's overall automation order of execution or every native Flow.

## Validation

`tests/salesforce-real-captures.test.mjs` verifies the seven public assets against approved hashes and native dimensions and checks demonstration qualifications. The existing `tests/salesforce-showcase.browser.mjs` now verifies real images, disclosures, accessible enlargement/fit/native-size behavior, retained sections/CTAs, responsive layouts, existing images and absence of public source archives. Scout and scheduling requests are mocked during these browser checks; no appointments or emails are created.

Local release checks passed: ESLint, `tsc --noEmit`, `next build --webpack`, 126 unit tests (two opt-in live-model tests skipped), and 351 Chromium browser checks across 1440, 1100, 900, 768, 600, 390 and 320px viewports. Desktop/mobile section screenshots were visually inspected. Asset checks verified the unchanged original ZIP and all 14 older images, approved derivative hashes, no public ZIP/error/sensitive source captures, and no private-asset references in production file traces. No real appointments or emails were created.
