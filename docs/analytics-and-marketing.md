# Consented analytics and future marketing intelligence

## Current integration

Approved Measurement ID: `G-STBZV24WWN`. This is public configuration, not a
credential. `NEXT_PUBLIC_GA_MEASUREMENT_ID` can override it at build time. Root
layout enables collection only for `VERCEL_ENV=production`; development and Preview
remain excluded. No new package or Google Tag Manager container is installed.

The supported Next.js `Script` component loads `gtag.js` once, only after explicit
analytics consent. Consent Mode v2 queues all four optional categories as denied
before updating analytics storage to granted. Advertising storage, advertising
user data and personalization remain denied. Google signals and ad personalization
are disabled. This is **basic** consent mode: no Google script, analytics events,
or cookieless analytics pings before consent or while declined.

Consent preferences are stored locally for up to 180 days. Unknown, malformed or
expired values are treated as no consent. The footer opens preferences; withdrawal
sets the GA disable flag, clears accessible GA cookies and optional dedupe state,
and reloads to unload the tag. Other tabs observe withdrawal. Scout and booking
remain usable without analytics. GPC, Do Not Track and `navigator.webdriver` block
collection. These measures reduce automated traffic; they do not identify every bot.

Only predefined public paths and titles can be sent. Add newly approved public pages to the explicit allowlist when publishing them. Query strings, fragments and
unknown/private paths are excluded; referrers use known public paths or origin only.
Do not enable automatic form, site-search, outbound-click or history measurement.
The owner confirmed Enhanced measurement was turned off for this stream. Manual
App Router pathname measurement is the only page-view path; `send_page_view=false`
prevents the initial Google config from adding another view. Check this setting
again if the Google stream configuration changes.

## Event taxonomy (version 1)

| Event | Meaning | Deduplication | Parameters beyond sanitized page context |
| --- | --- | --- | --- |
| `page_view` | Initial consented public-page view, soft navigation or refresh | One per pathname transition; refresh is a new view, query/hash-only changes are not | None |
| `scout_open` | First explicit launcher/consultation action that opens Scout | Once per consented tab session; automatic welcome excluded | None |
| `consultation_start` | Visitor explicitly enters consultation or trial setup through an existing CTA/form or secure confirmation | Once per consented tab session, not every reopen | None |
| `service_engagement` | Ten continuous foreground seconds on a service page | Once per service per consented tab session; timer restarts after backgrounding | `service` enum, `threshold_seconds=10` |
| `consultation_booked` | Existing backend reports an observed submission as confirmed | Existing submission UUID used **only locally** to dedupe; never sent to GA4 | `booking_channel=scout\|form` |

GA4 may also generate standard session/engagement events after consent. Do not add
another event sender for them. Mark only `consultation_booked` as a key event in
GA4 after verification; starts, opens and prepared proposals are not conversions.
No contact-submission event exists because the current Contact page has no
submitting contact form. Cancellation/rescheduling are not new conversions.

The manual form observes its existing `status=confirmed` response. Scout observes
its existing authenticated scheduling snapshot: `action=book`, `state=done`, and
`result.status=confirmed`. Only submissions explicitly armed during a consented
interaction qualify. Historical restored proposals, approvals, pending responses,
failures, rerenders and repeated retries do not create conversions. Local pending
references survive refresh to recover an in-progress submission; completed refs
dedupe within the same tab. No transcript parsing or scheduling logic changes.

Limitations: consent, browser closures, ad blockers and cross-device visits mean
browser analytics will not match every database booking. This is not a financial
ledger or server-wide exactly-once counter. The first-party booking database remains
authoritative; a future owner dashboard should report both totals distinctly.

Never send message content, names, emails, phone numbers, audio, codes, conversation
IDs, proposal/booking IDs, appointment times, Meet URLs or calendar event data to GA4.
Event functions accept no free-form visitor data. No sensitive data is placed in
`dataLayer`. Analytics failures cannot interrupt bookings.

## Verification and Google account actions

- Search Console domain ownership and the sitemap were confirmed by the owner.
  The sitemap now also includes `/privacy`, so it has one additional public URL.
- Enhanced measurement must stay off; do not add a second Google tag/GTM container.
- Confirm GA4 retention, internal traffic filters, reporting timezone and appropriate
  data-sharing settings. Keep Google signals, ads links and remarketing off.
