# Marketing Intelligence workspace

The authenticated `/admin/marketing` application has a scoped dark design system in `src/components/marketing/marketing.module.css`. Public pages keep their original design. Company Login lives in the footer. Private routes omit public navigation, consultation controls, Scout, public analytics, and business structured data.

## Views and data

The sidebar uses validated `view` query parameters within the same server-protected page. Overview, Marketing Analytics, Search Intelligence, Conversions, Activity, Integrations, Settings, and planned agent detail views share the existing owner guard. Unknown view/agent values cannot select arbitrary resources.

GA4 and Search Console adapters remain read-only and keyless. Prior-period comparisons use the same adapters, tenant-scoped snapshot cache and equal-length, non-overlapping date ranges. Count percentage changes are withheld when either period has fewer than ten observations. Distinct users are never derived by summing daily users. Search CTR and position retain the adapter's correct calculations. No causal claims are inferred from comparisons.

The GA4 adapter additionally requests daily observed consultation/Scout events. Snapshots created before that addition may omit the daily breakdown until the existing five-minute cache expires. Missing dates are not filled with invented zeros. Starts, opens, and successful-booking browser events are shown separately; no misleading funnel percentage or complete first-party booking total is inferred. GA4 consent, latency, threshold and timezone limitations remain disclosed. Search Console uses final web data and its own reporting timezone.

`GET /api/admin/marketing/activity` reads a small, explicit metadata projection from existing report, execution and artifact tables. It checks origin and owner authorization, uses the owner's JWT with tenant RLS, and returns no report payloads, diagnostics, prompts, private credentials or usage records. No schema changes.

## Demo Mode

Live reporting is always the initial mode, including after refresh. Demo selection exists only in React state, never persistent storage or the URL. The demonstration fixture module is imported only by the client workspace. Activating Demo aborts pending reporting/activity requests, clears live state, and renders simulated data with a prominent banner and repeated source labels. No demo data is sent to an API or database. Returning to live clears demo output and fetches genuine reports. Demo does not fabricate agent runs or approvals.

## Agent UI foundation — no agent execution

Three illustrated identities are defined in `src/content/marketing-workspace.ts`:

- SEO Analyst: search evidence and focused opportunities.
- Content Strategist: approved opportunities to briefs and drafts.
- Performance Analyst: historical measurements and outcomes.

All are explicitly Planned. Cards lead to a reusable detail component covering planned tools/context, execution history, evidence/approvals, and unavailable usage/cost/runtime. No agent definitions are inserted, and no model, runtime, scheduling, publishing or autonomous action is enabled. Activity displays actual existing metadata when present. There are currently no registered marketing agents or executions.

Next phase: register versioned agents in the existing `marketing_agents` schema, implement server-only OpenAI Agents SDK tools around the same reporting adapters, persist executions/evidence/recommendations with tenant-scoped ownership, and require owner approval for content or external actions. Tool execution must independently enforce owner/tenant authorization. Distinguish observations from hypotheses and measured provider usage from estimates.

## Security and accessibility

Existing UUID allowlist, live-session and database membership checks, RLS, no-store/noindex responses, disabled public registration, secure HttpOnly cookies and optional-MFA policy remain intact. No credentials or environment configuration change. Public navigation has no admin links except the discreet footer login.

Mobile navigation uses a native modal dialog with Escape/focus handling. Charts have labeled keyboard explorers and exact data tables. Reduced-motion settings disable hover motion. Empty/unavailable results stay distinct from genuine numeric zero.

### Outstanding recommendation

Supabase leaked-password protection (Have I Been Pwned) remains a separate owner configuration recommendation. Enable it through the dedicated project's Auth settings when ready and verify password policy compatibility. This visual release neither changes password policy nor removes authorization requirements.

## Release checks

Run lint, TypeScript, unit tests, production build, then `MARKETING_AUTH_LIVE=1 node --env-file=.env.local tests/marketing-auth.browser.mjs` for a temporary-account login/MFA/UI check. That script creates no emails or appointments and cleans up its account, server, and single browser. Run the existing public SEO, consent analytics and Scout booking browser suites sequentially. Validate real reporting access with the existing read-only live test. Release through a feature PR Preview and the existing GitHub main → Vercel Production integration.
