# Scout database — Phase 0

This directory prepares the database only. The website and Scout remain frontend prototypes; there is no database client, chat backend, agent runtime, or calendar integration in this phase.

## Dedicated hosted project

| Setting | Value |
| --- | --- |
| Display name | Augmented Architect Website 2.0 |
| Project reference | `cjldcaiybqguklzqtdjj` |
| Organization | JDs Projects (`afhfxwmmnrrutczmibvm`) |
| Region | `us-east-1` — North Virginia |
| API URL | `https://cjldcaiybqguklzqtdjj.supabase.co` |
| Approved additional compute quote | $10 USD/month; additional usage is billed under the organization's plan |
| Migration | `20261115003408_scout_foundation` |

The project was initially created as `augarch-scout-production`, then renamed at the owner's request. Its reference is unchanged. It is independent of every other application and Supabase project. **Do not substitute a similarly named project or apply these migrations to another database.**

`config.toml` identifies the local CLI configuration, not a remote link. Always specify the exact project reference for hosted operations. CLI temporary linkage/cache files are ignored by Git. No database passwords or API keys belong in this directory.

## Tables and security

- `scout_conversations`: UUID, unique hashed session ownership, active/closed/expired status, creation/activity/expiration times. Expiration is mandatory; a retention period is not silently selected by this migration.
- `scout_conversation_turns`: one ordered user/assistant exchange per row, unique conversation/turn number and conversation/client-turn UUID, structured state, execution status/timestamps, optional model usage and diagnostic metadata.
- `scout_leads`: name, email, owning conversation, and creation time. No global customer directory or cross-conversation email identity is created.
- `scout_consultation_requests`: lead and matching conversation, unique submission UUID, summary, optional service interest, requested instant and explicit IANA timezone, request/review times. Every insert must be `pending_confirmation`, including inserts by an administrator. A request does not reserve a time or create a calendar event.

All four tables have RLS enabled and forced, with **no visitor policies**. Grants to `PUBLIC`, `anon`, and `authenticated` are revoked. This deliberately denies all direct visitor access, including anonymous Supabase Auth users who receive the `authenticated` role.

The server `service_role` receives only:

- `SELECT`, `INSERT`, `UPDATE` on conversations and turns.
- `SELECT`, `INSERT` on leads and consultation requests.

It cannot delete/truncate records or review requests. Future confirmed/declined/cancelled transitions require a database administrator (`postgres` or `supabase_admin`) and a review timestamp; no administrator UI is implemented. The validation trigger uses `SECURITY INVOKER`, an empty search path, and an unexposed `scout_private` schema with no visitor/server execute grants. No public RPC or `SECURITY DEFINER` function is added.

Supabase's security advisor may report four **informational** `rls_enabled_no_policy` notices. These are intentional for this server-only design: adding a visitor policy would broaden access. See [Supabase's explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

The initial performance advisor also reports [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), expected for an empty database, and the default Auth allocation of 10 connections ([production guidance](https://supabase.com/docs/guides/deployment/going-into-prod)). The indexes support foreign keys/expiration and are retained. Supabase Auth is not used by this phase; revisit connection allocation if that changes or the instance is resized. No warning/error-level database advisories were found during Phase 0 verification.

### Required checks in the later backend

The database foundation does not yet implement application session authorization. A server secret bypasses RLS, so the backend must:

1. Generate a cryptographically random session token with at least 256 bits of entropy; store only its lowercase SHA-256 digest in the database. Send the opaque token in a Secure, HttpOnly, appropriately scoped SameSite cookie. Do not accept a client-supplied owner or token digest as authorization.
2. Verify the token, conversation ownership, active status, and expiration before every conversation, turn, lead, or consultation operation. Scope child records to that authorized conversation; IDs alone are never authorization.
3. Allocate turn numbers safely under concurrency, reuse client turn IDs/submission references for retries, and reject replays with different payloads. Unique constraints prevent duplicate records but do not implement replay-response handling.
4. Validate input, apply appropriate abuse limits, sanitize persisted agent state/diagnostics, and decide retention and cleanup before enabling public endpoints. No usage-counter infrastructure or scheduled cleanup is created in Phase 0.
5. Validate requested appointment dates and business availability separately. `requested_start_at` stores an instant; `timezone` preserves the visitor's explicit IANA zone. Never claim a request is confirmed before administrator review.

## Reproduce and verify

The migration was generated and applied with the installed Supabase CLI (reported version `2.117.0`). These commands require an authenticated CLI and target only the dedicated project:

```sh
supabase db push --project-ref cjldcaiybqguklzqtdjj --dry-run --skip-vault
supabase db push --project-ref cjldcaiybqguklzqtdjj --skip-vault
supabase migration list --project-ref cjldcaiybqguklzqtdjj
supabase db query --linked --project-ref cjldcaiybqguklzqtdjj --file supabase/tests/scout_foundation.sql
```

Review any future CLI version's `--help` before use. Do not run `db reset`, include seeds, or target another project. The SQL verification script creates only synthetic `.invalid` records inside a transaction, checks integrity/access restrictions, tests RLS even with temporary SELECT grants, and rolls back all records and grants. Run it as a database administrator. Failed assertions raise an error and must be investigated before proceeding.

## Future Next.js / Vercel environment

Nothing is configured in Vercel during Phase 0. Later server-only integration needs:

| Variable | Planned value / handling |
| --- | --- |
| `SUPABASE_URL` | Dedicated project's API URL above |
| `SUPABASE_SECRET_KEY` | A modern `sb_secret_…` backend key, obtained securely from this project's API-key settings |

Use the current [Supabase API-key conventions](https://supabase.com/docs/guides/getting-started/api-keys). Secret keys map to the `service_role` database role. Do not use a legacy service-role JWT for a new integration or put a privileged key in a `NEXT_PUBLIC_` variable. No publishable key is needed for this server-only plan. The application must import its future database client through a server-only module.

Production should eventually use this production project's values. Leave Preview unconfigured until an isolated nonproduction database is approved; do not copy the production backend key to arbitrary preview deployments. When that environment exists, use the same variable names with its own URL/key. No extra project/branch charge is authorized by this document.

Management access tokens and migration credentials are developer/CI infrastructure credentials, not Vercel application environment variables. No credentials are printed, retrieved for application use, committed, or installed in this phase.
