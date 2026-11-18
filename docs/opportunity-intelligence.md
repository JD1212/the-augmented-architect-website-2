# Opportunity Intelligence foundation

## Audit first: existing application

Production baseline: website `8c062b76c6143d618df93bbc74fe2f227cad1a9c`; independent SEO package v0.2.0. At inspection the dedicated database contained three opportunity identities, four recommendation observations, two completed and two failed executions, two evidence bundles, and no real owner-decision artifacts. A subsequent real analysis had already appended an observation without making another opportunity identity. Existing records are not backfilled, rewritten or removed by this extension.

The current seven marketing tables already support the domain. We reuse tenant/membership authorization, private owner APIs, append-only artifacts, evidence bundles, review revision slots, the SDK host, execution leases, reporting adapters and the dark workspace. No new repository, database, auth system, runtime, queue, scheduler, crawler or RAG system is introduced. No migration, table grant, policy change or environment change is required for the unconnected foundation. The pending Scout authentication proposal remains unrelated and unapproved.

Google reporting uses the existing keyless Reader service account with `analytics.readonly` and `webmasters.readonly`. The local configuration has no Ads customer/access-level configuration or paid SERP-provider credentials. Calendar/Gmail authorization is separate and is neither inspected for token values nor changed. No model or paid-data request is made during this phase's verification.

## Backlog extension

The existing inspector, owner decisions and research history remain. A compact server-filtered/paginated table replaces only the long card list. Search, review status/archive, original topic cluster, priority, evidence level, recent activity, creation date and priority sorting are supported. Topic IDs derive from the original opportunity and a versioned host taxonomy; later observations do not move an identity silently.

Archive/restore are append-only `seo-opportunity-review/v2` events. Restore returns to the prior review state, including an existing approval, rather than automatically reopening it. The current Production v0.2 reader ignores these additive events until release; unique revision slots prevent older code overwriting them. Existing v1 decisions remain unchanged. Original citations and observation histories remain inspectable.

The UI sends compact pages rather than the complete historical artifact graph. Current server projection reads are bounded at 10,000 records and fail closed instead of silently omitting continuity. This is not a claim of unlimited database scale: a later high-volume deployment should add an indexed read projection and historical detail paging while retaining the same authoritative artifacts and IDs.

## Reusable domain and scoring

`augarch-seo-analyst/src/intelligence.ts` contains versioned, business-independent market/competitive/business evidence schemas, provider interfaces, bounded context and deterministic scoring. Website credentials, the tenant UUID, Google properties and business data are not hardcoded into the package. Website adapters remain in `src/lib/marketing/intelligence/`.

Market evidence preserves exact returned terms, close variants, provider-estimated volume, monthly estimates, geographic/language scope, advertising competition, bid micros, verified/unknown currency and collection/freshness metadata. Close variants may share aggregated metrics; do not sum them blindly. Missing numeric values remain null; a reported zero remains zero.

Competitive evidence preserves the actual query, market, device, organic result positions, URLs/domains, titles/snippets and collection time. These are point-in-time SERP observations, not universal rankings. No traffic, backlinks, organic difficulty or page-content type is invented. Full page content and differentiation analysis remain unknown unless supported by separately collected evidence.

Business evidence reuses approved website content, service objectives and target customers. Conversion observations, delivery effort and customer value remain unknown when not actually available. No second business-knowledge system is added.

`opportunity-score/v1` uses initial weights 30% commercial intent, 25% business relevance, 20% demonstrated demand, 15% competitive feasibility and 10% execution efficiency. Inputs require rationales and supported source references. Missing inputs yield `insufficient_evidence`, not neutral values or a renormalized score. Confidence remains separate from potential. A linked fresh volume estimate can supply the explicitly disclosed initial demand heuristic `min(100, 25 × log10(1 + estimated searches))`; other factors remain unknown without evidence-backed assessments. The service is not yet a calibrated predictor or an automatic complete opportunity ranking.

