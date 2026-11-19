# SEO Analyst: objective-led research planning

## Reuse and boundaries

The independent `JD1212/augarch-seo-analyst` package v0.5.0 extends the existing SEO Analyst; it is not another agent runtime. `src/planning.ts` in that repository exports the typed planning interface, bounded OpenAI Agents SDK execution, keyword grouping, scoring explanation and future observed-performance feedback contract. It contains no business IDs, Google properties, database clients or credentials.

The website pins the vendor tarball with SHA-512 integrity in the lockfile and `vendor/seo-analyst.provenance.json`. `src/lib/marketing/seo/planning-service.ts` is the server execution adapter. The existing owner UUID/session checks, reporting adapters, agent registration, distributed execution lease, cooldown, daily cap and measured provider token receipts remain authoritative. The agent has no direct database or credential access.

### Registration ownership

Production retains the legacy registration name `SEO Analyst`. Preview uses `SEO Analyst [preview:<branch hash>]`, derived server-side from `VERCEL_ENV` and `VERCEL_GIT_COMMIT_REF`. The branch hash is stable across redeploys; different branches have different identities. Local development uses `SEO Analyst [development]`. A Preview missing its branch, or an unsupported environment, fails closed rather than falling back to Production.

These are environment-owned registrations of the same package in the existing `marketing_agents` table, not another registry or runtime. No schema change or data migration is needed. First authorized execution creates its scoped row; status reads and deployment create none. Preview never upgrades or leases the Production registration. Version guards, disabled flags, leases, cooldowns, daily caps and execution history apply within the selected registration. Redeploying the same Preview branch cannot reset its budget. Existing tenant-scoped research, approved business content and opportunity decisions remain available as context; agent execution history is scoped to its registration. Execution diagnostics continue recording the actual package version.

## Owner flow

Open Keyword Intelligence in LIVE mode, enter a business objective, and select **Prepare research plan**. This explicitly invokes planning (at most three model responses, 150 seconds and 160 KB aggregate model input; no retries). It reads GA4, Search Console, approved website facts, saved investigations, prior opportunities/decisions and any validated performance feedback. It can inspect cached keyword observations and the existing explainable scoring model via SDK tools. No DataForSEO or hosted web-search request is available to the planner.

The model proposes up to four steps across any of the three offerings. The host validates seed terms, service, target and endpoint mode, rejects duplicate requests, matches fresh authorized cache entries, and computes the maximum additional API cost from the existing provider price reservations. Unknown volume remains unknown. Case/separator variants are grouped without summing counts or changing immutable evidence. Conflicting estimates remain explicitly unresolved.

The owner can approve, defer or reject the plan with a note. This append-only decision persists after refresh. **Approval records intent only: paid execution remains disabled.** There is no paid plan-execution endpoint in this release. Separate explicit authorization and a bounded executor must be reviewed before enabling purchases. Existing manual controls are retained under an expandable advanced area and remain subject to the existing server disabled flag and exhausted approval budget.

Existing **Run Analysis** is separate and retains its original model/web-search budget. It uses the newest approved plan's business objective, bounded plan/research memory and fresh saved intelligence across all offerings. Validated findings still reconcile with the entire existing backlog: updates preserve identity and owner status, and unsupported or duplicate findings are not silently published. Running planning or analysis is never automatic.

## Durable memory and future feedback

Plans and plan decisions reuse `marketing_artifacts` with the `seo-research-planning` domain, tenant scope, execution/actor IDs and immutable parent references. Planning reuses `marketing_agents` and `marketing_executions`; no schema or RLS changes. Original provider results and request/failure receipts stay in their existing domain. Historical failed runs remain historical.

Context includes up to 15 prior provider investigations plus recent planned subjects and their evidence gaps (30 entries maximum), eight recent plan decisions and the existing bounded opportunity history (including approvals, deferrals and rejections). The full database history remains available for reconciliation. This is explicit bounded memory, not LLM retraining. At most five saved evidence documents are supplied to planning; stale sources are labeled and never reused as fresh free requests.

The package's `performanceFeedbackSchema` defines opportunity ID, reporting period, source references, nullable actual clicks/sessions/bookings and a bounded outcome observation. The host reads validated `performanceFeedback` on existing opportunity outcome artifacts. No Performance Analyst, outcome collector or fabricated feedback is implemented. A future agent can supply observed results through this contract; approval and publishing remain owner-controlled.

## Augment compatibility

