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
   GOOGLE_MARKETING_PROJECT_NUMBER=68454656491
   GOOGLE_MARKETING_POOL_ID=augarch-marketing
   GOOGLE_MARKETING_PROVIDER_ID=vercel
   GOOGLE_MARKETING_SERVICE_ACCOUNT_EMAIL=marketing-intelligence-reader@the-augmented-architect-web.iam.gserviceaccount.com
   ```

   Existing `SUPABASE_SECRET_KEY`, Calendar/Gmail and Scout settings remain unchanged.
   No new variable has a `NEXT_PUBLIC_` prefix. The browser needs no Google key.
4. Ensure Supabase TOTP enrollment and verification are enabled. Sign in at
   `/admin/login`, scan the QR in an authenticator app, and enter its current
   six-digit code. Each new password session must pass MFA. Keep your authenticator
   recovery plan with the verified project administrator; this release adds no
   unauthenticated reset mechanism.

## Keyless Google reporting identity

Organization policy `iam.managed.disableServiceAccountKeyCreation` remains enforced.
No service-account private key, JSON credential, ADC user credential or permanent
Google refresh token is used by reporting. Calendar/Gmail authorization is unchanged.

Existing account:
`marketing-intelligence-reader@the-augmented-architect-web.iam.gserviceaccount.com`.
Cloud project: `the-augmented-architect-web`; project number: `68454656491`.
The owner confirmed Analytics Data API/Search Console API enablement, GA4 Viewer
access to property **564904776**, and Restricted access to
**sc-domain:theaugmentedarchitect.com**. The remaining trust is Workload Identity
Federation plus service-account impersonation.

### Exact Google Cloud setup

Review and run [setup-marketing-federation.sh](../scripts/setup-marketing-federation.sh)
in Google Cloud Shell. It pins the existing project/account, enables IAM Credentials
and STS APIs, creates only pool `augarch-marketing` and provider `vercel`, and binds
`roles/iam.workloadIdentityUser` on the existing service account. It never changes
an organization policy, creates a private key, grants project-wide roles or enables
domain-wide delegation. If the pool already exists, it stops for inspection.
The operator needs pool-management and service-account IAM-binding permissions;
do not broaden the application's role to perform setup.

Equivalent console settings (IAM & Admin → Workload Identity Federation):

| Field | Exact value |
| --- | --- |
| Pool ID | `augarch-marketing` |
| Provider ID / type | `vercel` / OpenID Connect |
| Issuer | `https://oidc.vercel.com/jd-burkholders-projects` |
| Allowed audience | `https://vercel.com/jd-burkholders-projects` |
| Subject mapping | `google.subject=assertion.sub` |
| Additional mappings | `attribute.owner_id=assertion.owner_id`, `attribute.project_id=assertion.project_id`, `attribute.environment=assertion.environment` |

Provider attribute condition:

```text
assertion.owner_id == 'team_gIBiazQzKNJ8DmNLOuAfpecs' &&
assertion.project_id == 'prj_mSGGBQyKYm20H8Rl57tjm72qCQHq' &&
assertion.environment in ['production','preview','development']
```

Add **Workload Identity User** on this service account only for these exact members:

```text
principal://iam.googleapis.com/projects/68454656491/locations/global/workloadIdentityPools/augarch-marketing/subject/owner:jd-burkholders-projects:project:the-augmented-architect-website-2:environment:production
principal://iam.googleapis.com/projects/68454656491/locations/global/workloadIdentityPools/augarch-marketing/subject/owner:jd-burkholders-projects:project:the-augmented-architect-website-2:environment:preview
principal://iam.googleapis.com/projects/68454656491/locations/global/workloadIdentityPools/augarch-marketing/subject/owner:jd-burkholders-projects:project:the-augmented-architect-website-2:environment:development
```

Do not trust the whole pool/team or wildcard project names. The provider condition
pins immutable project/team IDs; exact subject bindings additionally pin the project
name and approved environments. Only reviewed code should execute with this project's
Preview identity. Vercel deployment protection protects browser access, not malicious
code running inside an approved deployment. No project issuer setting needs changing:
the existing local token was inspected and already uses the required team issuer.

### Runtime and local development

The official `@vercel/oidc` helper supplies the current Vercel identity. Google's
`ExternalAccountClient` exchanges it at STS, then impersonates the existing reader
for a **15-minute** Google token with only `analytics.readonly` and
`webmasters.readonly`. The Google client refreshes expiring access tokens; subject
tokens are read on demand, never copied into application state or logged. Google
validates signatures, issuer, audience and provider conditions. Local decoding in
the refresh helper is only a configuration sanity check, not authorization.

In Vercel Preview/Production, the helper uses the platform request context. Do not
manually set `VERCEL_OIDC_TOKEN` or a token-file path there. Configure only the four
non-secret Google metadata variables above, plus the existing owner Auth variables.

Locally, run:

```sh
node scripts/refresh-marketing-oidc.mjs
```

This uses the existing Vercel CLI login and verified website project link to obtain
a short-lived **development** identity. It extracts just the token into ignored
`.vercel/marketing-oidc-token` with mode 0600, deletes its temporary environment
snapshot, and does not overwrite `.env.local` or print token values. Local-only
`.env.local` should contain `VERCEL_OIDC_TOKEN_FILE` set to the absolute path of
that file. SDK 4 rereads the file for each subject-token refresh, so rotation does
not require restarting the server. If it expires, rerun the helper. No `gcloud`
installation, long-lived Google key or user ADC file is needed locally.

Read-only readiness check after Google trust is configured:

```sh
MARKETING_REPORTING_LIVE=1 node --env-file=.env.local tests/marketing-reporting.live.mjs
```

It queries both actual providers and reports connection/row counts without dumping
queries, credentials or private error bodies. Verify both connections before Preview
and Production release. Missing configuration, denied access, quotas and genuine
empty reports remain explicit states. `G-STBZV24WWN` is the collection Measurement
ID, not the numeric reporting Property ID. No fallback to private-key JSON exists.

## Verified setup

On November 17, 2026, the owner completed the scoped Cloud Shell federation setup.
The local short-lived Vercel identity successfully queried both real reporting
APIs through the shared server adapters. The owner also completed actual TOTP
enrollment and opened the local dashboard; two genuine provider snapshots were
persisted through the owner-authorized database client. The completed-day window
2026-10-20 through 2026-11-16 returned no rows from either source. This is a valid
empty report, not a fallback or evidence that today's Realtime events were lost.

The existing Vercel project has the owner UUID, publishable Auth key, numeric GA4
property and four non-secret federation settings prepared for Preview/Production.
No permanent Google credential or manual OIDC token is stored in Vercel. Runtime
Preview and Production verification must use those environments' own identities;
successful local development exchange alone is not proof of deployed access.

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
[Vercel GCP federation](https://vercel.com/docs/oidc/gcp),
[Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).
