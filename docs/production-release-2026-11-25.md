# Marketing Intelligence release checkpoint — November 25, 2026

## Candidate and preserved work

The candidate is the committed `feature/content-strategist` tree, based on Production `bb942850e9b388bcb0c4fcb05c82fdce7efd1c0c`. Main is an ancestor: no Production-only commits are overwritten. Its 16 completed feature commits cover Content Strategist, Insights, direct publishing, Phases 1–3, owner imports, and editorial navigation. The final preparation commit adds only renderer-level CTA fallback, tests, and this runbook.

Independent packages remain separately versioned: SEO Analyst 0.5.1 at `484c7c5e2954debea731b81d7c751d88db945f46`; Content Strategist 0.1.3 at `39fb7d329e3dbe1c848b98a3aa6bde4d631042ee`. Website tarball SHA-512, lockfile, provenance and installed distributions must pass `node scripts/verify-agent-packages.mjs`.

Unrelated README edits, Scout documentation and the authentication proposal remain outside the candidate. AI Visibility branches are not merged. No Our Approach redesign, Phase 4 implementation, CRM integration, model runs or provider purchases are included.

## Database and configuration

Both publishing migrations (`20261125003457`, `20261125150841`) already exist in the shared dedicated website database. The deployed transition function body matches the latest migration. No migration or registration edit is required for this application release. RLS remains enabled on all marketing tables; the transition RPC is SECURITY INVOKER, service-role only, with active owner membership checks. The public reader returns an allowlisted projection from environment-scoped publication pointers, never draft records.

Production already has server-only Supabase, owner UUID authorization, Google federation, Scout and booking configuration. No Preview-only model or DataForSEO credentials are required for browsing, editing, approval or publication reading.

Keep `SEO_RESEARCH_PLANNING_ENABLED` and `DATAFORSEO_RESEARCH_ENABLED` absent/false. Content Strategist model execution is Preview-only and remains disabled. There is no autonomous scheduler or publication action. The existing manually triggered SEO analysis capability is preserved; do not invoke it during release checks.

`ARTICLE_PUBLISHING_ENABLED` is currently absent in Production. This leaves direct writes safely disabled. Enable it for Production only after final owner confirmation if the owner wants to publish there. That configuration change does not publish an article. Publishing still requires an explicit owner-confirmed Production action and exact-revision approval.

`publicationEnvironment()` resolves Production to `production`; Preview resolves to a branch hash. Production verification always requests `https://theaugmentedarchitect.com`; it never verifies against a staged hostname. Canonicals and sitemap use that same public origin. Do not attempt publication on the unpromoted Production candidate: its verifier intentionally targets the still-live public application.

## Article boundary

The two articles are approved and live only in `preview:ade57235db8ac1c0`:

- Governance guide: revision `5757e82a-a9d5-41d5-a42a-c1b6270f9fcd`, hash `54daaa823a49ee60954a38156cc3da6cb4d0b067cbce50a8e732996b7f33945c`.
- Red Queen article: revision `5e263659-5294-4f87-a86d-5014683825c1`, hash `0aaf6dba0b8645fdc61004ed68ef0c830907f38598d11290a9ea2deaa3093ef7`.

Neither has a Production pointer. Exact-revision content approvals are retained; they do not authorize a Production publication request. Preserve all Preview records, history and original Markdown. The shared renderer adds a consultation invitation only if none exists, without rewriting article data or hashes.

## Staging and final promotion

1. Validate the candidate locally and in protected Preview; obtain the owner's read-only authenticated smoke check. Do not click generation, research or publishing controls.
2. Create an immutable source archive from the exact committed tree, excluding unrelated working files. Link the deployment upload to the existing project/team only. This is release packaging, not another source repository or worktree.
3. Stage using `vercel deploy --prod --skip-domain`. Never use `--verify` or `vercel curl`: those can create an automation bypass. Do not add access-control settings or bypass secrets.
4. Confirm Ready, commit metadata, Production environment, and absence of public-domain aliases. Owner checks login, reports, saved evidence, approvals and disabled controls at the protected staged URL. Articles must remain absent from the Production listing and sitemap.
5. STOP. Report the exact candidate SHA, deployment ID/URL, validation, outstanding checks and optional publishing-flag activation. Do not merge main, promote, assign domains or publish without final confirmation.
6. Only after authorization, reconcile main without force-push and promote the tested staged Production build through the existing project. Avoid triggering a competing auto-deployment from the main push; inspect the Git integration outcome before deciding the final promotion sequence.

## Safe rollback

Before promotion, discard the candidate operationally by leaving it unaliased. Main, public domains and records are unchanged; no database rollback is needed.

After an authorized promotion, restore the known Ready deployment `dpl_3gSBwAZ3BNjDZg1fKpZpvTkrQH6j` (`the-augmented-architect-website-2-jvewcqh6b.vercel.app`, commit `bb94285`) using the existing Vercel rollback workflow. Verify the public site, owner login, Google reports, Scout and booking afterward. Vercel rollback may disable automatic Production aliasing: inspect that state before the next release.

Do not delete or downgrade agent registrations, approvals, revisions or history. Agent registrations upgrade only on an explicitly requested execution; no execution is part of this release. If a later execution upgrades the Production registration, assess older runtime compatibility before rolling code back. If articles have since been published, the old application may lack the new reader: prefer a compatible application fix or an explicitly approved unpublish action rather than deleting records. Record the rollback commit and deployment; use a normal follow-up Git commit, never force-push main.
