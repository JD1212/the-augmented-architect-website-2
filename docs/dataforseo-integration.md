# DataForSEO: protected Preview and first market experiment

Baseline: Production website `757463f`. This extension reuses the existing private Keyword Intelligence view, owner UUID/membership authorization, tenant-scoped artifacts, provider interfaces, immutable research history, approval/review chain, cache and explainable scoring. No database migration, new agent/runtime, package release or new service is needed. The standalone SEO Analyst stays at v0.3.0 and can consume saved provider evidence through its existing contract.

## Server adapters

`src/lib/marketing/intelligence/dataforseo.ts` implements three API v3 Live methods:

- `keywords_data/google_ads/keywords_for_keywords/live`: one task, up to five seeds, relevance order, retain the first 50 ideas. The upstream API can return up to 20,000 ideas; there is no invented provider-side `limit` parameter. Response bytes are bounded at 32 MiB. No automatic expansion or pagination.
- `keywords_data/google_ads/search_volume/live`: one task for up to five exact submitted terms, preserving provider spelling corrections, monthly estimates, paid competition/index, CPC and bid amounts. Missing values remain null; a reported zero remains zero. USD values are normalized into the existing micros fields. Corrections become the primary measured term; the submitted spelling remains a variant.
- `serp/google/organic/live/advanced`: one desktop query, one page, depth ten. Preserve actual organic `rank_group`, safe result URLs/domains/titles/snippets and provider observation time when supplied. No invented traffic, backlinks, organic difficulty or content-gap claims. Cost multipliers/search operators are blocked.

API credentials are Basic-auth headers only to fixed DataForSEO HTTPS URLs. Redirects, retries, raw provider-error logging and browser credential exposure are prohibited. Timeouts are bounded. Provider task IDs, collection/freshness timestamps, documentation references and reported USD task costs are retained in existing evidence collections. Each task receipt is recorded once, not summed once per keyword. Failures retain a sanitized receipt when available; absent usage remains unknown. The portal exposes recent failure receipts so uncertain tasks can be reviewed.

The existing Google Ads adapter remains available internally; new Keyword Intelligence requests explicitly select DataForSEO. Legacy saved Google evidence is not relabeled. GA4/Search Console federation is unchanged and is not required to authorize DataForSEO.

## Bounds and persistence

Existing owner/tenant checks, same-origin mutations, no-store/noindex responses, one-minute cooldown, ten-request daily ceiling, request UUIDs and append-only concurrent budget slots remain. Cache identity includes provider/account fingerprint, location, language, service, mode and seeds. Keyword evidence expires in seven days with monthly invalidation; SERPs in 24 hours. Old records remain inspectable across configuration changes and are not relabeled as current-account verification.

New DataForSEO spending requires all of: server credentials, `DATAFORSEO_RESEARCH_ENABLED=true`, a valid explicit approval ID, request ceiling and USD ceiling. Each claimed task reserves its entire quoted maximum before dispatch. Cached results and idempotent retries send no new task. Failed, incomplete or uncertain tasks stop further spending under that approval; review the provider task before issuing a new approval. No automatic reset of the approval budget occurs on refresh or a new day. No paid request or model run is authorized by this implementation release.

An upstream price change or unexpected billing can occur before its receipt is inspected. Application reservation caps limit dispatch at the configured known rates; they are not a contractual cap on DataForSEO charges, taxes or unrelated account usage. Confirm rates/balance and account controls before enabling; unknown or excessive receipts stop the approval. A transport failure may have created a billable task: do not blindly retry.

## First experiment: proposed, not executed

US (`location_code=2840`), English (`language_code=en`), Google Search without search partners:

1. One Keywords For Keywords Live task seeded with Salesforce automation consulting, Salesforce Flow optimization, Salesforce Apex consultant, Salesforce org cleanup, Salesforce technical debt: **$0.09**.
2. One Search Volume Live task for those same five original terms: **$0.09**.
3. One ten-result Organic SERP Live for **Salesforce automation consulting**: **$0.002**.
4. One ten-result Organic SERP Live for **Salesforce org cleanup**: **$0.002**.

Current base estimate/requested maximum: **four tasks, $0.184 USD (18.4 cents)**. No retries, extra related-term tasks, extra SERPs or model execution. Space requests at least one minute apart. The two commercial/service-oriented terms are chosen for potential consulting inquiries, not just search volume. Discovery is relevance-ordered. Search demand is a provider estimate, not qualified leads; unknown intent/feasibility/effort remain unknown.

Successful observations can be linked to an existing opportunity using the existing Link evidence control. Scoring uses the existing source-backed demand heuristic; it does not turn paid competition into organic feasibility or fabricate a complete score. The owner can compare actual competing service pages and original opportunity evidence. Full agent interpretation or further model analysis is a separate approval, not bundled into these API costs. The five-seed loader only fills the form and never submits it.

## Exact account and configuration steps