## Persistence, budgets and agent continuity

The existing `marketing_artifacts` measurement type stores namespaced request reservations, immutable research results/receipts, failures and opportunity links (`payload.domain = opportunity-intelligence`). It does not create fake agent executions. A unique request UUID prevents replay. A unique append-only budget revision admits one concurrent request, with a rolling one-minute cooldown and ten provider requests per day. No retries or automatic pagination are performed. Results are saved only after schema/provenance validation. Partial/failed requests remain distinguishable from actual empty results.

Cache keys include tenant, provider account fingerprint, API version, mode, service, target and canonical seed set. Google research expires after seven days with monthly invalidation; SERPs after 24 hours. Provider timestamps and original values are retained on cache hits. Linking requires a real saved term and an opportunity in the same authorized tenant; repeated links are idempotent. Linking does not change owner review status or an already-approved draft assignment.

The SEO host can inject at most 9 KB of fresh, relevant saved intelligence through the package's validated input contract. The package exposes it as a separate evidence document with its source catalog; Google Ads estimates are never marked as the business's actual Search Console data. Existing citation validation, request/token/time budgets and required reporting/website/research reads remain. No extra provider request or new agent tool is automatically invoked. Archived/rejected work remains prior context. Unknown facts and stale evidence must be disclosed.

## Google Ads: current official setup boundary

Checked November 18, 2026 against Google's current v26 documentation, not older developer-token tutorials:

1. In Cloud project `the-augmented-architect-web`, enable Google Ads API and inspect its access level. **Basic or Standard is required for KeywordPlanIdeaService. Explorer excludes planning.** Basic requires Cloud brand verification. Apply through the Google Ads API Overview page for that project.
2. Have an actual Google Ads customer account and grant the existing `marketing-intelligence-reader@the-augmented-architect-web.iam.gserviceaccount.com` principal **Read-only** account access. Supply the customer ID; optionally supply the manager login-customer ID if access is through a manager. Do not create a campaign for this application.
3. Developer tokens were sunset September 9, 2026; current access is assigned per Cloud project. Do not create unnecessary manager/token infrastructure based on obsolete examples. Legacy headers are optional/ignored per the migration guide.
4. The prepared adapter uses a separate short-lived keyless token with `https://www.googleapis.com/auth/adwords`. Ads has no distinct read-only OAuth scope: account role plus the adapter's fixed read-only method allowlist are important. Existing reporting scopes and Calendar/Gmail credentials are unchanged. No permanent JSON key is needed.
5. After account/Basic approval, configure `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_ACCESS_LEVEL=BASIC` (or STANDARD), optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, and optionally confirmed account `GOOGLE_ADS_CURRENCY`. Keep `GOOGLE_ADS_RESEARCH_ENABLED=false` until a specific bounded test is authorized. Do not paste credentials into chat.
6. The first proposed test is one US/English `GenerateKeywordIdeas` request, maximum 50 returned ideas, or one `GenerateKeywordHistoricalMetrics` request for up to five agreed terms. These methods create no KeywordPlan/campaign. Google documents no API usage charge; account approval, data availability and quotas still apply. Campaign spending is separate and never authorized here.

Google limits these keyword-planning methods to one request/second per customer; our one-minute tenant cooldown is stricter. Test-account output must not be presented as genuine production market demand. Basic access allows up to 15,000 operations/day, subject to method-specific restrictions. HTTP errors and denied access remain errors, not zero-volume reports.

