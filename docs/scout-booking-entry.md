# Scout-first consultation entry

Normal consultation links to `/book`, existing booking buttons, and Scout's booking suggestion open the existing Scout panel and focus its input. The welcome text is editable in `src/content/assistant.ts` (`bookingEntry`). Modified link clicks retain their normal browser behavior; `/book` remains a real page with an explicit manual-form alternative.

The introduction is UI state, not a fabricated or persisted assistant turn. Repeated clicks preserve the draft, transcript, and collected information without another execution. The first submitted booking details carry the visitor's explicit booking intent through the existing message transport; later messages use the normal conversation flow. The existing server length limit is respected without truncating details. Saved conversations still require the existing Continue/New choice before revealing history or accepting input.

The existing scheduling tools, skill, approval controls, ownership cookie, expiry, and calendar services are unchanged. Clicking a CTA never starts recording, creates an appointment, or sends an email. The manual form is available from the booking introduction and directly on `/book`.

## Verification

- `node --test tests/*.test.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build -- --webpack`
- With that build on port 3100: `node tests/scout-booking-cta.browser.mjs http://localhost:3100`
- Existing dictation, conversation, returning-visitor, homepage, scheduling, and manual-booking browser suites cover the preserved experiences. The CTA suite can also target the Production URL; all Scout/booking API requests are intercepted with fixtures and never create appointments or send emails.

The waveform uses local audio amplitude where supported. Speech recognition depends on browser support and permission; automated audio tests use simulated input and do not replace physical-device verification.
