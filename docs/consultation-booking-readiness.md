# Booking readiness — 2026-11-15

## Google: read-only readiness verified

The existing local client ID, client secret and replacement refresh token work.
All required scopes are granted: `calendar.events`, `calendar.freebusy`, and
`calendar.calendars.readonly`. `calendars.get(primary)` now returns 200 and
identifies `jd@theaugmentedarchitect.com`; its conference capabilities include
`hangoutsMeet`. Real free/busy reads succeed without exposing private event
contents. The application server credential/RPC and read-only availability flow
also pass: the next three business days have 23 available candidate starts each,
within the approved 10:00–16:00 America/Costa_Rica schedule (subject to rechecking).

The Google calendar's own display timezone is America/New_York. It was not changed;
the booking policy explicitly uses America/Costa_Rica and shows visitor-local times.
The subsequent approved real event/Meet creation and invitation-dispatch checks
are documented in the completion record below.

The enable flag was kept false throughout readiness checks, then set true only
after the approved real test and cleanup (see completion record below).
No tokens were displayed. Readiness checks created no events; the later single
approved test and cancellation are recorded below.

## Supabase: validated and applied

Only project `cjldcaiybqguklzqtdjj` — **Augmented Architect Website 2.0**, us-east-1 —
was accessed. Applied migration:

`supabase/migrations/20261115230214_consultation_booking.sql`

The CLI generated the file; its filename was aligned with the version recorded by
Supabase's migration API. The old proposal is now labelled as a reference copy;
do not apply it again. The customer-identity/authentication proposal was not applied.

The booking migration adds no tables and changes no Scout conversation/session
logic. It extends the two existing lead/request tables for standalone website
booking ownership, calendar references, reservation status and execution leases.

Validation:

- Migration replay on isolated PostgreSQL 17.5 using PGlite; real database is 17.11.
- Existing Scout foundation and request-limit SQL tests pass after migration.
- New rollback-only tests pass both locally and on the actual dedicated database:
  forced RLS/no visitor policies, denied anon/authenticated access, service-only
  SECURITY INVOKER RPCs with empty search paths, narrow column update grants,
  normalized lead deduplication within a booking owner, request idempotency,
  foreign-owner/payload rejection, buffer conflicts, lease exclusion/recovery,
  stale-lease rejection, legacy request guards, lead ownership, and confirmation
  constraints requiring a valid Google Meet URL.
- Actual application server credential can select the booking schema and call
  the PostgREST RPC (a random nonexistent reservation correctly returned false).
- On real PostgreSQL the reservation function holds its calendar-scoped advisory
  transaction lock. Separate MCP queries were serialized by the tool, so this was
  not a parallel DB load test. Application concurrent-request unit tests pass.
- Existing 10 conversations and 25 turns have identical before/after row digests.
- Lead/request counts remain zero. All synthetic verification rows rolled back.
- Security advisor: no warnings/errors; only the existing informational notice
  that RLS has no policies. This is intentional for these server-only tables.
  [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Docker could not start a new isolated container due to host resource limits.
No existing containers were changed. The test-only PGlite install lives under
`/private/tmp`, with no website dependency/package-lock changes.

SQL replay can be repeated locally with:

```sh
npm install --prefix /private/tmp/aa-booking-db-validation --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.3.16
BOOKING_PGLITE_MODULE=/private/tmp/aa-booking-db-validation/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-booking-sql.mjs
```

The SQL assertions are in `supabase/tests/consultation_booking.sql`. They contain
only rollback-only database fixtures, no Google calls or real appointments.

## Controlled live booking completed

The owner approved one real appointment for November 16, 2026, 10:00–10:30
America/Costa_Rica. The controlled browser test used the actual React form,
HTTP/service handlers, real Google integration and real Supabase persistence.
The harness rejected any other attendee/time/request reference.

- Final availability check passed before creation.
- Google event, correct attendee and real Meet link verified.
- Real lead/request association and confirmed state verified.
- Double-click and repeated POST created exactly one Google event and booking.
- Google accepted invitation dispatch via `sendUpdates=all`; attendee inbox receipt
  is not independently observable through the organizer Gmail connection.
- The exact test event was cancelled with `sendUpdates=all` and cancellation verified.
- Only the exact generated test lead/request were removed. Lead/request counts
  returned to zero, the slot returned to availability, and existing 10 conversations
  and 25 turns retained their original digests.

Server-only Google credentials were configured in the existing Vercel Production
project using CLI stdin without exposing values. The booking enable flag was set
true only after the successful test and cleanup. Scout's only instruction/content
correction concerns booking availability and the shared interface; model, SDK,
conversation hooks and other business knowledge remain unchanged.

No new appointments should be created during Production smoke testing. Use the
read-only `tests/booking-live.browser.mjs` against the actual Vercel alias. The
applied booking migration remains separate from the unapproved identity migration.
No DNS, Cloudflare or custom-domain changes are part of this release.