Official references: [access levels and planning restriction](https://developers.google.com/google-ads/api/docs/api-policy/access-levels), [developer-token migration](https://developers.google.com/google-ads/api/docs/api-policy/developer-token), [scope and account roles](https://developers.google.com/google-ads/api/docs/oauth/access-model), [service-account access](https://developers.google.com/google-ads/api/docs/oauth/service-accounts), [keyword planning](https://developers.google.com/google-ads/api/docs/keyword-planning/overview), [quotas](https://developers.google.com/google-ads/api/docs/best-practices/quotas), [v26 idea request](https://developers.google.com/google-ads/api/reference/rpc/v26/GenerateKeywordIdeasRequest), [v26 historical metrics](https://developers.google.com/google-ads/api/reference/rpc/v26/KeywordPlanHistoricalMetrics), [Cloud project and API fees](https://developers.google.com/google-ads/api/docs/oauth/cloud-project).

## SERP provider comparison and approval boundary

Prices checked November 18, 2026; these are published prices, not measured charges in this application.

| Provider | Published entry pricing | Freshness / capabilities | Integration status |
| --- | --- | --- | --- |
| DataForSEO Google Organic | $0.0006 standard / $0.0012 priority / $0.002 Live per ten-result SERP; $50 minimum account top-up, taxes may apply | Standard ~5 minutes (target up to 45), priority ~1 minute, Live ~6 seconds average; geographic/language/device targeting, organic result metadata | Prepared bounded Live adapter, **not connected or enabled** |
| SerpApi | Free 250 searches/month; Starter $25/1,000; Developer $75/5,000 | Google search results with structured organic entries and targeting; actual freshness/caching should be verified for the selected plan | Documented alternative behind the same provider port; no account/key or adapter is silently substituted |

DataForSEO is prepared for one desktop query, depth ten, one page, no cost multipliers/advanced search operators and no retry. The published Live base cost is $0.002; receipts are retained as provider-reported task costs, not invoice charges. A price change or receipt exceeding the expected budget is an error requiring review. The upstream request can incur its quoted cost before a receipt is checked; account-level spending controls and a fresh price check are required before enabling. No account is funded and no paid request is authorized by this foundation release.

To connect later: explicitly choose a provider/plan, approve any billing/top-up and a single-test budget, place its credentials only in ignored local/server configuration, and authorize a bounded first request. For the prepared adapter the variables are `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, with `DATAFORSEO_RESEARCH_ENABLED=false` until that approval. No unsupported direct search-engine scraping is implemented.

References: [DataForSEO exact SERP rates and multipliers](https://dataforseo.com/pricing/google-serp/google-organic-serp-api), [minimum payment](https://dataforseo.com/help-center/minimum-payment), [Live API contract](https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/), [SerpApi plans](https://serpapi.com/pricing).

## What is real now versus gated

Real: existing GA4/Search Console reporting, two actual SEO executions, their persisted research, the existing opportunities, owner review persistence, archive/history, and approved business content. New provider adapters/scoring and bounds are verified with deterministic fixtures. Live keyword volumes/SERPs are **not verified or available** until external setup and explicitly authorized tests. The UI must show Not Connected and unknown evidence, never fixture metrics in LIVE mode.

The private Keyword Intelligence view provides seed/service/target controls, saved research/history, actual provider fields when available, source timestamps and link-to-opportunity actions. New research is already saved on success; there is no separate unsaved model draft masquerading as external data. Demo Mode cannot load real research or trigger mutations. No Content Strategist, publishing, recurring jobs or campaigns are added.

## Validation and release gate

Independent v0.3.0: 18 deterministic SDK/domain tests passed. Website: 219 unit tests passed, two explicit live checks skipped, with lint, TypeScript and production webpack build required. The authenticated production-build browser suite exercises 77 owner/Auth/RLS, persistence, archive/restore, provider-disable, Demo and responsive checks using temporary QA records; Google, model, Scout and booking calls are blocked or mocked. The read-only post-test database check retained the original three opportunities, four observations, two completed/two failed executions and zero intelligence requests, with no leftover QA agents. No new paid execution is part of this release.

Dependency audit reports seven moderate findings in the existing development-only ESLint/typescript-eslint/minimatch chain; no high/critical findings. The lock diff changes only the independent SEO package. Broad toolchain upgrades are outside this scoped change. Protected Preview and owner verification remain required before a Production merge. External provider setup and one explicitly authorized request remain separate gates before enabling live keyword/SERP collection.
