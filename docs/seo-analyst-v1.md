# SEO Analyst V1 — independent agent, website execution host

## Repository and reusable package

- Source repository: https://github.com/JD1212/augarch-seo-analyst (private).
- Local source: `/Users/jdburkholder/Documents/augarch-seo-analyst`, a separate sibling Git repository, not inside the website or Docker.
- Package: `@augmented-architect/seo-analyst@0.3.0`, source commit `4b086509df11e883ba179a44c65cc5ba442725f7`, tag `v0.3.0`.
- Reusable modules: `src/contracts.ts` (configuration, ports, evidence, outputs, limits), `instructions.ts`, `validation.ts`, `run.ts` (OpenAI Agents SDK runner), `index.ts`. No Next.js, Supabase, Google credentials/properties, tenant IDs, or business identity in that project.
- Integration artifact: `vendor/augmented-architect-seo-analyst-0.3.0.tgz`. Source revision and SHA-512 integrity are recorded in `vendor/seo-analyst.provenance.json` and package-lock. No private registry credentials are needed by Vercel.

## Application adapters

`src/lib/marketing/seo/` is server-only application glue:

- `config.ts`: pins the dedicated website database, tenant, and Google properties. Uses the existing OpenAI key; optional `OPENAI_SEO_MODEL` overrides the existing `OPENAI_SCOUT_MODEL` setting for this host only. No Scout configuration is changed.
- `context.ts`: supplies approved website content and the Salesforce consulting objective through dependency injection. Package instructions still treat content as untrusted data.
- `tools.ts`: rechecks live owner authorization before capability use. Reuses the existing read-only reporting adapters, pins properties, and restricts reports to the selected 7/28/90-day window. Uses a conservative completed-day boundary in both provider timezones, without changing dashboard reporting behavior. Website research reads approved local content; it is not an arbitrary URL fetcher.
- External research uses OpenAI Responses hosted `web_search`, documented at https://developers.openai.com/api/docs/guides/tools-web-search . It is limited to one hosted call with low context and returns provider-supplied citation URLs. Neither the agent nor its tools receive credentials. No arbitrary shell, database, booking, publishing, advertising or campaign capability is provided.
- `store.ts`: registers the package version in existing `marketing_agents`; claims a distributed execution lease with an atomic JSONB compare-and-swap; stores real execution progress/usage and completed artifacts/evidence.
- `service.ts`: the initial manually triggered host, joining authorization, package execution and persistence. It is not a new governed runtime or durable scheduler.
- `contracts.ts`: UI-safe status and provider-usage types.

`/api/admin/marketing/seo` checks owner UUID, live session, membership/RLS and same-origin protections. POST accepts only an execution UUID and a bounded date-window selector. The browser cannot select a tenant, model, property, credential, query, tool or publication action. GET is read-only. No new database tables or grants are introduced.

## Execution and evidence

The illustrated SEO Analyst profile is connected to real state, source-linked findings, execution history and reported provider tokens. Other agents remain Planned. Demo Mode cannot call execution endpoints and hides real findings; entering Demo is disabled while this tab is executing an analysis.

A unique request UUID prevents duplicate work. The host allows one active execution per tenant, ten minutes between starts, and at most six starts in a rolling day. Leases expire after five minutes. The SDK has a 150-second deadline, at most five analysis requests, 2,400 output tokens each, and a 160,000-byte cumulative host-visible input bound. External research has one request, 1,600 output tokens, and one hosted search call. No automatic model retries. These are bounded execution limits, not a promised currency cap: hosted retrieval context is provider-managed and actual usage is recorded separately.

Existing tables are used as follows:

- `marketing_agents`: independently versioned registration and host lease/budget metadata.
- `marketing_executions`: running/completed/failed status, progress, actor, actual provider receipts and timestamps.
- `marketing_reports`: actual Google reporting snapshots, including genuinely empty reports. External research is never disguised as a Google report.
- `marketing_artifacts`: one evidence bundle (`measurement`), plus each `opportunity` and linked `recommendation`, requiring owner review.
- `marketing_evidence`: links recommendations to actual Google report context, explicitly disclosing empty data. External citations remain traceable in the evidence bundle and each opportunity's selected source URLs.

