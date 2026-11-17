# Production operations, SEO, analytics, and owner access

## Release workflow

Repository: `JD1212/the-augmented-architect-website-2`. Existing Vercel project:
`the-augmented-architect-website-2` (`prj_mSGGBQyKYm20H8Rl57tjm72qCQHq`).
The existing Git integration deploys `main` to Production; feature-branch pushes
produce Preview deployments in the same project. Do not add a second deployment
pipeline. Keep unrelated local work and review-only SQL proposals out of releases.

1. Make a small, complete change on a feature branch. Run relevant tests, lint,
   `npx tsc --noEmit`, and `npm run build -- --webpack`.
2. Commit only intended files and push the branch. Wait for Vercel Preview Ready;
   verify its Git SHA and test the exact Preview URL with authenticated access.
   Use fixtures for appointment/email mutations. Never weaken Preview protection.
3. After review and validation, merge into `main` without overwriting history and
   push. Verify automatic Production Ready, the exact deployed SHA, and the live
   domain. Report failures; do not release unrelated or unfinished features.
4. Smoke-test public pages, metadata, static assets, Scout and booking controls.
   Do not create real appointments or send invitations as an automated smoke test.

`https://www.theaugmentedarchitect.com` already redirects with 308 to the canonical
`https://theaugmentedarchitect.com`. Keep that existing domain configuration and
use the canonical origin for metadata, structured data, and sitemap entries.

## SEO foundation

Already present: unique public-page metadata, relative canonical/OG paths resolved
against the production origin, an XML sitemap including published articles, robots,
semantic page content, app icons, and permanent `/insights/*` redirects. Articles
are empty until genuine content is supplied; no dates or authors are invented.

Added: a branded 1200 × 630 sharing image using the approved AA mark, large-image
social metadata, Organization/WebSite/Service JSON-LD using actual content,
Preview/development noindex metadata, and optional Search Console verification.
Public pages remain crawlable. `/api/` and `/admin` are excluded from robots crawling;
robots is not access control and does not implement or secure an admin portal.
Preview remains protected by the existing Vercel settings; noindex adds defense
in depth. Crawlers must be able to retrieve a page to read its noindex directive.

### Search Console — owner action required

First check the Google account for an existing verified property; reuse it.
For a DNS-free initial setup, use a URL-prefix property for
`https://theaugmentedarchitect.com/`, select HTML-tag verification, and supply only
the `content` token as `GOOGLE_SITE_VERIFICATION` in Production. The application
already supports that optional variable. No token has been invented or configured.
Release the supplied token, then click Verify in Search Console.

A Domain property covers www/non-www and protocols but requires a DNS TXT record;
that is an owner-managed alternative, not a change performed by this release.
Submit `https://theaugmentedarchitect.com/sitemap.xml`, inspect the homepage and
service pages, check selected canonicals, and review indexing and Core Web Vitals.
Indexing and rankings are not guaranteed by code or a successful deployment.

## Analytics preparation — no tracker enabled yet

No GA4/GTM, Vercel Web Analytics SDK, or client analytics collection was found in
the repository. Google account properties cannot be inferred from source code.
Reuse an existing GA4 account/property and web data stream if available; otherwise
the owner must create one, select the reporting timezone/currency, and provide its
real Measurement ID. Search Console and GA4 are separate services; link their
properties in Google after ownership and permissions are verified.

Before enabling collection, agree the privacy/consent notice, retention, internal
traffic filtering, and permitted geographic behavior. Do not assume a missing
tracking ID is consent. Do not reuse Scout's Calendar/Gmail refresh tokens for
analytics or Search Console reporting. This release installs no analytics service,
transmits no new visitor data, and changes no credentials or environment settings.

The next integration should have one central, consent-aware adapter and an explicit
event/parameter allowlist. Prefer one GA4 collection path, not duplicate GTM and
direct tags. Suggested measurement contract:

| Event | Authoritative trigger | Deduplication / privacy |
| --- | --- | --- |
| `page_view` | Initial load and completed App Router navigation | Choose automatic history measurement OR manual route measurement, never both. Send only approved page paths/titles; strip fragments, arbitrary query strings and sensitive referrers. |
| `consultation_start` | Visitor explicitly enters the booking flow | Once per flow, not every CTA click/reopen; not a confirmed lead. |
| `scout_engaged` | First successfully accepted visitor message | Once per browsing session; exclude automatic greetings and automatic booking-intent messages. |
| `consultation_booked` | Backend confirms the calendar booking succeeded | Canonical booking outcome only, deduplicated by the existing internal idempotency reference; never by both agent text and form submission. Do not send the reference to GA4. |
| `consultation_cancelled` / `consultation_rescheduled` | Verified backend outcome | One event per successful operation; no duplicate events on retry. |

Mark `consultation_booked` as the key conversion after fixture and DebugView tests.
Do not count CTA clicks, prepared proposals, verification, or agent assertions as
completed bookings. Decide how to count existing `scout_leads` separately from
confirmed appointments; the current records are not proof of a distinct contact-form
inquiry funnel. Avoid duplicating conversions with automatic form events.

Never collect names, emails, message text, transcripts, dictated audio, verification
codes, session cookies/tokens, conversation IDs, appointment IDs, Meet links, or
calendar event details in analytics. Keep automatic site-search and form tracking
disabled until their fields and URLs have been reviewed for personal data. Keep
Preview/test traffic out of the Production stream. Validate fresh visits, soft
navigation, refresh, repeated clicks, retries, restored chats, and both booking paths.

Traffic/referrals and funnels belong in GA4; search queries/clicks/impressions and
average position belong in Search Console. Use Search Console Core Web Vitals and
PageSpeed Insights initially; add consent-compatible field performance reporting
only after collection and retention decisions are approved.

## Owner-only `/admin` — design proposal, not implemented

Read-only inspection of the dedicated project `cjldcaiybqguklzqtdjj` confirmed the
four existing migration versions (Scout foundation, limits, booking, scheduling).
All six Scout public tables have forced RLS and no SELECT grants to `anon` or
`authenticated`. The code uses server-only credentials and anonymous session-token
ownership. Booking email verification authorizes scheduling actions; it is not
Supabase owner login. No SSR Auth client, owner role guard, or `/admin` route exists.
The local customer-identity SQL proposal is still unapplied and must stay separate.

Recommended first private phase:

- Manually onboard the owner into existing Supabase Auth; disable public owner
  self-enrollment. Require MFA. Confirm owner UUID and recovery before rollout.
- Use supported request-scoped Supabase SSR Auth. Verify tokens server-side with
  `getClaims`/`getUser` as appropriate; never authorize from `getSession` payloads,
  email matches, visitor cookies, query parameters, or editable `user_metadata`.
- Authorize the immutable owner user UUID against a server-controlled allowlist
  (or later a locked-down owner-membership table), and require verified MFA/AAL2.
  Recheck authorization in every private page, API and server action, not only in
  middleware or client navigation. Reject before any privileged query runs.
- Keep existing Scout RLS restrictions. Use narrowly scoped, server-only reads
  only after the owner check. Do not grant all authenticated users access to Scout
  data or expose service credentials in the browser. Review a separate migration
  only if membership/storage is needed; do not reuse the pending customer proposal.
- No public signup, no cached private responses (`private, no-store`), no shared
  Cache Components entries containing owner data, no indexing, no broad CORS.
  Same-origin/CSRF protections, audit logs without secrets, pagination, masked
  sensitive details, least-privilege Google reporting scopes and revocation tests.
- Start read-only with aggregated bookings/leads and small GA4/Search Console
  reports after account access exists. Deny anonymous, non-owner, expired,
  revoked and insufficient-MFA sessions in tests. Customer account functionality
  and Scout's current conversation lifecycle remain separate.

No owner portal, login, new schema, reporting credentials, or analytics collection
is enabled by this SEO release.

## Primary references

- [Search Console verification](https://support.google.com/webmasters/answer/9008080)
- [Google Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [GA4 setup](https://support.google.com/analytics/answer/9304153)
- [GA4 SPA page views](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Google's personal-data restrictions](https://support.google.com/analytics/answer/6366371)
- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
