# Article Performance Reporting

## Owner experience

Measure opens **Articles**. Only currently active, HTTP-verified Production publication pointers are listed. Choose 7, 28 or 90 complete days, then select a title or View details. The in-place, keyboard-accessible panel contains traffic, Search Console trends/queries, engagement, consultation signals and the published revision's approved SEO context. Website-wide Traffic, Google Search and Consultations & Scout remain separate tabs; legacy bookmarks retain their destinations. Demo Mode does not load or fabricate article results.

Zero means no reportable provider observations; it does not mean no visits, searches or real appointments. Dashes distinguish unavailable attribution and articles not yet live in the selected period. Thresholded/truncated results are partial. Missing dates are never filled with invented zeros.

## Sources and boundaries

- `src/lib/marketing/article-performance/identity.ts`: strict business-host/canonical-path matching, timezone and metric availability rules.
- `providers.ts`: existing keyless read-only Google transport, pinned GA4 property `564904776` and Search Console `sc-domain:theaugmentedarchitect.com`. Public host filters exclude Vercel/Preview traffic. Search matching accepts the business's http/https and www/non-www URL variants, optional query strings and trailing slashes, without matching neighbouring slugs.
- `service.ts`: live Production inventory and earliest verified Production publication time, bounded source reads, in-flight deduplication and five-minute process-local caching. Cache keys include tenant, environment, reporting period, property and publication versions. Every request reads current inventory before using cache; withdrawn articles cannot be selected from stale cache.
- `/api/admin/marketing/articles`: verified owner session, server-side UUID and RLS authorization, strict period/article validation, same-origin protections and private/no-store responses. No service key is needed for these owner-authorized reads. Preview can inspect Production performance without creating Preview publication pointers or sharing publishing credentials.
- No schema, RLS, Google permissions, public tracking, booking infrastructure, agent packages, approvals or publication records change. No models, paid research, publishing or autonomous jobs run.

Editorial publication dates can be backdated. Measurement eligibility instead uses the earliest verified Production publication event, converted to the actual GA4 reporting timezone and Pacific Time for Search Console. Updates share the canonical URL; the UI does not infer historical version lift. The shared article window ends at the last completed Pacific day (also complete in this property’s verified America/New_York timezone); website-wide reporting is unchanged, and processed Google reports may lag 24–48 hours or longer.

Requests are bounded to 100 current Production articles, 1,000 verified publication events and 10,000 rows per provider report. Crossing an inventory/history bound fails visibly; source row limits and thresholds are flagged partial. A fresh list uses at most five Google read requests: traffic, article events, Search Console, GA4 metadata and optional booking-origin report. Details reuse those datasets and add at most one Search Console query report. No automatic retry occurs. Up to 12 process-local cache entries per report class are retained; existing site-level `marketing_reports` snapshots are not polluted. No new persistent outcome/baseline history or Performance Analyst agent is implemented in this milestone.

## Consultation attribution and Google setup

Existing collection is reused unchanged:

- `article_engagement`: consented 30-second article engagement event; not a unique-reader or completed-reading metric.
- `article_consultation_start`: consented CTA initiation on the article path.
- `consultation_booked`: emitted only after the existing successful booking response, deduplicated by booking identity. `origin_publication_id` holds the last article consultation origin in that consented tab session, including across navigation. It is not proof of causal attribution or revenue.

**Required only for cross-page confirmed-booking reporting:** In GA4 property 564904776 → Admin → Custom definitions → Create custom dimension, use an event-scoped dimension with event parameter `origin_publication_id`. The adapter reads GA4 metadata first and leaves booking counts unavailable if the dimension is missing. Registration is not retroactive; previously unregistered events cannot be reconstructed. `publication_id` is optional for other custom reports; core article views, engagement and direct starts use paths and require no custom dimension.

The first-party booking ledger has no article identifier. Its article-specific verified-booking count remains **unknown**; no Scout transcript, customer identity, matching date, or overall booking total is used as a substitute. GA4 booking events are labelled separately and are not the complete calendar ledger.

Search Console needs no new property or permission: the existing verified Domain property covers the canonical article paths. Indexing, query anonymization and processing delays are controlled by Google. No configuration changes are made automatically.

## Validation and rollout

Deterministic tests cover URL boundaries, actual first-live timing, provider windows, zero/unknown/partial states, custom-dimension availability, request bounds, context from the published revision, cache/withdrawal handling, tenant and endpoint authorization, and Production/Preview separation. Browser tests use fixture measurements and mocked content actions; real source connections are verified separately in protected Preview. Production stays unchanged until a later explicit release authorization.

Primary API contracts: [GA4 dimensions and metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema), [GA4 metadata](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/getMetadata), [Search Console query/filter semantics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).
