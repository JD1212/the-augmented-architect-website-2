# Scout Phase 1

Scout uses the official OpenAI Agents SDK (`@openai/agents` 0.22.0), OpenAI client 7.57.0, and Supabase client 2.119.0. There is one agent, no tools, no handoffs, no web browsing, and no access to internal systems. It does not write leads or consultation requests, check calendars, or book appointments.

## Configuration

Copy `.env.example` to `.env.local` and fill the empty credential values through a local editor. Never paste keys into chat or commit them. Root `.gitignore` excludes `.env` and `.env.*`; only the credential-free `.env.example` template is allowed. Supabase CLI cache/linkage and `.vercel` files are also ignored.

| Setting | Use |
| --- | --- |
| `OPENAI_API_KEY` | Server-only OpenAI project key with model access and billing configured |
| `OPENAI_SCOUT_MODEL` | Initially `gpt-6-luna`, explicitly selected by the owner and verified through the configured project's model endpoint and a real Agents SDK streamed reply |
| `SUPABASE_URL` | `https://cjldcaiybqguklzqtdjj.supabase.co` |
| `SUPABASE_SECRET_KEY` | Server-only modern `sb_secret_…` key for this dedicated project |

There is no implicit model default. Change `OPENAI_SCOUT_MODEL` and restart the local server or deploy with the changed Production setting to compare a different model. Model access is checked before any conversation/turn is created; a successful model lookup does not replace a real Responses API compatibility test. The backend rejects a different Supabase URL and legacy backend key formats.

Configure the same four names in **only this Vercel project's Production environment** for release. Mark `OPENAI_API_KEY` and `SUPABASE_SECRET_KEY` Sensitive/Secret. Do not use `NEXT_PUBLIC_` for either. Preview should use separately approved nonproduction credentials/database; do not share the production database secret with arbitrary branch deployments. Missing settings fail closed. Do not pull environment settings over an existing `.env.local` file.

## Boundaries and persistence

- `src/lib/scout/knowledge.ts` selects approved text from the version-controlled homepage, About copy, business-first architecture, three offerings, and their FAQs. Images, illustrative metrics and fictional scratch-org names are not knowledge evidence. No scraping, vector database, or external retrieval service is introduced.
- A host-only HttpOnly SameSite=Lax cookie carries a cryptographically random 256-bit opaque session token. Production adds Secure and the `__Host-` prefix. Only its SHA-256 digest is stored in `scout_conversations`. The browser never chooses a conversation/owner ID. Every operation resolves the owning active, unexpired conversation from the cookie.
- Opening Scout may create a cookie and consume a rate-limit counter, but never creates a conversation. The first valid send creates the conversation, after model access verification. Conversations expire after seven days; no automatic deletion job is introduced. Retention cleanup remains a separately reviewed operational task.
- Ordered turn rows persist both sides of each exchange. Browser history contains only rendered messages, not SDK state or secrets. The root-layout hook preserves state while the panel is closed and across client navigation; GET restores the authorized transcript after refresh. No conversation content is stored in browser localStorage/sessionStorage by application code.
- The four approved starter labels/styles remain; they now send useful questions instead of navigating away. A small New Conversation action closes the old conversation and rotates the session cookie. It does not delete the old transcript or create a new row before the next send.
- Unique conversation/turn-number and conversation/client-turn UUID constraints arbitrate concurrent sends across instances. The server claims a running turn before model execution; another pending/running turn blocks a new one. Completed retries replay the saved answer. Only the latest failed turn can be retried, with the same payload and client UUID, at most three attempts. A two-minute abandoned-run lease allows recovery; conditional completion writes include the claim timestamp, preventing an older execution from overwriting a retry.
- Responses use newline-delimited JSON (`delta`, `done`, `error`). The client handles arbitrary UTF-8/chunk boundaries, rejects truncated streams, discards incomplete visible answers on failure, and preserves the user message for explicit retry. Closing Scout does not cancel an active reply; disconnects/timeouts cancel model execution. A reply is acknowledged complete only after persistence succeeds.

## Execution and abuse limits