Only a fully persisted execution becomes completed. The profile displays findings from completed executions, not partial failed artifacts. Abrupt host termination cannot guarantee a final failure write; an expired lease appears interrupted, and a later explicit run reconciles the stale row. No automatic replay occurs. Individual writes are idempotent, but the current REST persistence sequence is not one database transaction; a failed sequence may retain partial artifacts for audit without exposing them as completed findings.

Token receipts come from actual API responses, including external research. Missing usage remains unknown. Failed/interrupted requests may not return usage. Currency cost remains null/“Not reported”; no token-based estimate is described as measured provider billing.

## Future Augment integration

Augment can import the same package, validate `configSchema`, map its governed access packages onto `SeoTools`, and provide a `ModelProvider`, abort signal and progress/usage callbacks. It can persist `SeoResult` through its own authorized lifecycle. Business identity and authorization remain host responsibilities. No Augment service, governance system, DigitalOcean harness or agent-manager repository is modified.

A future adapter must preserve tenant/property boundaries, budgets, source provenance and explicit owner approval. Recommendations are research proposals, not published changes. Schema validation can enforce citations and provenance but cannot prove every natural-language inference; owner review and focused factual review remain necessary.

## Initial Preview failure and correction

The initial v0.1.3 request was rejected by OpenAI with HTTP 400 `invalid_json_schema`: the generated `sourceUrls` item schema contained unsupported `format: uri`. It produced no model output or hosted research, and its failed execution was retained with unknown usage. V0.1.4 sends a compatible string shape to the provider and still applies the original full URL/provenance validation before accepting results. Schema compatibility and invalid/unlisted/unsafe URL rejection are covered deterministically.

Provider request failures are classified by status/code rather than searching message substrings. Safe diagnostics retain the phase, provider code and parameter without raw prompts or credentials. The client refreshes status after both success and failure without retrying POST. Registration upgrades preserve the stable agent ID, history, disabled state, lease and budget counters; older code cannot downgrade a newer registration. Existing failed records are not deleted.

## Second failed execution: verified facts versus reconstructed defect

Execution `095a4fe9-fbca-46c2-a163-70f339ff28a5` reached final validation under v0.1.4. It recorded three analysis responses and one hosted-search response: 22,506 input and 1,904 output tokens. Its exact validation rule and rejected references were not retained. Both response retrievals returned 404 with storage disabled. No precise historical rule or citation-mapping cause can be established from that telemetry alone, and no such cause is backfilled into the original record.

Source inspection and a deterministic reconstructed fixture demonstrate a real adapter defect: discovered URLs were inserted first, citation annotations updated/appended later, and only the first 15 entries were returned. This could drop a real cited URL while retaining it in research prose. The corrected collector prioritizes provider-annotated citations, fills remaining capacity with discovered sources, and explicitly rejects more than 15 citations instead of silently dropping any. URLs are neither guessed nor normalized into unverified aliases. This proves the defect and fix, not that the unavailable historical response had this exact shape.

V0.1.5 adds typed validation rule/path diagnostics and a bounded reference-only snapshot on rejected results. The host stores fingerprints and public path displays, never URL query values/fragments, raw prompts, full provider bodies or rejected recommendation prose. The actual redacted failure-envelope fixture preserves known counts and missing diagnostic fields. The source-catalog regression is explicitly reconstructed. A mocked host-to-store regression verifies persistence of the precise redacted rule/path/reference mapping and provider receipts, lease release, and duplicate-request suppression.

The citation correction was verified in protected Preview. The owner’s next execution, `d011de2d-003c-4033-81c7-9d8aa6c2fefc`, completed successfully under v0.1.5 with three persisted opportunities and evidence, 22,572 input tokens and 2,001 output tokens. Both failures remain unchanged. The subsequent v0.2.0 continuity and review release is documented in [opportunity-backlog.md](./opportunity-backlog.md); it requires protected Preview verification before Production and no further paid analysis for deterministic verification.

The v0.3.0 saved-intelligence contracts and gated provider foundation are documented in [opportunity-intelligence.md](./opportunity-intelligence.md). Existing successful and failed executions remain historical records of their original package versions.
