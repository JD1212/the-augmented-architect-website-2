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

## Analytics foundation

Search Console domain ownership and sitemap submission are confirmed by the owner.
The consent-aware GA4 integration uses the approved Measurement ID `G-STBZV24WWN`.
Basic consent mode blocks all optional Google requests before consent. Advertising
remains disabled. Preview/development and identified automated traffic are excluded.

See [analytics and marketing operations](analytics-and-marketing.md) for the current
event taxonomy, privacy boundaries, Google settings, verification steps, known
measurement limitations and phased owner-intelligence architecture. Do not add a
second Google tag or enable automatic history/form/search measurement alongside it.

## Owner-only marketing portal

The Phase 2 implementation adds `/admin/login` and `/admin/marketing` with
request-scoped Supabase SSR Auth, exact owner UUID authorization, mandatory TOTP
MFA/AAL2, tenant membership and live-session validation. Private page and API
boundaries enforce access independently of the cookie-refresh proxy. No admin link
is added to public navigation, and no private page is added to the sitemap.

The scoped marketing migration adds separate owner/reporting/evidence records with
RLS; existing Scout tables and the pending customer-identity proposal are unchanged.
Booking email verification remains separate from owner Auth. Read-only Google
reporting credentials are separate from Calendar/Gmail authorization.

See [owner marketing dashboard](owner-marketing-dashboard.md) for provisioning,
configuration, privacy/security boundaries, tests, current reporting semantics and
the next SEO Analyst design. Owner setup, MFA verification and real provider access
are release gates; missing credentials must not be replaced with fabricated data or
an authentication bypass. No agent, scheduler or publishing workflow is enabled.

## Primary references

- [Search Console verification](https://support.google.com/webmasters/answer/9008080)
- [Google Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [GA4 setup](https://support.google.com/analytics/answer/9304153)
- [GA4 SPA page views](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Google's personal-data restrictions](https://support.google.com/analytics/answer/6366371)
- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