Augment can invoke `runSeoResearchPlan(config, ports, host)` using its own authorized read-only reporting/research ports, short-lived access packages, model provider, cancellation signal, usage handler and persistence adapter. The package does not duplicate Augment governance. Future paid execution must enforce an immutable plan revision, owner decision, request/monetary reservations, cache validation, cancellation and idempotency outside model control before reusing `executeResearch`.

## Verification and limitations

The first authorized planning attempt (`e10fe81e-060f-4527-9b9d-bc3c0675bd14`) exposed a saved-evidence timestamp mismatch. PostgreSQL JSON returns `created_at` with an explicit UTC offset and microseconds; the package's `retrievedAt` contract requires ISO UTC `Z`. The adapter now normalizes this DTO timestamp with `Date.toISOString()` and leaves original evidence records and provider provenance unchanged. Strict package validation remains intact. A regression reproduces the original format's `EVIDENCE_SCHEMA_INVALID` / `retrievedAt` failure before any model access, then verifies the corrected path through the actual SDK using a mocked transport.

That historical failed execution retains its original empty receipts and unknown token/cost totals; no speculative diagnostics are backfilled. Future failures persist a sanitized phase, validation rule/path or allowlisted provider status/code/parameter, preserve returned usage, release the execution lease, and write the same redacted diagnostic to Preview logs. Prompts, source bodies, credentials and raw provider errors are excluded. No live retry is part of this correction.

Package tests execute the real SDK against deterministic mock model responses. Website tests cover cache scope/freshness, unknown data, host-derived budgets, deduplication, persistence, immutable decisions, tenant authorization and private API rejection. No live paid research or model run is part of this release verification. The existing DataForSEO result is real; newly generated plans in browser tests are clearly fixtures. End-to-end live planning quality still requires a separately approved controlled model run.

The engine can recommend gathering more evidence, improving an existing page or creating no content. It cannot yet execute an approved multi-step paid plan, research continuously, publish, schedule, or learn from performance that has not been observed. Provider keyword volume is an estimate, advertising competition is not organic difficulty, and report emptiness is not zero demand.


## Foundation correction: v0.5

The application now supplies its three current offerings, audiences, commercial scope and an explicit UTC observation time. The reusable package has no offering IDs or service priorities. Every configured offering receives an assessment, including evidence gaps or a reason it is outside the objective; equal recommendations and unsupported rankings are not required. New decisions cite known evidence IDs even when there are no proposed purchases. Observations, hypotheses and gaps are explicit. AI visibility cannot be marked observed without a separately sourced AI observation. The host checks returned freshness labels against its computed status.

The earlier Salesforce preference was substantially an evidence imbalance: all purchased keyword research and the three prior opportunities concerned Salesforce. Additional host bias came from the two-offering default objective, the historic Salesforce business snapshot, missing non-Salesforce audiences and an unconditional Salesforce testing taxonomy. The current business offering list supersedes historic snapshots; the testing facet now requires Salesforce context. Scoring weights remain unchanged and generic. Historical evidence and owner decisions remain immutable.

Freshness is calculated from host `asOf`, collection and expiry timestamps, with missing/invalid/future timestamps marked unknown. The actual November 19 collection is fresh until November 26, not expired. The earlier prompt lacked an explicit clock and cut provider JSON at 8,000 characters, sometimes before its freshness field. This explains an unreliable input path, not proof of the model's internal reasoning. Complete compact summaries replace raw fragments. Unknown and conflicting volumes, collection times, provider task IDs and reported costs survive summarization. Omitted detail is explicit; an authorized in-memory detail reader permits at most three unique requests of 6,000 bytes each without any network research.

The objective field now starts empty, requires intentional owner entry, and is passed and saved exactly, including whitespace. No default is silently submitted. Current decisions emphasize action, business rationale, unknowns and measurable hypotheses; per-offering comparisons and evidence checks are expandable. Legacy v0.4 plans stay readable without invented assessments or retrospective approval.

Validation uses saved/redacted observations and mocked SDK responses. No live model, provider purchase, pending-plan decision or Production change is part of this correction. The new wire contract requires a separately approved controlled live test before its planning quality can be considered verified.

## AI visibility extension design (not connected or enabled)

Verified against official documentation on 2026-11-19. Reuse the current tenant authorization, immutable request claim, provider scope, cache, approval budget and artifact/evidence model. No new agent, runtime, registry or database is proposed.

