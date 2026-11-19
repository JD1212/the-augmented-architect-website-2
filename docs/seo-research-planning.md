# SEO Analyst: objective-led research planning

## Reuse and boundaries

The independent `JD1212/augarch-seo-analyst` package v0.4.0 extends the existing SEO Analyst; it is not another agent runtime. `src/planning.ts` in that repository exports the typed planning interface, bounded OpenAI Agents SDK execution, keyword grouping, scoring explanation and future observed-performance feedback contract. It contains no business IDs, Google properties, database clients or credentials.

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

Package tests execute the real SDK against deterministic mock model responses. Website tests cover cache scope/freshness, unknown data, host-derived budgets, deduplication, persistence, immutable decisions, tenant authorization and private API rejection. No live paid research or model run is part of this release verification. The existing DataForSEO result is real; newly generated plans in browser tests are clearly fixtures. End-to-end live planning quality still requires a separately approved controlled model run.

The engine can recommend gathering more evidence, improving an existing page or creating no content. It cannot yet execute an approved multi-step paid plan, research continuously, publish, schedule, or learn from performance that has not been observed. Provider keyword volume is an estimate, advertising competition is not organic difficulty, and report emptiness is not zero demand.