- Mark `consultation_booked` as a key event. Optional custom dimensions are
  `booking_channel` and `service`; this does not require collecting visitor identity.
- Consent banner and `/privacy` disclose actual collection and essential services.
  The owner should confirm the broader privacy policy, provider/retention details
  and a direct privacy-request contact channel before expanding data collection.
- Realtime: open the live site in a normal browser, allow analytics, navigate from
  AI Solutions to Salesforce, and watch the page-view/service events. For DebugView,
  set `localStorage.setItem('aa.analytics.debug','1')` in your own browser console
  and refresh; remove that key afterward. This switch never bypasses consent.
- Automated positive tests stub Google requests and suppress all appointment/email
  effects. A separately authorized real debug visit sends only page/engagement
  events. Collector success proves delivery to Google's endpoint, not report ingestion;
  verify Realtime/DebugView in the owner's account. No reporting credentials were
  provided to this application, and Google reporting visibility cannot be invented.

## Owner intelligence roadmap

The private owner dashboard, MFA/authorization boundary, read-only provider adapters
and durable evidence schema are now implemented. Owner provisioning and dedicated
Google reporting permissions must be configured and verified before release. See
[Owner marketing dashboard](owner-marketing-dashboard.md) for exact setup, security
boundaries, reporting semantics and the remaining SEO Analyst integration design.
The scheduled analysis, agents and publishing workflow below remain future work.

**Access boundary:** reuse the dedicated website Supabase project and the previous
owner-portal plan: verified owner UUID, server-side authorization on every operation,
MFA/AAL2, no public enrollment, private/no-store responses and no browser secrets.
Do not apply the pending customer-auth proposal as part of analytics work.

**Provider adapters:** separate small server-only adapters for GA4 Data API,
Search Console API and first-party booking/engagement aggregates. Use restricted
reporting credentials/scopes (`analytics.readonly`, `webmasters.readonly`) with
explicit property access. Do not reuse Calendar/Gmail tokens or give analysis tools
scheduling permissions. Browser tags do not grant access to reporting APIs.

**Data layer:** fetch daily aggregates by date, landing-page path, source/medium and
service. Cache bounded summaries in PostgreSQL with source, query window, extraction
time and completeness markers; avoid duplicating raw transcripts or personal data.
Keep consented GA4 funnels distinct from first-party confirmed-booking totals.
Add purpose-specific first-party engagement counters only after a separate privacy
review; never repurpose conversation content as a marketing dataset by default.

**Jobs and cost:** begin with one daily Vercel scheduled task, incremental fetches,
quota-aware backoff and database job idempotency. Refresh the private UI from cached
aggregates rather than running provider reports on every visit. Use existing Vercel
and Supabase resources first; no additional queue, warehouse or paid service is
needed until volume justifies it. Model calls have explicit budgets and bounded
aggregate inputs. Review actual plan limits before enabling schedules.

**Analysis:** derive landing-page/search/booking trends before invoking AI. Every
recommendation carries source reports, date range, sample size and extraction time.
Clearly distinguish observed changes from hypotheses, seasonality and insufficient
data. Anomaly alerts require thresholds, cooldowns and owner preferences. No claims
of causation or guaranteed rankings from correlations or small samples.

**Approval workflow:** keep recommendations and content drafts separate from
published content. Version drafts with evidence, owner approval and an audit log;
publish through a reviewed website release. Content publication, outreach, ad spend,
email campaigns and external actions always require explicit approval. Analysis
agents are read-only and receive no publishing or booking-mutation credentials.

**Delivery order:** (1) consented tracking and validated key events, (2) owner-only
read-only dashboard and reporting adapters, (3) scheduled data-backed recommendations
and alerts, (4) reviewed content workflow. A future client offering needs explicit
tenant isolation, separate property permissions and tenant-scoped data/access
tests; do not retrofit multiple clients into this website's owner-only credentials.

## Primary references

- [Google basic Consent Mode v2](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)
- [Manual GA4 page views](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [Next.js Script](https://nextjs.org/docs/app/api-reference/components/script)
- [Google personal-data restrictions](https://support.google.com/analytics/answer/6366371)
