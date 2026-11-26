# Release preparation — Marketing Intelligence + Our Approach

Status: protected Preview only; Production promotion requires explicit owner approval.

## Release contents

Branch: `feature/owner-workspace-consolidation`. GitHub Production `main` is `4b35f75dfc88ca201e63db6eb49f13129e12741b` and is an ancestor of this branch. The candidate consolidates `eccac8e` (article performance), `45b796c`, `a096559`, `94b7846`, `905c546` and `abb550a`, plus the focused Our Approach change in this release commit. No Production-only changes need overwriting or conflict resolution.

- Marketing Intelligence retains the existing Overview, Discover, Create, Publish and Measure, including the latest read-only-first research/editorial corrections. No further workspace design changes are included.
- Our Approach opens Philosophy directly. Existing editorial content and styling are reused; three horizontal accessible tabs change content in place. Fragment selections and browser history work without a document reload.
- `/our-approach/philosophy`, `/our-approach/ai-architecture` and `/our-approach/salesforce` remain valid server-rendered pages with their original canonical metadata. Their links are retained as tab fallbacks; JavaScript enhances selection in place. No redirects, sitemap changes or URL removals are needed.
- Insights renderer, public reader, article records, approvals, metadata, sitemap, analytics and How We Work are unchanged. There are no schema, credential, agent-registration or infrastructure changes.

## Working and preserved

- Independent SEO Analyst **0.5.1** and Content Strategist **0.1.3**: source repositories remain separate; pinned tarballs, lockfile and installed files pass SHA-512 integrity verification.
- Owner authorization and tenant-scoped reads remain enforced. Authenticated local browser checks read real opportunity, workflow, article inventory and activity records through the existing RLS path; workflow decision states use fixtures. They create/remove only a temporary QA login/membership, never business decisions or publication records.
- Read-only database verification finds saved provider research, the saved research plan, immutable drafts, owner imports, approvals and publication history. Both active Production pointers still match their approved revision hashes.
- Public article checks verify HTTP 200, canonical URLs, listing/sitemap inclusion, server-rendered content, metadata and one consultation CTA per article. The governance guide has three structured sources; Red Queen retains its five original Markdown references. Different reference markup is not missing content.
- Existing DataForSEO adapters, evidence eligibility, Google reporting adapters, provider errors, URL normalization, tenant separation, publication guards and content handoff are covered by deterministic tests.
- Article-performance browser checks open the detail panel and refetch a selected article for a new period. Fixture metrics are test data, not live Google observations.

## Disabled, configuration-dependent or not live-tested

- `SEO_RESEARCH_PLANNING_ENABLED` is absent/default-off. No new planning execution is enabled.
- `DATAFORSEO_RESEARCH_ENABLED` is false on the SEO Preview branch and absent/default-off elsewhere. API credentials remain scoped to `feature/seo-analyst-v1`. No paid requests were made. One purchased research record remains saved; availability does not establish freshness, provider-account eligibility or consumption by a new run.
- Content Strategist execution is disabled. Its existing server guard additionally restricts live execution to the separately authorized `feature/content-strategist` Preview branch. No model execution was tested or enabled for this release. Existing manually triggered SEO analysis is preserved, not invoked.
- Production's existing `ARTICLE_PUBLISHING_ENABLED=true` is preserved. Publishing still requires exact-revision approval and an explicit owner action. Current release Preview has no publishing enablement or branch-specific writer/model credentials; no publication is attempted.
- Google source connectivity was verified by the owner previously. Positive authenticated reporting on the new Preview remains a separate owner check; mocked article measurements do not prove live GA4/GSC query success or nonzero results.
- Cross-page booking-event attribution requires the event-scoped GA4 custom dimension `origin_publication_id`. Current configuration has not been independently verified in GA4 Admin. Missing metadata is reported unavailable. First-party calendar-ledger article attribution remains unknown; there is no inferred revenue, causal lift or Phase 4 persistent measurement implementation.
- Autonomous execution, publishing, campaigns and AI Visibility work are not enabled or added.

## Validation and release boundary

Local checks: 376 unit tests passed, two explicitly gated live-model tests skipped; TypeScript, lint, production webpack build and package integrity passed. Chromium checks: 45 Our Approach cases at 1440/800/390/320 pixels, and 62 authenticated workspace cases. Both actual public articles also opened in the workspace browser run. No real-device Safari verification is claimed.

Required final private Preview review: normal owner login, Google source retrieval, saved evidence, Discover/Create/Publish read-only flow and Measure article details. No approvals, saves, model runs, purchases or publication actions. Deployment protection and unauthenticated API denial are independently checked. Do not mark the signed-in deployed flow verified without owner confirmation.

No migration is required. After explicit release approval, fast-forward main only if the verified Production baseline remains its ancestor and allow the existing GitHub → Vercel pipeline to deploy. Do not change flags or credentials as part of promotion. Recheck canonical articles, sitemap, Our Approach/history and private reporting afterward. If code rollback is needed, restore the previously verified Vercel Production deployment; preserve database pointers, approvals and history. No data rollback or agent-registration rewrite is required.

The next live research-to-content experiment requires its own owner approval, an explicit request/model budget and appropriate branch-scoped credentials. It is not part of this release verification.
