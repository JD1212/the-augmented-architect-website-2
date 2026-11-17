# Private owner marketing intelligence

## Scope and security

The private entry is `/admin/login`; reports are at `/admin/marketing`. Neither is
linked in public navigation or the sitemap. Admin metadata and responses are
noindex; authenticated responses are private/no-store. Search exclusion is not an
access-control mechanism.

Authentication uses the existing dedicated Supabase project
`cjldcaiybqguklzqtdjj`, its publishable key, the official SSR adapter, and separate
`aa-owner-auth` HttpOnly, Secure (production), SameSite=Lax cookies. No Auth tokens
are returned to browser JavaScript or stored in localStorage. The `/admin` proxy
refreshes cookies, but authorization is enforced again at the page and API data
boundaries. Cookie-authenticated mutations require same-origin JSON requests.
Supabase Auth applies its password/MFA endpoint rate limits. Passwords and TOTP
codes are not logged or persisted in application state/storage. Owner registration,
password recovery and MFA recovery remain verified project-administrator operations;
there is no public signup or privilege-management endpoint.

Every reporting request requires all of:

1. A verified, non-anonymous `auth.getUser()` identity with confirmed email.
2. Its exact UUID in server-only `MARKETING_OWNER_IDS`.
3. A validated AAL2 access token after authenticator-app MFA.
4. Active owner membership in the website's marketing tenant.
5. A live, unexpired Auth session, checked in the database against `session_id`.

RLS applies to all seven marketing tables. Tenant membership is provisioned by the
project administrator, never from email matching, editable metadata or browser
input. An AAL1 owner may enroll/challenge an authenticator but cannot read reports.
Revoking the database membership immediately denies further report reads, including
direct Data API access. For account removal, deactivate membership, remove the UUID
from environment allowlists, and revoke the Auth sessions. Existing downloaded data
cannot be recalled. Never reuse the service-role key in a browser client.

## One-time owner setup

1. In this project's Supabase Authentication → Users, create
   `jd@theaugmentedarchitect.com` with a strong private password and confirmed email.
   Capture its UUID, not an email-derived identifier. Do not share the password.
2. After migration `20261117223824_marketing_intelligence.sql`, insert that UUID:

   ```sql
   insert into public.marketing_memberships(tenant_id,user_id)
   values ('b329164a-f981-4acc-befc-2f0c70f8af10','REPLACE_WITH_CONFIRMED_OWNER_UUID');
   ```

3. Set server-only configuration in ignored `.env.local` and the existing Vercel
   project's Preview and Production environments:

   ```text
   SUPABASE_URL=<existing dedicated website URL>
   SUPABASE_PUBLISHABLE_KEY=<this project's active publishable key>
   MARKETING_OWNER_IDS=<the confirmed UUID, comma-separated if explicitly approved>
   GA4_PROPERTY_ID=564904776
   GOOGLE_MARKETING_SERVICE_ACCOUNT_JSON=<dedicated service-account JSON>
   ```

   Existing `SUPABASE_SECRET_KEY`, Calendar/Gmail and Scout settings remain unchanged.
   No new variable has a `NEXT_PUBLIC_` prefix. The browser needs no Google key.
4. Ensure Supabase TOTP enrollment and verification are enabled. Sign in at
   `/admin/login`, scan the QR in an authenticator app, and enter its current
   six-digit code. Each new password session must pass MFA. Keep your authenticator
   recovery plan with the verified project administrator; this release adds no
   unauthenticated reset mechanism.

## Dedicated Google reporting identity

Use a new Google service account, separate from the working scheduling OAuth
identity. Enable **Google Analytics Data API** and **Google Search Console API** in
its Cloud project. No project-wide editor/owner role, Calendar/Gmail scope or
domain-wide delegation is required.

- In GA4 property **564904776**, add the service-account email as **Viewer**.
- In Search Console Domain property **sc-domain:theaugmentedarchitect.com**, add
  that email as a **Restricted user** with performance-data access.
- Save the service-account JSON in `GOOGLE_MARKETING_SERVICE_ACCOUNT_JSON` only
  in ignored local/Vercel server configuration. Do not paste it into chat, commits,
  build artifacts or client variables. Rotate/remove the key through Google Cloud
  if compromised. A future keyless federation adapter can replace this credential
  provider without changing reports or the dashboard.
- Code requests only `analytics.readonly` and `webmasters.readonly`; the existing
  scheduling authorization is neither read nor expanded.
- `G-STBZV24WWN` remains the collection Measurement ID; it is not a reporting
  Property ID. Search Console uses the Domain property, not an HTTPS URL prefix.

The server calls official `properties.runReport` and `searchAnalytics.query`
endpoints through Google's supported authentication library. Missing configuration,
denied permissions, API failures, quota limits and empty data have distinct safe UI
states. Raw provider errors, credentials and visitor details are never exposed.

