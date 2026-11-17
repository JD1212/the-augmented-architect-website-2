# Salesforce commercial offer and guided trial booking

## Scope

This website generates consultation bookings. It does not distribute Salesforce packages, install or activate software, issue entitlements, enforce licensing or automatically expire a trial. The architect personally handles eligibility, installation and arrangements for the guided 30-day evaluation during the 30-minute setup appointment.

The owner-approved public offer is enabled by `salesforceCommercial.trialBookingEnabled`. No environment variable or package-release prerequisite is required. The former development-only review flag and private-review notices were removed following the owner's clarification.

## Website content

The existing Salesforce page now includes a compact **Start Free 30-Day Trial** CTA near the top and a concise commercial section:

- **$10,000** starting one-time implementation: installation/configuration, thin-trigger and Custom Metadata architecture setup/validation, modernization of one mutually agreed object in defined scope, demonstration/testing and practical handoff.
- **$6,000/year**, optional management/development tools. The implemented Trigger Runtime architecture remains without an ongoing software subscription; the optional subscription covers continued management/tool access.

The CTA explains that the 30-day evaluation is personally guided and that the immediate action is booking a free 30-minute setup appointment. Existing general consultation buttons, hero content, screenshots, image viewers, product sections, diagram and engagement stages are preserved.

## Booking flow

1. The trial CTA opens Scout using the existing browser session and immediately sends a standalone user request for a free 30-minute Salesforce sandbox trial setup consultation.
2. Existing drafts/history remain intact. Repeated clicks deduplicate the request; ordinary booking controls do not restart an existing trial flow. Nothing is prepended to the next typed or dictated message.
3. Trial-only guidance asks for missing name, email, preferred date/time and timezone, reusing provided information. The same seven native SDK scheduling tools perform availability and proposal handling.
4. The existing secure confirmation card displays the trial purpose and 30-minute duration. No booking occurs before its explicit approval. Existing owner checks, conflicts/buffers, verification, rescheduling/cancellation and notification handling remain in use.
5. The canonical purpose is carried in the existing appointment description/project summary, without schema changes. Google Calendar events are titled **Salesforce Sandbox Trial Setup — The Augmented Architect**, with details distinguishing the 30-minute appointment from the personally arranged 30-day evaluation. Ordinary consultation titles/descriptions are unchanged.
6. Only a genuinely confirmed trial booking returns its preparation message and actual Meet URL. Pending, failed and unapproved results never supply the booked/preparation message. Scout asks the visitor to have a Developer Sandbox ready using the short confirmed preparation message. It never requests Salesforce credentials or claims software has been installed or activated.

## Files

- `src/content/salesforce-commercial.ts`: owner-approved copy, prices, CTA intent, calendar purpose, preparation message and enabled booking switch.
- `src/components/salesforce/salesforce-page.tsx`, `salesforce.module.css`, `commercial-offer.tsx`, `trial-cta.tsx`: compact public offer and CTA using current styling/layout conventions.
- `src/components/booking/booking-provider.tsx`, `src/components/assistant/AssistantLauncher.tsx`, `src/lib/assistant/booking-entry.ts`: trial intent through the existing standalone-send/session/deduplication pathway.
- `src/lib/salesforce/trial.ts`: server-side booking switch and explicit purpose recognition, without package or licensing checks.
- `src/lib/booking/calendar.ts`, `service.ts`, `scheduling.ts`, `types.ts`: trial event labeling, confirmation purpose and confirmed-only preparation data. No new scheduling runtime, database fields or migrations.
- `src/components/assistant/ScoutScheduling.tsx`: optional purpose line in the existing confirmation card.
- `src/lib/scout/scheduling-skill.ts`, `scheduling-tools.ts`: narrowly scoped trial guidance/description using existing tools. The original scheduling skill file, agent runtime/model, general prompt and tool registrations remain unchanged.
- `tests/salesforce-trial.test.mjs`, `salesforce-trial.browser.mjs`: feature, native SDK, mocked Calendar, ownership/confirmation, duplicate/typed/dictated-message and responsive coverage.
- `tests/salesforce-showcase.browser.mjs`: retains existing showcase assertions while allowing the added commercial section.

## Validation and release

Run `node --test tests/*.test.mjs`, `npm run lint`, `npx tsc --noEmit`, and `npm run build -- --webpack`. Against that exact production build, run the trial browser suite, existing general consultation CTA suite and existing Salesforce showcase suite. All Google/booking/email and browser model interactions use fixtures; no real appointments or invitations are created.

After successful validation, release through the existing GitHub main → Vercel Production integration. Verify Ready, exact commit matching and the deployed `/salesforce` experience. Do not change DNS, domains, project configuration, credentials, environment values, Salesforce packages or licensing infrastructure.

Local release verification passed: 134 unit tests (two opt-in live-model tests skipped), ESLint, TypeScript, production build, 68 guided-trial browser checks, 368 existing general-consultation CTA checks and 351 Salesforce showcase checks. Desktop/mobile visuals were inspected. Browser scheduling/model interactions and Google/email operations used fixtures only; no real appointments or emails were created.

## Final trial refinements

Scheduling validation now removes only horizontal whitespace around explicit email delimiters (`@` and dots). Recognition output and the existing chunk joiner can introduce this spacing; the dictation implementation and original chat messages are preserved. Word-internal spaces, multiple addresses, display-name prose and other ambiguous inputs require clarification. Only the extracted booking-email field is normalized, retaining the existing lowercase policy. The returned proposal supplies the normalized email to the existing visitor approval card. Identity verification is unchanged.

The confirmed trial preparation message is exactly: "You're booked! For your Salesforce trial setup, just have a Developer Sandbox ready. We'll walk you through everything during our appointment." Trial-specific guidance preserves confirmed appointment details and the actual Meet URL without adding lengthy setup explanations. CTA changes are confined to the gaps and explanatory-note grouping; pricing, button styling, copy, screenshots and diagrams are unchanged.

Refinement validation passed: 140 unit tests (two opt-in tests skipped), lint, TypeScript, production build, 76 trial browser checks and 351 showcase checks. Desktop/mobile screenshots were inspected; scheduling/model/calendar/email interactions used fixtures and created no real appointments or emails.