| Future governed operation | Supported source | What it establishes | Published price / planning estimate |
| --- | --- | --- | --- |
| Historical mention research | DataForSEO LLM Mentions `search_mentions/live`, ChatGPT or Google AI Overviews | Matches from the provider's prompt/answer index, with dates and citations | $0.10 per task + $0.001 per returned row; one request limited to 10 rows is $0.11 |
| Controlled question test | DataForSEO ChatGPT or Gemini `llm_responses/live` | A model response to an approved commercial question, not population visibility | $0.0006 per Live task plus the chosen model's charges; unknown total until a model-specific quote is verified |
| Source/competitor comparison | Sources in those authorized observations | Which domains a particular response cites, with matched brand/domain context | Reuse saved results; an additional provider query requires its own reservation |
| Measured acquisition | Existing GA4/Search Console adapters | Actual referral sessions, search clicks and recorded booking events | Separate first-party evidence; never inferred from a mention or citation |

Sources: [LLM Mentions pricing](https://dataforseo.com/pricing/ai-optimization/llm-mentions), [Responses pricing](https://dataforseo.com/pricing/ai-optimization/llm-responses), [current mentions endpoint](https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/search_mentions/live/), [Gemini response contract](https://docs.dataforseo.com/v3/ai_optimization-gemini-llm_responses-live/).

Google AI Overviews is not Gemini. The mentions index supports ChatGPT and AI Overviews; Gemini requires a separate prompt-response observation. Prompt samples do not establish representative rankings, historical mention frequency, visits or conversions. Missing annotations mean no observed citations. Capture platform/model, prompt and target, provider task ID, collection time, sources, response type and actual cost. Treat all content as untrusted data. Preserve unknowns and index coverage limitations.

A future proposal should name the offering, commercial question, comparison domains, observation type, bounded count, cache age and maximum reservation. No automatic pagination, follow-up purchases or retries. For Gemini, the documentation warns that reasoning or web search can exceed the output-token setting: that setting alone is not a safe monetary cap. Keep such modes disabled until model/provider pricing and a defensible reservation are reviewed. The existing keyword/SERP authorization does not authorize these new endpoints. No pricing entry or callable paid adapter has been added in this pass.


## Release controls and rollback

`SEO_RESEARCH_PLANNING_ENABLED` is server-only and defaults to false when absent. Only the exact value `true` permits new planning. Both the route and execution service enforce this before credentials, registration, lease claims or model access. GET reports the capability; the owner interface hides preparation controls while disabled. Existing saved plans and owner review remain available. A browser-supplied flag cannot enable execution. Preview and Production for this synchronization release leave the flag unset/off. Tests opt mocked paths in without modifying deployed configuration.

`DATAFORSEO_RESEARCH_ENABLED` remains false in the protected feature Preview and defaults off in Production. Production has no DataForSEO credentials. Read-only saved history and reporting continue without those credentials; account-scoped cached evidence is not assumed available to the planner. Autonomous research, paid plan execution, AI-visibility tools and publishing remain absent. Do not disable shared OpenAI/Scout credentials to gate marketing execution.

Production baseline: website commit `757463ff7a95d88c71825de2f59d1cb9d4c92b96`, package v0.3.0, existing agent registration v0.2.0. Preview uses a separate branch registration. Deployments, reads and disabled planning do not upgrade either registration. No migrations or data backfills are required by this release. The existing Run Analysis control remains a separate, manually initiated workflow; do not run it as a smoke test.

Before any new Production agent execution, a Git revert of the release (followed by the established Git integration) restores baseline code without database changes. For an urgent Vercel rollback, use the verified prior Production deployment; Vercel rollback changes automatic domain-assignment behavior, so explicitly restore normal promotion/assignment afterward. Do not force-push or delete evidence, plans, decisions or executions.

The first explicit execution with a newer package can upgrade its environment-owned registration. Older code then correctly rejects that newer registration rather than overwriting it. After such an execution, do not assume an old-code-only rollback restores agent execution: use a forward corrective release retaining the compatible package/registration contract. This boundary does not block the public site, reporting or historical data, but it must be reviewed before enabling/running newer agent workflows. Never downgrade a shared registration or reset its budget/history as a rollback shortcut.

The v0.5 artifact is produced from independent commit `b86e87f85cc0c381277fd3b8ae07a6a8d90ef31f` and pinned by SHA-512 in both package lock and provenance. Unrelated local Scout documentation and the unapproved authentication proposal are excluded from this release. Production promotion requires a separate explicit owner authorization after protected Preview verification.
