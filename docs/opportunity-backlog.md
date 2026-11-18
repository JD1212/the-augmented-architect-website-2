# SEO Analyst V1: durable opportunities and owner review

## Release and migration plan

The website continues using the independent `JD1212/augarch-seo-analyst` package. V0.2.0 adds bounded historical context and a versioned draft assignment; it changes neither provider configuration nor execution budgets. Model-facing fields remain compatible with strict structured outputs; URL and prior-ID checks remain authoritative at runtime. Previously stored v0.1.5 analyses remain readable.

**No database migration, new table, grants, credential, or environment change is required.** Existing append-only marketing artifacts are sufficient. Keep the pending Scout identity proposal out of the release. Validate unit/security/browser checks and the production build, push the feature branch, verify its protected Preview with the owner, then fast-forward/release main through the existing Git integration. Production must serve the verified source revision. Do not perform another paid analysis merely to test deterministic behavior.

The first successful execution `d011de2d-003c-4033-81c7-9d8aa6c2fefc` remains the accepted v0.1.5 research baseline: three opportunities and their recommendations, evidence bundle, actual report snapshots and provider receipts. It reported 22,572 input / 2,001 output tokens; currency cost was not reported. The two earlier failed execution records remain unchanged.

## Persistent model

- An `opportunity` artifact is the stable identity, tenant, originating execution and original research. Existing IDs are reused without a backfill or mutation.
- A `recommendation` artifact points to that identity and an immutable execution evidence bundle. Later material changes append observations, preserving original claims and provenance.
- An `approval` artifact using `seo-opportunity-review/v1` records the action, resulting state, owner UUID, timestamp, note, exact approved finding, desired deliverable, previous review and request ID. No direct browser INSERT/UPDATE grant exists.
- Existing `content_draft`, `published_change` and `outcome` artifacts can later link to the opportunity. Their absence is displayed honestly. No publishing or outcome generation is implemented here.
- Created time is the root artifact time; updated time is the most recent accepted research/review event. No mutable timestamp column is needed.

Only findings from completed executions enter the backlog. Failed/partial artifacts remain historical records and are not represented as accepted research. Evidence remains immutable; an assignment references the exact approved observation, even if newer research arrives.

## Review transitions and concurrency

`pending → approved_for_drafting | deferred | rejected`

`approved_for_drafting → approved_for_drafting | deferred | rejected`

`deferred | rejected → pending` requires explicit Reopen.

The contract reserves `completed` for future verified completion; this phase does not mark content completed or published.

Every API read/write uses the existing live owner UUID, membership/session authorization and tenant scope. Mutations require same-origin JSON, bounded input and the displayed review/finding revisions. Privileged persistence is server-only. A deterministic UUID slot derived from tenant + opportunity + previous review competes through the existing primary-key constraint: one concurrent INSERT wins, another receives 409. Retrying the exact request returns its recorded result; changing its meaning is rejected. Existing records are never overwritten. Database RLS and direct-write restrictions remain unchanged.

## Continuity and duplicate prevention

Before analysis the host loads all accepted tenant opportunities and owner decisions. It injects at most 20 summaries, with a 15 KB opportunity-summary budget and disclosed omitted count. Rejected/deferred decisions are prioritized. Notes, action summaries and URLs are bounded; no credential is sent to the agent. Existing model request/input/time budgets still apply.

After analysis the host independently compares against the full backlog, including context omitted from the model. Normalized concepts, a versioned Salesforce topic vocabulary, and audience/vertical distinctions identify equivalent topics; title equality is not required. Current explicit topic families cover automation inventory/dependencies, Flow/Apex decisions and bulk/regression safety. General topics use conservative concept overlap. A model's existing-ID hint alone cannot merge identities or override a rejection. Multiple plausible matches or uncertain overlap fail closed for review rather than creating another identity. This deterministic matcher is deliberately conservative, not a universal semantic-equivalence oracle; expand its tested vocabulary when real evidence exposes a gap.

Equivalent findings reuse the stable ID. New source references, changed priority/basis/confidence, or material measured-data changes append an observation; unchanged wording alone does not create another opportunity. Owner status never changes automatically. Every completed run still retains its own evidence bundle and full validated analysis. No-new-opportunity runs may return an empty array and still complete; no quota is filled.

The existing distributed tenant execution lease serializes research reconciliation. Request UUIDs prevent replay; cooldown and daily limits remain intact. REST persistence is still a multi-write sequence, not a new transaction system: partial writes remain traceable but hidden until completion.

## Content Strategist handoff

`contentAssignmentSchema` in the independent package defines `content-assignment/v1`. The application derives it only from an approved opportunity, exact approved finding and original evidence. It includes business facts, audience/objective, existing pages, approved source references, deliverable type, style requirements, limitations and explicit draft-only/no-publish/no-spend requirements. The owner can inspect the assignment. Nothing is dispatched. Rejection or deferral removes the available handoff without deleting its prior approval history.

Future Augment integration can supply the same bounded history and read-only tool ports, persist results in its own authorized host, and consume the assignment through a governed access package. No Augment runtime, governance system or agent manager is duplicated.

## Future operating cadence (not enabled)

1. Daily: retrieve actual reporting data, compare durable snapshots and identify material changes. No model run when nothing relevant changed.
2. Weekly: perform bounded SEO research with prior decisions and published work.
3. On owner approval: explicitly assign an approved draft brief to the future independent Content Strategist.
4. After separate publication approval: record the actual publication URL/change.
5. Performance Analyst: compare real outcomes over appropriate reporting windows, distinguishing observations from hypotheses.

No cron job, recurring model call, second agent, automatic publishing, campaign change or spending is enabled.
