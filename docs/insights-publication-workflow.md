# Insights: first article and repeatable release

## Current editorial review (not publication)

- Opportunity: `8750658d-3896-41a4-a386-cd6dc4bb7c8e`.
- Successful Content Strategist v0.1.2 execution: `f272238b-1d9f-4b35-9f25-baea42802639`.
- Original immutable revision: `bff81a15-e3ab-43f7-a92f-6e8534f9da6c` (`7298f4e1b33881fb14dd9ff711e3dd8d9359239f39aa0a20822ac6540f62145a`).
- Reviewed immutable revision: `5476b478-dcde-4b36-ada7-309f8375bc09`.
- Exact reviewed hash: `e683accea977957d8edced4d3e063ba36ffb6f46ae3ff61d2d433f9fe591ae3a`.
- Article: **Connecting AI Agents to Business Systems: A Practical Control Checklist**.
- Intended canonical URL (not live yet): `https://theaugmentedarchitect.com/insights/articles/connecting-ai-agents-to-business-systems-control-checklist`.
- Status: draft, no publication date, no publication approval or publication record created by this task.

The original generated revision and execution history are retained. Editorial changes add a clearly illustrative customer-account change workflow, shorten the commercial-scope paragraph, and polish the separate LinkedIn post. All source IDs, evidence snapshots, supported claims, and opportunity lineage are retained. No model was invoked for editing.

## Technical and source review

Checked November 24, 2026 against the original primary sources:

- [NIST AI RMF 1.0](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf): GOVERN inventory, accountability, oversight, monitoring, and lifecycle responsibilities (particularly GOVERN 1–3). This is a risk framework, not certification or a promise of compliance.
- [Microsoft: Secure AI with Zero Trust](https://learn.microsoft.com/en-us/security/saf/technologies/ai/overview): inventory, identity, least privilege, protected data, API/tool dependencies, trust-boundary validation, detection and response. The browser extraction includes a Microsoft sign-in notice, but the article body and source link are available.
- [OWASP Agentic Applications 2026](https://genai.owasp.org/top-10-for-agentic-applications-2026/): goal hijack, tool misuse, identity/privilege abuse, and cascading-failure categories. It identifies risks; it does not establish that any particular client system is vulnerable.

The step-by-step controls and account-change example are our architectural recommendations derived from these sources. They are not copied source prescriptions, measured results, or deployed client implementations. The example explicitly limits duplicate prevention to the provider's supported guarantees, rechecks authority after approval, and reconciles uncertain outcomes before retrying. There is no executable code presented as tested production software.

All inline citations resolve to numbered source entries; external sources retain their original URLs. Internal service and consultation links remain genuine links, with the existing booking provider opening Scout. The SEO title, description, one H1, H2 structure, clean slug, canonical, Open Graph and Article JSON-LD reuse existing utilities. Preview is noindex and has no invented author or date.

## Owner workflow

1. Select a research opportunity and approve it for drafting in the existing Opportunity Backlog.
2. Separately authorize one bounded generation when needed. Successful output is an immutable saved draft; generation does not approve publication.
3. Review the article, source evidence and separate LinkedIn draft in Content Strategist. Edit and **Save a new immutable revision**. Any changed revision needs its own channel approval.
4. Approve the exact revision for website publication. Approve LinkedIn separately. The controls show the approved state and prevent duplicate decisions.
5. Supply the explicit intended publication date and select **Prepare website release** → **Download approved release bundle**.
6. In the website repository, run:

   ```sh
   node scripts/stage-content-release.mjs /path/to/approved-article-release.json
   ```

   The helper serializes the approved article object and updates the existing registry automatically. It does not execute downloaded source, commit, deploy, call providers, or mark anything published. Git review, the server's exact-revision approval, tests and the deployment approval remain the trust boundaries; the JSON file is not an authentication credential.
7. Run tests, lint, TypeScript and build, verify protected Preview, then obtain explicit Production release authorization. No new React page is needed for subsequent articles.
8. Release through GitHub → Vercel Production. Verify the actual canonical URL, content revision, sitemap, and deployment commit.
9. Only after verification, use **Record an actual publication after publishing** with the actual date, canonical URL and full release SHA. The existing immutable record links channel, revision/hash, opportunity/finding, approval, evidence hashes and reporting baseline. Preparing an export or requesting a deployment never creates this record.
10. **Prepare linkedin release** becomes available after the matching website publication is recorded. It appends the confirmed article URL. Copy/paste manually into LinkedIn; record its actual post URL only after posting. No LinkedIn posting integration exists.

The protected editorial Preview shows a registry entry with status `draft` only on `feature/content-strategist`. Production and unrelated branches exclude drafts, including from sitemap and analytics registration. Promotion requires an explicitly dated, approved export; do not simply change a draft's status by hand.

## Measurement

Existing consent controls remain mandatory. Only published, server-registered article paths enter optional GA4 collection in Production. No Preview traffic, private draft, conversation, contact detail or booking ID is sent to GA4.

- `page_view`: sanitized canonical article path; existing navigation deduplication.
- `article_engagement`: 30 seconds of visible-page engagement, once per article per tab session.
- `article_consultation_start`: a consultation action from that article, once per publication per tab session.
- `consultation_booked`: existing authoritative confirmed result, deduplicated; `origin_publication_id` carries the last article consultation origin in that consented tab session, including across navigation/reload. This is session attribution, not proof that the article caused a sale. Existing `publication_id` describes the currently viewed article where applicable.

Google Search Console's existing Domain property covers these canonical paths. Published articles enter the existing sitemap with their explicitly supplied date; crawl timing and indexing remain Google's decision. GA4 custom dimensions for `publication_id` / `origin_publication_id` may be registered for convenient report filtering; no Google settings were changed in this task. No traffic, ranking or conversion result is claimed.

The existing publication baseline, immutable content revision and evidence lineage support the future Performance Analyst. CRM Prospector, Business Development Agent, new CMS, schemas, paid research and autonomous publication are outside this release.