## Reporting semantics

Ranges are 7, 28 or 90 complete date labels, ending yesterday UTC. GA4 interprets
those labels in the property's reporting timezone; Search Console uses Pacific
Time and final data may lag several days. Totals and trends are not Realtime.

GA4 reports active users, sessions, page views, source/channel acquisition, landing
sessions, service-engagement events, Scout opens, consultation starts and confirmed
booking events from the approved taxonomy. Active users are distinct for each
reported period; daily users are not added into a period total. Bookings are
consented browser outcomes, not a replacement for the first-party booking ledger.
No Scout transcript or customer record is imported into marketing reports.

Search Console reports clicks, impressions, CTR, average position, top queries,
pages and daily trends. Queries can be anonymized; property aggregates can differ
from the sum of available rows. Each source query is bounded to 1,000 rows, and
tables display the first 25 with limit notices. Query strings/fragments and www
variants normalize to the same path. GA4 sessions are summed across path variants;
Search CTR is recomputed and position impression-weighted. Cross-source metrics
remain separate. The UI never converts Search clicks into sessions or assumes a
change caused another change. Missing daily rows are not fabricated as zero.

Successful reports are saved as tenant-scoped, timestamped snapshots and reused
for five minutes. Refresh respects this cache. Each snapshot retains source,
property, exact date range, extraction time, provider caveats and aggregate data.
No scheduled job or paid service was added. Retention/pruning should be selected
before introducing scheduled daily snapshots; this first phase stores on-demand
reports. Database snapshots are insert-only for authenticated owners. Agent,
recommendation, approval and publishing writes are not exposed to the browser.

## Durable intelligence model and SEO Analyst next phase

- `marketing_tenants`, `marketing_memberships`: one website workspace now, explicit
  tenant boundaries and owner identities for future isolation.
- `marketing_reports`: immutable, versionable evidence snapshots and measurements.
- `marketing_agents`: versioned definitions/configuration, disabled by default.
- `marketing_executions`: run state, timestamps, usage and sanitized diagnostics.
- `marketing_artifacts`: append-only opportunities, recommendations, drafts,
  approvals, published changes, measurements and outcomes; parent links preserve
  revisions and comparisons. Approval artifacts require a human actor UUID.
- `marketing_evidence`: tenant-enforced links from artifacts to actual reports,
  with observations and extraction context. Composite foreign keys prevent
  cross-tenant linking.

The next implementation is **one SEO Analyst**, using the installed TypeScript
OpenAI Agents SDK. Do not reuse Scout's conversational runtime or grant the analyst
scheduling tools. Its server-owned tenant scope must never come from model input.

1. Extract a narrowly scoped report-reader interface from the same provider/cache
   services, with owner-authorized invocations and a tenant-scoped execution record.
2. Register read-only tools for Search performance, GA4 landing metrics and approved
   page content. Bound date ranges/row counts and attach snapshot IDs to tool output.
3. Add a restricted persistence tool that appends recommendations and evidence,
   never edits a website, sends email or publishes content. Create execution and
   artifact write policies/service boundaries only in that reviewed phase.
4. Require structured output: observation vs hypothesis, source snapshot IDs,
   comparison windows, sample size, confidence/limitations, proposed change and
   expected measurement. Insufficient data must produce a clear abstention.
5. Show the recommendation to the MFA-authenticated owner. Approval records must
   be immutable, version-specific and created only after an explicit human action.
6. Implement publication separately through the reviewed Git Preview/Production
   workflow. Record the approved version, release commit and effective date.
7. Compare subsequent reports against prior evidence, accounting for date ranges,
   seasonality and small samples. Report correlation without claiming causation.
8. Add bounded execution cost/time budgets, retries/idempotency, sanitized logs and
   evidence/failure tests before enabling a schedule. No autonomous publication.

No analyst, content generator, publishing endpoint, cron or approval UI is shipped
in this dashboard release.

## Verification and release

Run lint, TypeScript, unit tests, the production build, marketing browser tests and
existing public-site/Scout/analytics regression suites. `tests/marketing-rls.sql`
tests actual database permissions in a transaction and rolls back all Auth/report
fixtures. Live Auth tests use temporary, confirmed `example.invalid` accounts with
random passwords and TOTP, never owner credentials, email invitations or bookings.

Release remains feature branch → tests → authenticated Preview → verified main
commit → automatic Vercel Production → live checks. Do not release a portal until
the real owner is provisioned, MFA is tested, and Preview/Production credentials
are configured. If credentials or account setup are pending, keep Production on
its current approved commit and report the blocker rather than adding a bypass.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp),
[GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport),
[Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).
