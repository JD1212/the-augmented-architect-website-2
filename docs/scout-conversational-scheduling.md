# Scout conversational scheduling — Phase 2

## Release status

The approved Production checkpoint is `ab66edf5ed2bad653a31009c98e489601fb8b224`.
The enhancement has passed local validation and the approved real booking → Gmail
verification → reschedule → cancellation sequence. Gmail authorization and the
scheduling-only migration are verified. Release uses the existing GitHub main →
Vercel Production integration; no manual deployment or domain changes.
The existing booking modal remains an alternative. No authentication/customer
identity proposal is included or applied by this work.

## Owner configuration

Use the existing Calendar OAuth Google Cloud project and client:

1. Enable **Gmail API** in APIs & Services → Library.
2. In Google Auth Platform → Data Access add only
   `https://www.googleapis.com/auth/gmail.send` for Gmail. Keep existing Calendar
   permissions. Do not add mailbox read, modify or full-mail permissions.
3. Keep `http://127.0.0.1:39391/oauth/callback` as the existing helper redirect.
   Authorize the approved Workspace sender `jd@theaugmentedarchitect.com`.
   If the OAuth app is External/Testing, ensure that owner is an allowed test
   user; an owner-only Internal app may be appropriate for this Workspace.
4. Run `node scripts/authorize-consultation-calendar.mjs --gmail` and open its
   short-lived link. The state/PKCE callback verifies granted scopes and primary
   calendar identity before saving `GOOGLE_GMAIL_REFRESH_TOKEN` in ignored
   `.env.local`. The working `GOOGLE_CALENDAR_REFRESH_TOKEN` is not overwritten.
5. Never paste tokens in chat. Do not enable production email based on consent
   alone: verify the send endpoint with the explicitly approved test recipient.

New server-only configuration:

- `GOOGLE_GMAIL_REFRESH_TOKEN`: separate Gmail-capable offline token, same OAuth client.
- `SCOUT_VERIFICATION_EMAIL_ENABLED=true`: only after authorized real send testing.
- `SCOUT_SCHEDULING_ENABLED=true`: only after the complete enhancement passes.

Existing Calendar credentials, dedicated Supabase secret and model remain unchanged.
Flags are absent/disabled by default. No frontend secrets or extra mailbox scopes.
Google acceptance is evidence of accepted delivery, not proof of inbox receipt.

## Agent, skill, tools, and services

- `src/lib/scout/agent.ts` defines the existing Agent and Runner. When explicitly
  enabled it registers seven native `tool()` definitions from
  `src/lib/scout/scheduling-tools.ts`, raises the bounded Runner limit from 1 to
  8 turns, and retains streaming, timeout and usage accounting. No custom loop.
- `src/lib/scout/skills/consultation-scheduling/SKILL.md` contains the workflow,
  timezone/confirmation guidance and non-repetitive consultation-offer policy.
- `src/lib/scout/scheduling-skill.ts` explicitly reads that file; its content is
  appended to the Agent instructions. `next.config.ts` includes it in API output
  tracing for Vercel. Merely creating SKILL.md does not register a tool.
- Application-owned RunContext supplies the hashed Scout session credential.
  The model cannot supply or change that owner through tool arguments.
- `src/lib/booking/scheduling.ts` stores exact proposals and resolves side effects
  through the existing booking service. It supplies server state to each run so
  a model need not infer approval from transcript text or expose opaque IDs.
- `scheduling-http.ts` accepts same-origin, session-scoped UI approval and secure
  code entry. Codes never pass to model input or conversation preparation.
- `verification.ts` generates random six-digit codes, stores a keyed verifier,
  limits issuance per owner and email, enforces 10-minute expiry, five attempts
  and single use, then grants a 15-minute server-side verified-email scope.
- `gmail.ts` sends only fixed verification mail using Gmail messages.send.
  No mailbox searching/reading or arbitrary model-authored email is exposed.
- `management.ts` and `management-store.ts` enforce verified email ownership,
  reserve changes under the calendar transaction lock and use operation leases.
  Google changes use ETags and attendee updates. Uncertain outcomes remain pending
  and recover the same operation; they never claim completion prematurely.
- Google Calendar logic remains in `calendar.ts`; Supabase calls remain in stores.

## Deterministic authorization

A model request to confirm a proposal does nothing until the same-origin UI
control has approved that exact owner-bound proposal. Chat text is not approval.
Approval records contain immutable appointment details. The backend rechecks
availability, database conflicts and the daily cap before creating/updating an
event. Booking retries use the original deterministic event ID.

Appointment lookup and changes require the verified email from backend state,
not an email or owner asserted by the model. Secure verification is account-free;
it does not expose unfinished login or apply the customer-identity proposal.
A new Scout session rotates ownership and loses access to prior authorization.
Historical conversations and calendar bookings are not deleted.

Rescheduling holds the original booking and replacement reservation during an
uncertain outcome. It patches the existing Google event, preserves conference
information, and persists the new time before reporting completion. A confirmed
conflict leaves the original unchanged. An uncertain Google/DB response is
explicitly pending until the same operation is reconciled.

## Shared availability policy

