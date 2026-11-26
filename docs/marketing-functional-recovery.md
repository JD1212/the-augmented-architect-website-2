# Marketing Intelligence functional recovery

Release scope: website server adapters and their existing owner controls. Independent packages remain SEO Analyst 0.5.1 and Content Strategist 0.1.3. No schema migration, new runtime, or agent instruction changes.

## Execution repair

External research still makes one Responses request, with `max_tool_calls: 1`, no retries, and the existing time/output budgets. Multiple legitimate `web_search_call` output items are accepted. Items are not equated with invoiced searches: provider-reported request counts, when present, are checked separately. Completed response/tool state and traceable safe sources remain required. Usage is recorded before completion/source validation.

Failures retain a bounded response ID, status, incomplete reason, provider code, HTTP status/error category, output types, and tool status/action summaries. Prompts, raw prose, authorization headers and provider error bodies are excluded. The old Production exception was not retained; the exactly-one-output-item defect is confirmed, but its historical terminal exception cannot be reconstructed.

## Exact research selection

The owner explicitly selects a saved approved plan. A separate immutable `research-spend-approval/v1` artifact binds its decision, quote, owner, environment, USD allowance and request limit. Collection must match an exact plan step and also pass the existing server-wide approval/budget, rate and uncertain-request guards. Cached reuse records an immutable plan/evidence association without purchasing again.

SEO analysis receives explicit plan/evidence IDs. Unrelated, stale or differently scoped selected collections are rejected. Saved, eligible, selected, supplied and cited evidence are separately reported. Analysis reservations, completed evidence bundles, recommendations, opportunity reviews and Content Strategist constraints retain the same binding. A same-day identical completed analysis is reused rather than automatically executed again. Historical approvals without the new metadata remain unchanged.

Existing immutable artifacts are reused; no new tables or rewritten approvals.

## Release configuration

The recovery branch is `feature/marketing-functional-recovery`. The following variables are explicitly false in its Preview scope and in stored Production configuration:

- `SEO_RESEARCH_PLANNING_ENABLED`
- `DATAFORSEO_RESEARCH_ENABLED`
- `CONTENT_STRATEGIST_ENABLED`
- `CONTENT_STRATEGIST_PRODUCTION_ENABLED`

Stored Production configuration applies on a future deployment. This task does not redeploy Production or change its registrations/history. Publishing configuration is unchanged.

DataForSEO credentials previously existed only in Preview branch `feature/seo-analyst-v1`. They are Vercel Sensitive values and cannot be retrieved for copying. The owner must configure `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` in Production and branch-scoped recovery Preview. Never paste them into chat/Git. The recovery Preview needs its existing `SUPABASE_SECRET_KEY` copied securely if owner decision/allowance writes are to be tested; read-only records remain available through owner RLS. No model key is needed merely to review/authorize a saved plan.

## Future explicitly authorized test, not authorized by this release

1. Confirm owner login, Google reporting and saved records in protected Preview.
2. Separately approve one bounded planning execution; configure its server flag and existing OpenAI key/model for the specific environment. In Start New Research, enter the objective, inspect the model allowance, check the explicit confirmation and run once. Planning uses saved evidence only: at most 3 model requests, 7,200 output tokens, 150 seconds, no retries or hosted search. The displayed model allowance is an estimate, not an invoice cap.
3. Review the exact saved plan and approve the plan only. This does not authorize spending.
4. Separately approve DataForSEO spending: a fresh `DATAFORSEO_APPROVAL_ID`, explicit `DATAFORSEO_MAX_REQUESTS` and `DATAFORSEO_BUDGET_USD`, plus credentials and `DATAFORSEO_RESEARCH_ENABLED=true`. Do not reuse old exhausted approvals. In the selected plan, confirm its exact quoted allowance. Select an approved step and click collection once. No retries. A failed/uncertain request blocks further spending under that approval.
5. Select the resulting eligible evidence and use SEO analysis. Run Analysis is a separate owner action with existing limits: at most 5 analysis model requests, 1 hosted research request, 150 seconds, no retries, 10-minute cooldown, 6 executions/day. Model exposure must be approved separately; API costs are reported only when actually supplied.
6. Review and approve the exact finding. Review primary-source grounding. Authorize a fresh Content Strategist one-use approval with exact `CONTENT_STRATEGIST_OPPORTUNITY_ID` and `CONTENT_STRATEGIST_APPROVAL_ID`. Preview also requires its exact `CONTENT_STRATEGIST_PREVIEW_BRANCH`; Production requires BOTH execution gates true. Existing limits remain one attempt, 3 requests, 18,000 output tokens, 150 seconds, no retries/research. Generation rechecks the bound evidence before reserving the model execution.
7. Draft review, exact-revision website approval, explicit environment-specific publishing and LinkedIn approval remain separate. This release performs none of them.

## Verification and rollback

`tests/marketing-functional-recovery.test.mjs` proves the plan → bounded provider fixture → actual Agents SDK with mocked provider responses → persisted finding → immutable approval → Content Strategist brief path. These are deterministic fixtures, not live provider validation. Other suites retain DataForSEO HTTP/body/cost error, concurrency, tenant, approval, publication and RLS coverage.

Authenticated browser tests use a temporary QA login/membership which is removed afterward, real read-only RLS access, and in-memory fixtures for interaction checks. No real business decisions or artifacts are created. Desktop/mobile coverage includes research selection, spending confirmation isolation, disabled collection, selected evidence handoff and existing editorial/measurement regressions.

For code rollback, use the existing verified previous deployment (base commit `87c95972c375ff9f420da348fd038aed6f2d95e1`) under the established release process. Keep execution flags false. Do not reset database registrations, delete evidence, alter approvals or roll back article pointers. Additive artifact payloads remain readable by the prior application. Any later paid/model authorization must be explicitly disabled before rollback.
