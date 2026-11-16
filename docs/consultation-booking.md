# Shared consultation booking

One native, accessible modal serves all ordinary same-tab `/book` links, the
`/book` page, Scout's fixed Book Consultation action, and `/book` paths in Scout
replies. Links retain their real destination for modified clicks and fallback
navigation. Booking opens above an existing Scout/FAQ dialog and restores focus
without unmounting the conversation hook.

## Schedule and configuration

The owner-approved defaults in `src/lib/booking/settings.ts` are primary calendar
`jd@theaugmentedarchitect.com`, Monday–Friday 10:00–16:00 America/Costa_Rica,
30-minute appointments, a 15-minute buffer, no weekends, and no appointment ending
after 16:00. Starts use a 15-minute grid. The default advance notice is 120 minutes
and the horizon is 30 days. Visitor-local dates, times, IANA timezone and UTC offset
are displayed explicitly; the business calendar date is labelled separately.

Google OAuth uses `calendar.events`, `calendar.freebusy` and
`calendar.calendars.readonly`. Credentials are server-only:

- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REFRESH_TOKEN`
- `CONSULTATION_BOOKING_ENABLED=true` after live verification

Existing `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are reused. Optional server env
overrides are listed in `.env.example`; approved calendar/hours defaults are
already in code. No publishable key, visitor account, SMTP or Supabase Auth is
required. Keep credentials in ignored `.env.local` and Vercel Production Secrets,
never `NEXT_PUBLIC_` variables, source files or CLI arguments.

For owner reauthorization, register
`http://127.0.0.1:39391/oauth/callback` on the existing Google Web OAuth client and
run `node scripts/authorize-consultation-calendar.mjs` locally. It uses state,
PKCE and offline consent, checks all scopes, and updates only the refresh token
without printing it. It is not a visitor-login flow.

## Reliability and security

The server reads free/busy windows without returning private event details.
Only slots passing hours, notice, horizon, buffer and reservation checks are shown.
The visitor supplies name/email and explicitly confirms the exact appointment.
Missing configuration shows an honest unavailable state with disabled controls,
no selectable slots and no submission.

Each submission has a UUID, a payload fingerprint and an independent HttpOnly
booking-session cookie. Scout's cookie/session lifecycle is untouched. The
reservation transaction serializes website bookings per calendar, deduplicates
leads within an anonymous booking owner, and claims a bounded execution lease.
Google event IDs are deterministic per calendar/request. Availability is checked
again immediately before insertion. Events include the approved attendee,
`sendUpdates=all`, and Google Meet conference creation.

Success is reported only after a real confirmed event/Meet link and persisted
Supabase confirmation exist. Timeouts or uncertain persistence return pending;
retry uses the same reservation/event, never an invented success. Uncertain slots
remain held until reconciliation. An operator can inspect that exact Google event
and reservation, resolve it, then retry the original request. Never release an
uncertain reservation without checking whether Google created its event.

Google Calendar has no atomic free/busy-and-insert operation: the database lock
protects competing website bookings; independent manual calendar writes can race
the final Google check. Treat the selected calendar as the authoritative schedule.

The applied migration is
`supabase/migrations/20261115230214_consultation_booking.sql`, only on dedicated
project `cjldcaiybqguklzqtdjj`. The old booking proposal is a reference copy, not a
second migration. RLS stays forced with no visitor policies/grants. Only the
server can invoke reservation/claim RPCs or update the permitted state columns.
Lead/request ownership and legacy Scout request guards remain enforced. No tables
or authentication features were added, and the customer-identity proposal remains
unapplied. Schema migrations do not run automatically in the website build.

Only submitted name/email, optional summary, scheduling metadata, owner/fingerprint
hashes and event references are stored. No raw IPs, OAuth tokens or Scout transcript
are saved in booking records. Before official launch, approve the retention and
cleanup policy (proposed: anonymize booking PII 90 days after the appointment),
including the separate Google Calendar retention policy.

Scout retains its model, SDK, business knowledge, streaming and conversation logic.
Its narrow scheduling instruction directs visitors to the shared interface and
never claims chat can book appointments itself.

## Code and verification

Public UI copy: `src/content/booking.ts`. Components:
`src/components/booking/`. Server modules: `src/lib/booking/`. API:
`src/app/api/booking/route.ts`.

```sh
node --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
npm run start -- --port 3100
node tests/booking.browser.mjs http://localhost:3100
node tests/scout-returning.browser.mjs http://localhost:3100
node tests/scout-cookie-recovery.browser.mjs http://localhost:3100
node tests/scout-session.browser.mjs http://localhost:3100
node tests/scout-conversation.browser.mjs http://localhost:3100
node tests/scout-homepage.browser.mjs http://localhost:3100
node tests/service-faq.browser.mjs http://localhost:3100
```

Fixture browser suites never create Google appointments. Run the two Scout
fixture-proxy suites sequentially because they share port 3191. SQL rollback tests
are in `supabase/tests/consultation_booking.sql`. Optional isolated PostgreSQL replay:

```sh
npm install --prefix /private/tmp/aa-booking-db-validation --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.3.16
BOOKING_PGLITE_MODULE=/private/tmp/aa-booking-db-validation/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-booking-sql.mjs
```

Read-only Production browser verification creates no additional appointments:

```sh
node tests/booking-live.browser.mjs https://the-augmented-architect-website-2.vercel.app
```

One owner-approved real booking was verified for November 16, 2026, 10:00–10:30
Costa Rica. The actual form/HTTP/service, Google event and Meet link, correct
attendee, associated lead/request and duplicate protection passed. Google accepted
invitation dispatch with `sendUpdates=all`; recipient inbox delivery is not
independently observable from the organizer connection. The exact event was
cancelled with notification, the exact generated lead/request removed, and the
slot became available again. Existing Scout rows retained identical digests.
No other live test appointment is authorized by this record.

Release workflow: validate → commit reviewed website changes → push GitHub main →
verify the existing Vercel Git-integrated Production deployment is Ready and matches
the SHA → run read-only Production UI/API checks. No manual deployment, DNS or
custom-domain change is needed. Never commit unrelated Phase 2/auth work.

References: [Google freeBusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query),
[events.insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert),
[events.delete](https://developers.google.com/workspace/calendar/api/v3/reference/events/delete).
