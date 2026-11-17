# Scout-first consultation entry

Normal consultation links to `/book`, existing booking buttons, FAQ links, and Scout's booking suggestion open the existing panel and immediately send this standalone user turn through `useScoutConversation.send`:

> I'd like to book a free 30-minute consultation.

The text is editable in `src/content/assistant.ts` (`bookingEntry.request`). Scout's existing SDK and loaded scheduling skill then request only missing booking details. There is no static assistant introduction and no hidden prefix on any later typed or dictated message.

The existing cookie, conversation history, and unsent draft are retained. The CTA explicitly continues a saved session through the existing restore function rather than resetting it. A request made during restoration or another running reply waits until the same conversation is ready; no parallel execution is introduced. Repeated clicks and recognized existing direct booking requests only reopen/focus Scout. Explicit New Conversation uses the existing secure reset and permits a fresh request. A failed booking turn uses the existing Retry control and client turn ID, preserving the unsent draft.

The scheduling tools, skill, approval controls, ownership rules, expiry, and calendar services are unchanged. A CTA initiates conversation, never an appointment or email operation. Confirmation remains mandatory. The manual form remains available through the existing fallback and directly on `/book`. Modified link clicks retain normal browser behavior.

## Verification

- `node --test tests/*.test.mjs`
- `SCOUT_INTRO_LIVE=1 node --env-file=.env.local --test tests/scout-intro.test.mjs` opts into real SDK/model checks with fixture-only scheduling/storage/email services.
- `npm run lint`, `npx tsc --noEmit`, `npm run build -- --webpack`
- With that build on port 3100: `node tests/scout-booking-cta.browser.mjs http://localhost:3100`

The CTA browser suite verifies immediate standalone POSTs, unchanged dictated details, discovery-to-booking transition, deduplication, existing/returning sessions, queued execution, failure/retry, manual fallback and desktop/mobile controls. It can target Production safely: all chat/booking HTTP requests are intercepted with fixtures and no appointments or emails are created. The existing dictation and scheduling suites cover waveform/recognizer cleanup and secure controls.