1. Create/sign into [DataForSEO](https://app.dataforseo.com/), complete account/email setup, then open [API Access](https://app.dataforseo.com/api-access). Copy the **API login and generated API password** privately; the API password differs from your account password. No Google Ads account, Google OAuth or Google Cloud API approval is needed for these DataForSEO endpoints.
2. Verify the account can use Google Ads Keywords Data Live and Organic SERP Live and has sufficient credit. Use any eligible existing/test credit only if it supports real data; sandbox fixtures must not be presented as observations. If funding is necessary, DataForSEO currently documents a **$50 minimum top-up**, distinct from the experiment's $0.184 usage. The owner must approve/pay it directly; no funding or automatic replenishment is authorized here. Check applicable taxes and account limits in the provider dashboard.
3. Put credentials only into ignored `.env.local` for local configuration, or server-only Vercel variables scoped to the protected feature Preview. Never paste them into chat or use `NEXT_PUBLIC_`. Leave paid requests disabled:

   ```dotenv
   DATAFORSEO_LOGIN=                  # set privately
   DATAFORSEO_PASSWORD=               # generated API password; set privately
   DATAFORSEO_RESEARCH_ENABLED=false
   DATAFORSEO_LOCATION_CODE=2840
   DATAFORSEO_COUNTRY_CODE=US
   DATAFORSEO_LANGUAGE_CODE=en
   DATAFORSEO_APPROVAL_ID=
   DATAFORSEO_MAX_REQUESTS=0
   DATAFORSEO_BUDGET_USD=0
   ```

   Changing the target is a server configuration choice; use a verified provider location code plus its corresponding country and supported language. The browser can only submit the server-authorized target. Existing Google/Calendar/Gmail credentials remain untouched.
4. Tell us credentials are configured, then explicitly approve: **“Approve the four-task DataForSEO Salesforce experiment, maximum $0.184 USD, no retries or model calls, in protected Preview.”** The established protected `feature/seo-analyst-v1` Preview already has its approved server-only Supabase credential; this implementation reuses that scope without copying or widening secrets. No credentials are requested in chat.
5. Only after that approval and credential verification, configure a unique non-secret `DATAFORSEO_APPROVAL_ID` (for example `salesforce-demand-v1-test-1`), `DATAFORSEO_MAX_REQUESTS=4`, `DATAFORSEO_BUDGET_USD=0.184`, and `DATAFORSEO_RESEARCH_ENABLED=true` for the test environment. A new deployment is required for updated Vercel configuration. Inspect stored receipts/provider task history and disable again after the single experiment. Do not enable Production or change Production variables before review.

## Official references and prices

Checked November 18, 2026: [authentication](https://docs.dataforseo.com/v3/auth/), [Keywords For Keywords Live](https://docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live/), [Search Volume Live](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/), [Organic SERP Live Advanced](https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/), [Google Ads task pricing](https://dataforseo.com/pricing/keywords-data/google-ads), [SERP pricing and multipliers](https://dataforseo.com/pricing/google-serp/google-organic-serp-api), [minimum top-up](https://dataforseo.com/help-center/minimum-payment).

No genuine DataForSEO observations or costs have been collected yet. Deterministic fixtures verify mapping, costs, security, idempotency, cache scope, approval budgets and opportunity linking; they are not inserted as live market research. Protected Preview is the release target for this task. Production remains unchanged until a subsequent approved release.

## Verification

231 website unit tests passed, two explicit live checks skipped; 12 new DataForSEO fixture tests are included. Lint, TypeScript and the production webpack build pass. The authenticated production-build browser suite passes 78 checks, including owner/private API restrictions, real isolated review persistence, disabled DataForSEO access, the five-term loader, Demo isolation and desktop/mobile layouts. Temporary QA records are removed. No model, provider, email or booking execution is part of this validation. No credentials or Production environment configuration were changed.

## Redacted failure instrumentation

`dataforseo-failure/v1` diagnostics are appended to the existing immutable failure artifact: local request UUID, fixed endpoint identifier, upstream HTTP status (or null), numeric provider status code (or null), sanitized category, safe provider task ID, provider-reported USD cost (or null), and failure stage. Categories distinguish authentication, permissions, insufficient balance, rate limit, transport and unexpected response. Provider error codes follow the [official error catalog](https://docs.dataforseo.com/v3/appendix/errors/), including business errors returned inside HTTP 200 responses.

Non-success response bodies are bounded at 64 KiB and parsed only in memory to select numeric codes/costs and a safe task ID. Messages, bodies, headers, authorization values, stack traces and thrown causes are not stored or logged. Credential-shaped/echoed correlation IDs are discarded. The owner-only history API reconstructs an allowlisted diagnostic projection. Zero reported cost is preserved; missing cost is never filled from the budget reservation. There are no additional provider calls or retries.

The first real failed request `4bb672bf-f3a8-4186-a4c4-ebdfad0890e7` remains unchanged: its prior implementation did not retain the HTTP status or cost receipt. New instrumentation cannot recover or invent those historical facts. Research remains disabled, the original approval remains blocked, and its four-request/$0.184 limits are not reset. A future single controlled Keywords For Keywords retest requires explicit authorization with a fresh approval ID, at most one request/$0.09 and no retries or model calls. No such retest is executed by this diagnostics release.

Diagnostics validation: 254 unit tests passed, two explicit live tests skipped; lint, TypeScript, production webpack build and 78 authenticated local browser checks passed. All new error cases use deterministic fetch fixtures. The live database retains exactly one original request/one failure/no research results, with no diagnostic backfill and no new provider/model execution. Protected Preview verifies the deployed build and private API guards while research remains disabled.