`settings.ts` defines weekdays, Costa Rica timezone, 30 minutes, 15-minute buffers,
starts at 10:00 / 11:30 / 13:30 / 15:00, and a three-consultation daily cap.
The service applies real free/busy and stored reservations. The migration also
serializes reservations and checks fixed windows and daily capacity in Postgres.
A verified reschedule credits its own existing booking for the daily cap.
The modal replaces only its time dropdown with accessible selectable buttons.

## Tests and execution trace

Run:

```
node --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
node tests/booking.browser.mjs http://localhost:3102
node tests/scout-scheduling.browser.mjs http://localhost:3102
```

The browser commands use local HTTP/storage/calendar/mail fixtures and the real
built React UI. They do not create real events or send real emails. The SDK tests
use the actual Agent/Runner/tool API with a fixture Responses transport.
`scout-scheduling.test.mjs` prints `SANITIZED FIXTURE SDK TRACE` for a multi-turn
availability → proposal → explicit UI approval → booking execution. The fixture
name/email use a reserved `.invalid` address; this is not a live booking trace.
It also verifies code denial, rate limits, cross-visitor denial, cancellation,
rescheduling, conflicts and interrupted Google/database recovery.

The optional SQL harness is `node scripts/verify-booking-sql.mjs --scheduling`
with a test-only PGlite engine supplied by `BOOKING_PGLITE_MODULE`; do not install
that engine in application dependencies. It checks the legacy schema first, then
applies and validates the scheduling addition in isolation.

Before release, run the pending scheduling migration against isolated Postgres
and review its RLS/grants/rollback checks. Apply only to dedicated project
`cjldcaiybqguklzqtdjj`; never apply the unrelated authentication proposal.

The owner approved one live sequence for JD Burkholder at the approved test email:
November 16, 2026, 10:00 Costa Rica → 11:30 Costa Rica → cancellation, all subject
to final availability. That approval permits only that sequence and its verification
email/attendee notifications, not further events or prospect emails.

Do not deploy partial tools. Once all local/security/live tests pass, release via
Git main → existing GitHub → existing Vercel Production, verify Ready and exact
commit, and smoke-test without creating extra appointments. No DNS/domain changes.

## Verification checkpoint

- 93 unit tests passed, including native Runner tool calls and streaming.
- 44 booking-grid, 17 scheduling-control, 37 returning-visit and 45 legacy-cookie
  browser assertions passed (143 total) on desktop/mobile.
- Lint, TypeScript and `git diff --check` passed.
- Production build passed with `npm run build -- --webpack`. Default Turbopack
  hit a local CSS-worker port-binding permission error, including elevated attempts;
  no unrelated build configuration was changed to hide that limitation.
- Isolated PostgreSQL harness passed legacy and new scheduling/RLS/rollback checks.
- Actual Calendar + dedicated database read-only availability returned four valid
  candidate times. No calendar events or emails were created in this phase.
- `.env.local` remains ignored/untracked/unstaged. Credential values were absent
  from tracked/untracked changes; no credentials were printed.
- Gmail offline authorization, all Calendar scopes, the approved sender and Meet
  support were verified. The original Calendar token remains unchanged.
- Scheduling migration `20261116041634_scout_scheduling.sql` was applied only to
  the dedicated Website 2.0 database. Forced RLS, no visitor grants/policies, and
  SECURITY INVOKER RPC permissions were checked on the real database.
- The real SDK agent created exactly one approved event with Meet and lead/request
  records, verified one Gmail code through the secure field, rescheduled the same
  event from 10:00 to 11:30 Costa Rica time, then cancelled it with attendee updates.
  Duplicate confirmation created no additional event. The cancelled record remains
  as an audit trail; no historical conversations were deleted.
- Transcript inspection found zero verification codes. API acceptance of email
  is verified; inbox delivery is not inferred from provider acceptance alone.
- A test-harness guard initially compared equivalent timestamp strings literally;
  the existing request entered reconciliation rather than creating an event. The
  corrected harness recovered the same proposal/event ID. Execution intent is now
  persisted before side effects, and cancellation passes a null replacement time.
  Both cases have regression coverage.
- The verified Gmail token and enable flags were configured server-side in the
  existing Vercel project's Production environment using CLI stdin.
- Existing README customer-identity notes, `docs/scout-phase2.md`, and the unapproved
  customer identity proposal are preserved outside this release.

## Sanitized real SDK execution trace

This is the approved real test, not a simulated tool sequence. Name/email are
redacted; the original availability/proposal calls occurred before reconciliation.

| Native tool | Sanitized input | Verified result |
| --- | --- | --- |
| check_consultation_availability | 2026-11-16, America/Costa_Rica | Real available candidate times |
| prepare_consultation_booking | Approved test attendee, 10:00 Costa Rica | Session-owned proposal; no event created |
| confirm_consultation_booking | Same UI-approved proposal ID | Confirmed event, Meet URL and Supabase records |
| request_appointment_verification | Approved test email | One Gmail message accepted |
| get_verified_appointments | No email/owner argument | Verified visitor's appointment only |
| reschedule_consultation | Verified appointment, 11:30, approved proposal | Same event updated; database synchronized |
| request_appointment_verification | Same email, still-verified session | Existing authorization reused; no second email |
| cancel_consultation | Verified appointment, approved proposal | Google event cancelled and database marked cancelled |

The agent's final response confirmed cancellation after the completed tool result.
No event, code, ownership claim or success result was fabricated by prompt text.
