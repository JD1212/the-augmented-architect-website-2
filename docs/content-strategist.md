# Content Strategist V1

## Source and integration

The independent source project is `/Users/jdburkholder/Documents/augarch-content-strategist`, repository `JD1212/augarch-content-strategist`, package `@augmented-architect/content-strategist` v0.1.0. It does not depend on Next.js, Supabase, Google, or a particular business. Its `src/contracts.ts`, `instructions.ts`, `validate.ts`, and `run.ts` define the inputs, editorial instructions, evidence validation, and bounded OpenAI Agents SDK execution. Authorization and verified-source reads are injected by the host. A later Augment host can supply these interfaces without importing the website adapter or rebuilding governance.

The website uses an integrity-checked local package artifact in `vendor/`, with its source commit and SHA-512 in `content-strategist.provenance.json`. The SEO Analyst dependency remains v0.5.0. No agent registration is changed by installing this package; Content Strategist registration occurs only after an authorized generation request.

Website adapters:

- `src/lib/marketing/content/grounding.ts`: reconstructs facts from structured saved evidence, normalizes source URLs, computes receipt freshness, and creates the approved assignment input. Historical model prose is not factual authority. Missing values remain unknown and zero remains zero.
- `sources.ts`: independently reviewed primary-source notes, locations, review timestamps and snapshot hashes. Current notes cover NIST, Microsoft and OWASP. These are bounded paraphrases, not full document captures. Topics without sufficient reviewed sources must request evidence.
- `config.ts`, `repository.ts`, `service.ts`: server gates, existing tenant-scoped marketing tables, immutable revisions, single-run reservation, agent lease, actual usage and failure diagnostics.
- `publishing.ts`: existing file-article conversion, reviewable source export, manual LinkedIn preparation, and owner-attested publication records. It never writes website source, commits, deploys or posts to LinkedIn.
- `src/app/api/admin/marketing/content/route.ts`: owner-only, same-origin, no-store API. Tenant/model credentials cannot be supplied by the browser.
- `src/components/marketing/content-studio.tsx`: existing AI Agents workspace, draft review, editing, feedback and exact-channel approval controls.

## Grounding and history

For opportunity `8750658d-3896-41a4-a386-cd6dc4bb7c8e`, the saved Search Console flag and query count are read from the original structured report, not the SEO Analyst's narrative. The structured source says actual search data is present and the relevant query has four impressions. Keyword freshness is calculated from original receipt expiry at execution time. Old analyses, decisions and evidence remain unchanged.

The original assignment hash and evidence-bundle ID are retained. Only the explicitly approved finding is eligible. Source snapshot hashes and citation maps travel with each immutable revision. External evidence is untrusted content, never an instruction. Citation validation ensures approved source IDs and exact supporting excerpts from reviewed notes; editorial approval still requires human assessment of the claim and its relevance.

## Owner workflow

1. Open the Opportunity Backlog, inspect the actual finding and evidence, then explicitly approve it for drafting. A pending opportunity cannot generate content.
2. Open AI Agents → Content Strategist. Inspect reconstructed facts, limitations and reviewed sources.
3. Obtain separate authorization for one live run. Only then configure the branch's OpenAI credential/model and set `CONTENT_STRATEGIST_ENABLED=true` with a new `CONTENT_STRATEGIST_APPROVAL_ID`.
4. Click Generate once. The default limits are three model requests, 150 seconds, 6,000 output tokens per request (18,000 total maximum), bounded source reads and aggregate input bytes. Retries and external research are disabled. The single-run approval is consumed even on failure; another run requires a fresh authorization.
5. Review website and LinkedIn drafts, citations, factual limits, actual usage and diagnostics. Save edits as new immutable revisions. Saved feedback can inform a separately authorized revision run.
6. Approve the exact current revision independently for each channel. New revisions do not inherit prior approvals.
7. Supply a publication date and prepare the website source export. Add it to the existing article registry only through a separate reviewed Git change, tests, protected Preview and authorized Production release. Existing-page or solution-page outputs remain reviewable change proposals.
8. Record the actual website URL after publication. LinkedIn initially uses copy/paste; an article-link post waits for the recorded website publication. Record the actual LinkedIn post URL afterward.

Publication metadata includes publication ID, immutable revision ID/hash, channel, canonical URL, explicit date, optional full release commit, source evidence/hash references, owner approval and baseline reporting periods. Recording is explicitly owner-attested and is not independent verification that the URL is live.

## Measurement

Only registered published article paths are eligible for page-view and `article_engagement` analytics. Engagement means 30 continuous visible seconds, deduplicated within the tab session; it does not claim article completion. The publication ID is an opaque identifier. Existing consent requirements apply; private drafts, owner feedback, conversation content and arbitrary URLs are excluded. No Performance Analyst or automatic outcome attribution is implemented.

## Validation and safety

Run `node --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`. Package checks are `npm test` (includes its TypeScript build). `CONTENT_AUTH_TEST=1 node --env-file=.env.local tests/content-studio.browser.mjs` is an opt-in authenticated local test: it creates and removes a temporary QA login/membership, reads the real pending opportunity, verifies generation is server-disabled, then uses browser-only fixtures for all content decisions, edits, approvals and publication actions. No real model, email, research or publication action occurs.

The protected Preview must keep generation, paid research and publishing disabled until separately authorized. Branch-only Supabase access enables explicit owner decisions and edits; it does not authorize any decision or execution. No schema migration, Production deployment or live draft is part of this implementation verification.