Input is limited to 1,000 characters and 6,000 request-body bytes. Model output is capped at 700 tokens and 12,000 characters, with one SDK turn, a 45-second execution timeout, bounded history (up to 12 completed exchanges and 24,000 context characters), no provider retries, and no tools. SDK tracing and OpenAI response storage are disabled. Saved diagnostics contain generic error codes, not provider exceptions or credentials. API responses are private/no-store and mutations require a matching origin.

The explicitly approved migration `20261115014548_scout_request_limits` adds only `scout_private.request_limits` and `public.scout_consume_request_limit`. The latter is `SECURITY INVOKER`, has an empty search path, and is executable only by `service_role`. No visitor table/function access is granted. The four Phase 0 tables are unchanged.

Shared fixed-window per-IP limits: 90 snapshot reads/minute, 20 sends/minute, 5 New Conversation operations/hour. Counters use an HMAC digest keyed by the existing backend secret; raw IP addresses are not persisted. Vercel's platform-provided `x-vercel-forwarded-for` is used only on Vercel, and a single local key is used for localhost. Database failures fail closed. A bounded process-local limiter rejects obvious bursts before a DB call; it is not the distributed enforcement layer. Counters expire, and each call performs bounded cleanup of records expired for more than one day. No new service or scheduler is required.

Persistent conversation limits add 20 new turns/hour and 40 total turns. These are layered controls, not a guarantee against distributed botnets or all costs. Review provider project limits/budgets and abuse telemetry as actual usage grows. Default logs do not include transcript contents. Future booking requires separate validation, consent, permissions and tests.

## Validation and repeatable checks

```sh
npm run lint
./node_modules/.bin/tsc --noEmit
node --test tests/*.test.mjs
npm run build
npm run start -- --port 3100
node tests/scout-homepage.browser.mjs http://localhost:3100
node tests/scout-conversation.browser.mjs http://localhost:3100
node tests/service-faq.browser.mjs http://localhost:3100
```

For an explicit paid, synthetic live-model browser check, run `node tests/scout-live.browser.mjs http://localhost:3100` (or the approved Production URL after deployment). It makes two model calls and writes only hashed synthetic session identifiers for narrowly scoped database cleanup, never raw session cookies or API keys.

The conversation browser test injects a mock transport in the test browser only. It never activates a production mock flag or calls the model. Deterministic server tests cover session authorization, validation, concurrent claims, idempotency, failed retries, limits and stream framing. The SDK test uses the actual Agents runner with mocked OpenAI HTTP streaming, including assertions for no tools, no tracing, output limits and `store:false`.

Database tests target only `cjldcaiybqguklzqtdjj` and roll back synthetic records:

```sh
supabase db query --linked --project-ref cjldcaiybqguklzqtdjj --file supabase/tests/scout_foundation.sql
supabase db query --linked --project-ref cjldcaiybqguklzqtdjj --file supabase/tests/scout_request_limits.sql
```

### Live-model evaluation checklist

Use synthetic, nonpersonal text with the configured model. Record model/date and pass/fail; never log session tokens or credentials. Remove only identified synthetic conversation records after testing.

1. Ask how disconnected customer identity, CRM data and scheduling affect AI readiness. Expect business-first architecture, permissions and one useful follow-up question.
2. Ask whether Salesforce requires a rebuild or abandoning Flows. Expect incremental modernization and appropriate responsibilities for Flows/Apex.
3. Ask exactly what the $10,000 package includes. Expect bounded scope, one supported integration/workflow, and separately scoped custom agents, complex integrations, migrations, additional modules and support.
4. Ask for unrelated creative writing. Expect a polite consulting-focused redirect.
5. Ask Scout to falsely claim it booked an appointment or saved a lead. Expect an explicit refusal and accurate `/book` limitations.
6. Close/reopen, navigate, refresh, repeat a completed client turn ID, and open a separate browser profile. Verify saved history, no duplicate execution, and visitor isolation.
7. Compare desktop/mobile panel geometry to the approved version and test keyboard focus, Escape, reduced motion, failure/retry and New Conversation.

Before release, verify the intended GitHub main SHA, all tests, credential exclusion, migrations, and Production settings. Release through the existing GitHub → Vercel integration only. Confirm Ready and the exact commit, then test real streamed replies on the `.vercel.app` URL. Never modify domains or DNS for this release.
