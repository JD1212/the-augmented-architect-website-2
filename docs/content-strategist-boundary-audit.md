# Content Strategist model-to-agent boundary audit

Investigated November 24, 2026. No live inference, research purchase, approval or publication was performed. The original failed execution remains `02614e8c-bcf9-4b66-bda2-e624c2624ebb`, package v0.1.0. The instrumented patch is v0.1.1; its instructions and model limits are unchanged.

## Installed SDK execution path

1. Website `content/service.ts` validates the owner, approved finding and single-run configuration, then claims the existing execution/lease. Input is validated by the independent package.
2. Package `src/run.ts` constructs one Agent, one native `read_verified_source` tool, and the strict `content-package/v1` output schema. No handoffs, agents-as-tools, hosted search or publishing tools are registered. Tool arguments are a strict object with one required string `id`, maximum 100 characters; execution additionally checks authorization, snapshot equality and read bounds.
3. The wrapper budgets each complete ModelRequest before dispatch. The OpenAI SDK sends the existing Responses request with `store:false`, reasoning low, at most 6,000 output tokens and zero retries.
4. Installed `@openai/agents-openai` 0.22.0 `openaiResponsesModel.mjs:getResponse` rejects failed/incomplete provider envelopes before returning a normalized ModelResponse. Successful returns include normalized outputs, raw usage and providerData. The original package only captured usage after that return.
5. The Runner handles function calls, parses tool arguments and invokes the tool. Fatal tool errors are wrapped as ToolCallError. Alternatively, `Agent.processFinalOutput` uses JSON.parse and strict Zod parsing. Refusals, missing output, invalid tool identity and invalid structured output have distinct SDK failure paths.
6. Only after the Runner returns does package citation/substantiveness validation run, including exact supporting excerpts, approved links and inspected-source requirements. Only a validated result reaches immutable website revision persistence. No output text is saved as a draft merely because a provider returned it.

All these boundaries were inspected in the installed source and exercised with mocked provider responses through the real SDK. No SDK upgrade or private SDK internals are required by this patch.

## What the original 33,045 / 55 token receipt establishes

One normalized provider response was returned. Input/output lengths do not identify its output type. A brief tool call, refusal or short invalid structured output can consume few output tokens without producing an article. It is not evidence that an article was truncated. The SDK's incomplete/failed-envelope test throws before the original package's receipt callback, so the retained receipt does not match that first-response failure path. A subsequent failure remains possible.

The original phase was `model`; rule, path and HTTP status were null. Final package citation validation and persistence were not recorded as reached. Original output is unavailable (`store:false`, read-only retrieval 404), and the retained runtime logs contain no corresponding caught exception. No claim is made that a particular tool call, refusal, SDK error or budget rejection caused the historical failure. Historical attempted-request totals cannot be reconstructed; one returned response and its token counts are verified. Provider-reported cost remains unknown.

## Confirmed input-budget defect, separate from the unexplained historical exception

Replaying the current approved input with valid mocked source calls reproduced a concrete blocker: the next ModelRequest exceeded the 240,000-byte aggregate input budget before a second request was dispatched. The original canonical input was 111,771 bytes; its first mocked provider request was 132,218 bytes. Facts were supplied both at top level and inside website evidence; reviewed notes were also repeated.

The website now supplies report/source references in the assignment while retaining full authoritative facts and source notes in the canonical input. Each projected document retains its original-content hash. The approved assignment, source snapshots and historical records remain unchanged. The canonical input is 69,947 bytes (about 37% smaller).

The package uses a lossless columns/rows fact table for the model and source descriptors whose bodies are loaded by the existing mandatory authorized reader. Every fact field/value can be reconstructed exactly; the full canonical input is retained for validation and saved revisions. No notes are summarized away or numeric values truncated. All approved business content remains present.

With the actual approved context and solely mocked responses, the final replay successfully completed three requests, three source reads, schema parsing and citation validation. Provider JSON sizes were 71,000, 72,449 and 75,470 bytes; the package's cumulative budget counter was 219,075 bytes, below the unchanged 240,000 limit. These are byte measurements, not new live token counts. The mocked article is a test fixture, not a generated or published business article. This fixes the reproduced budget blocker, not a proven cause of the original null-diagnostic run.

## Future safe boundary evidence

- Independent optional `onBoundary`: model-request byte count, cumulative budget, SDK response types, declared tool identity, SDK-processing, tool execution/completion, schema and citation stages, and budget rejection.
- `summarizeResponse`: allowlisted status/incomplete reason, response identifier, output-type categories, refusal presence, declared tool name, safe argument/schema validation rules and paths, and numeric usage. Unknown names/keys and raw values are excluded.
- Website `provider-observation.ts`: observes the existing official Responses transport before SDK parsing, without adding requests or retries. Incomplete/failed response usage can therefore be retained even when the SDK throws before returning a ModelResponse.
- Website failure handling deduplicates raw/normalized usage, never invents missing counts/costs, and stores bounded safe metadata. No prompts, source bodies, tool arguments, raw refusal text or provider bodies are persisted in diagnostics. SDK redaction stays in force.

## Mock verification

Registered tools and final structured output; strict JSON schemas; malformed/unauthorized arguments; tool exceptions and snapshot mismatch; unsupported delegation; malformed JSON; missing output fields; premature/unverified citations; citation rejection after valid source dispatch; refusal; incomplete/failed envelopes; empty/reasoning-only responses; request/input bounds; HTTP 401; abort/timeout signals; and persistence failure. Successful host tests verify receipts are not double-counted. Failures do not publish or expose partial drafts.

Mocks exercise identified paths; they do not reconstruct the lost historical model output or establish live article quality.

## Registration and readiness

The patch introduces optional telemetry without changing instructions. The existing exact-version registration guard would reject v0.1.1 against the registered v0.1.0. A narrowly defined, compare-and-swap transition is prepared only for a future fresh owner-authorized claim with identical instructions, enabled registration and no active lease. Reads never update registrations; newer/different/disabled registrations are rejected. No database registration was changed during this audit. After an eventual upgrade, old code must not downgrade it; use a compatible forward fix for rollback.

The system is technically prepared for one separately authorized second test after review: the actual-context SDK replay passes, execution remains disabled, and the previous authorization is consumed. Original live cause and live editorial quality remain unverified. No new authorization is issued by this audit. Production, SEO Analyst, Scout, booking and public pages remain unchanged.
