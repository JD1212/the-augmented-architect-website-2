# Direct owner-approved article publishing

## Scope and owner workflow

Review the Content Strategist draft → Save edits as an immutable revision → Approve the exact website revision → select publication date → explicitly confirm destination → Publish website article → server verifies the rendered article, listing and sitemap → Live.

The primary control is **Website publication**, directly below exact-revision approval. No JSON download, source import, model call, Git commit or Vercel deployment is needed for an article. Git/Vercel still deploy application code. LinkedIn remains separately approved and manually posted; Preview publication cannot unlock a Production article link for LinkedIn.

This first release enables writes only in the protected `feature/content-strategist` Preview. `ARTICLE_PUBLISHING_ENABLED` is branch-scoped. Production has no enabled publishing flag and has not been deployed. Reading and writing are scoped by tenant plus environment; Preview scope includes a branch hash. Development, other Preview branches and Production cannot inherit this branch's publication state.

## Reused infrastructure

- `marketing_artifacts` retains drafts, approvals, publication state, attempts and verified history. No new tables or CMS.
- `publication-contract.ts`: strict public DTO, content hash, environment identity and default-off write gate.
- `publication-state.ts`: authorized owner status and history.
- `direct-publishing.ts`: owner/session checks, current research and website approvals, exact revision/hash validation, stable slug/date, transactional transitions, cache invalidation and HTTP verification.
- `published-articles.ts`: narrow server-only published reader; queries only publication pointers for this tenant/environment. It never reads draft/research records for public rendering.
- Existing Insights renderer, metadata helpers and Article JSON-LD are retained. The sitemap and article analytics use the same publication projection. Other public pages retain static behavior.
- `PublicationControls`: explicit Publish / Publish approved update / Unpublish actions, pending-verification recovery, destination, status, public link and expandable history.

## Database and security

Applied migration: `20261125003457_website_article_publishing.sql` (local filename matches recorded remote migration version).

The new `marketing_article_transition(jsonb)` function is SECURITY INVOKER and executable only by service_role. PUBLIC, anon and authenticated have no EXECUTE grant. The website must authorize a live owner session before calling it and again before completion. The function also checks active owner membership.

No RLS policies or existing table grants were changed. All marketing records remain private. The public server reader uses existing server-only credentials and returns an allowlisted article DTO: text, approved public metadata, citations and a public publication ID. It strips internal revision/opportunity IDs, inputs, evidence snapshots, owner identifiers and unknown fields. Unknown block fields or unsafe links fail closed. No credentials reach browser bundles.

The migration uses per-tenant/environment/slug transaction locks, an expected pointer version, and unique request IDs. Begin/complete operations are atomic. Duplicate requests return the existing terminal result; conflicting or stale actions are rejected. Slugs cannot be reassigned to a different opportunity. A no-op publication of an already-live identical revision does not create another publication event.

## Verification and failures

The server constructs the snapshot from the saved approved revision, not a browser-supplied article. The pointer initially says Verifying. Only the approved candidate can be served during verification. No Live event exists yet.

Verification fetches only a server-configured origin, never a visitor-supplied URL. Redirects are not followed. Preview uses the deployment's short-lived OIDC token, attached only to its own origin. Three bounded GETs check:

1. Canonical article: HTTP 200, expected public version, title and canonical URL.
2. Insights listing: HTTP 200 and the article link.
3. Sitemap: HTTP 200 and the canonical article URL.

A successful transaction saves the HTTP receipt, exact revision/hash and approval, source provenance, chosen editorial date, actual verification timestamp, and environment. Failure restores the previous pointer and invalidates caches; no new Live event is recorded. If a function stops while Verifying, the owner can resume verification using the same request ID. A completed failed attempt is retained; another explicit Publish action gets a new request ID.

Updates require a newly approved exact revision, preserve slug and original date, and record actual modification time. Unpublish requires a separate confirmed action. The article must return 404/410, or the documented Next.js streamed 200 not-found response (no rendered article, a robots noindex meta tag, and the Next.js 404 marker), and disappear from listing/sitemap before withdrawal is verified. A withdrawal marker suppresses any file-backed fallback. History and citations remain preserved privately.

Cache tags include environment; article/list/sitemap caches are expired explicitly. Withdrawal uses immediate expiration, not stale-while-revalidate. Existing static public pages and global navigation design remain unchanged.

## Approved first article

- Revision: `5757e82a-a9d5-41d5-a42a-c1b6270f9fcd`.
- Hash: `54daaa823a49ee60954a38156cc3da6cb4d0b067cbce50a8e732996b7f33945c`.
- Website approval: `737a9fa5-ec81-4621-af72-d429889ba0d4`.
- Date: November 24, 2026.
- Slug: `connecting-ai-agents-to-business-systems-control-checklist`.

The test snapshot is generated from this saved revision. It does not regenerate or rewrite article blocks, citations, summary or SEO fields. Its public publication ID is stable across updates; private revision identity remains in the publication history.

## Verification commands and boundaries

- `node --test tests/*.test.mjs`
- `npm run lint`
- `npx tsc --noEmit` after the build
- `npm run build -- --webpack` locally; Vercel also verifies its normal build.
- `tests/content-studio.browser.mjs`: temporary authenticated QA login, actual protected-route checks, mocked drafting/publication actions, desktop/mobile; QA account removed afterward.
- `tests/direct-publishing.database.mjs`: reads the approved first revision and prepares rollback-only SQL regression. Review/execute that SQL through the scoped database tool; no publication or model call is made by the generator. It tests real transactions, idempotency, stale requests, withdrawal, failure rollback and RPC grants, then rolls back all fixture changes.
- `tests/insights.browser.mjs`: responsive article rendering and mocked Scout CTA. No real appointments or emails.

Production authorization is separate from website revision approval. Do not merge main, enable a Production flag, or publish Production content during Preview validation. Supabase migrations are additive in the existing shared website database; all test publication records must have a Preview scope. Preserve existing registrations, history, Scout, booking, DNS and unrelated local work.

## Failed first Preview test: retained evidence and diagnostics

Request `6deb31d3-6722-4423-87f6-f941a83d9784` failed verification between 2026-11-25T01:20:30.115953Z and 01:20:30.260159Z. There was no previous pointer, the candidate was restored inactive, and no Live publication event exists. The exact failed check was not retained by that deployment; its generic error cannot establish whether configuration, protection, transport or content failed. Do not report the original root cause as confirmed without another observation. The candidate was eligible for serving during the approximately 145 ms verification window; no evidence establishes that a visitor retrieved it.

The follow-up migration `20261125150841_website_publication_streamed_withdrawal.sql` preserves sanitized verification diagnostics in future failed operations and handles strict streamed withdrawals. No existing attempt is rewritten, and no RLS policy, public grant or Production publication state changes. Future diagnostics identify stage, rule, failed checks, HTTP statuses and Vercel request IDs, never bodies or credentials.

The owner-only **Verification diagnostics → Check verification setup (read only)** control is available only on this Preview branch. It checks the trusted deployment origin and requests only `/robots.txt`, comparing the previous environment-token path with the current short-lived OIDC SDK path. It neither publishes nor retries, approves, or writes database records. Use it before separately authorizing another publication test. Global metadata streaming and public-site design remain unchanged.
