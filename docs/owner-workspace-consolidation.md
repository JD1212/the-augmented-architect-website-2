# Owner workspace consolidation

This is a private-workspace presentation update on top of Article Performance Reporting. Public pages, database schema/RLS, credentials, independent agent packages, execution policies, publishing services, source validation and attribution logic are unchanged.

## Screen changes

- **Overview:** four real-count filter buttons, searchable/paginated work queue with existing next-action links, Activity & Decisions / Website Performance tabs. Count definitions remain the existing workflow definitions; counts may overlap. Preview publications stay separate.
- **Discover:** existing Opportunities / Keywords & Research / SEO analysis deep links. Opportunity reviews open in focused panels and retain selection on close. Research planning and paid collection use separate panels and clearly distinct authorization. Saved evidence/eligibility remain visible; provenance and usage stay under Advanced Details. Keyword groups paginate; existing research history opens in a panel.
- **Create:** clear approved-research, import and continue-draft entry points; import and draft selection use focused dialogs. Article/LinkedIn preview and editing are in place. Imported Markdown, SEO fields and immutable revisions use the existing services. The import inventory response now exposes only a boolean saving-availability indicator, never credentials; unavailable saving is stated and disabled.
- **Publish:** compact, non-clickable workflow status; in-place editor and preview; prominent Published state, destination and URL. Website exact-revision approval and explicit publishing/withdrawal remain separate. LinkedIn approval and manual posting remain separate.
- **Measure:** existing Articles, Traffic, Google Search, Consultations & Scout. Articles gains search, sorting and pagination; existing performance panel and missing-data rules remain. Chart accents distinguish clicks, impressions, traffic and bookings.
- **Agents:** existing cards/artwork open focused details through existing agent deep links. Closing retains selected agent and mounted editor state. SEO Analyst and Content Strategist remain independent packages. Performance Analyst remains Planned; no speculative CRM agent is added.
- **Activity:** Reporting Activity / Agent Executions / Recommendations & Approvals tabs; server-paginated metadata, text filters, execution-status and artifact-type filters. Expandable audit metadata contains no prompts, private payloads, diagnostics, credentials or model response bodies. Existing history is not changed.
- **Integrations:** connection status and retrieval times remain visible; configuration, permissions and limitations are expandable.
- **Settings:** existing owner/account/security facts, without speculative future settings.

## Shared controls and security

`workspace-ui.tsx` and its CSS module provide native modal dialogs with labelled headings, Escape handling, focus restoration/cycling, keyboard-operable tabs and pagination. `list-controls.ts` only slices already-authorized bounded inventories. No extra component library or dependencies are added.

The existing Activity API keeps its backward-compatible summary response. Optional `stream`, `page`, `q`, `status`, `kind` parameters select fixed tables/columns with explicit tenant predicates and the existing verified owner session/RLS. Pages are 10 records; maximum page 10,000; text is limited to 100 characters and escaped for literal wildcard matching. Stable timestamp/ID ordering, exact counts and bounded ranges replace the old display-only 12-record ceiling. Running/interrupted filters use the existing five-minute read-only status projection. No history or state is rewritten.

Publishing, model execution and paid research controls use existing server authorization. A UI action never enables a capability. This feature branch adds no credentials or spending approval; capabilities needing branch-specific configuration remain unavailable. No live models, paid research, real editorial decisions or publication actions are used in regression testing.

## Validation

Unit tests cover pagination, safe search, bounded tenant-scoped Activity reads, rejected filters, owner denial, metadata-only responses and sanitized errors. Existing agent, publishing, content-import, reporting and security regressions remain in the suite. Browser tests use a temporary QA session and fixture content/actions for the complete Discover → Create → Publish → Measure workflow; no real marketing artifacts, approvals or publications are written. Temporary QA access is removed after each run.

Protected Preview only. Production promotion and live end-to-end agent tests require separate authorization.

Verified locally on November 25, 2026: 376 unit tests passed; two existing live-model checks were skipped. The combined authenticated Chromium browser suite passed 204 checks, including 1440/768/390/320px layouts, owner-authorized real metadata reads and fixture-only editorial/research actions. TypeScript, lint and production build passed. Mobile verification uses viewport emulation, not a physical phone or real Safari. Both independent package artifacts and lockfile integrity remain verified at SEO Analyst 0.5.1 / Content Strategist 0.1.3.

## Second owner UX pass

The `45b796c` checkpoint is preserved. Discover now leads with Explore Opportunities and Start New Research. The guided service/goal/scope flow uses the existing planning service and shows evidence sources, availability, reporting limits and unavailable model-cost estimates honestly. It makes no request for paid evidence and never runs a model when opened. Saved plans open read-only; recording a decision requires Review decision.

Create and Publish share an article library, displaying saved article titles instead of research-opportunity titles. Needs review / Approved / Published filters use existing lifecycle projections. Only verified, current drafting approvals enter the generation picker. Opening a saved article is read-only; explicit Edit enters Content / SEO Metadata / Preview in the same surface. Cancel warns before discarding; Save uses existing immutable revisions. The generation-scope tab preserves separately authorized regeneration. Review for Publication carries the selected record/revision to the existing approval controls. No selected-record progress navigation remains.

Shared panels warn before discarding dirty fields; reload and link navigation also warn. Research decisions, article editing and importing are explicit modes. Agent panels open on Overview with Actions and Details separate; editing an article is kept in Create rather than nesting an editor within an agent modal. Stage accents are blue / violet / teal / warm amber.

No agent package, execution contract, reporting/attribution service, database schema, RLS, credentials, immutable revision, approval or publication has changed. `articleTitle` and `draftingApproved` are additive owner-only workspace projection fields, not new agent contracts or persisted approvals. Existing keyword/analysis deep links remain supported. Production publication pointers are never copied to a Preview scope; a new branch's public Insights listing may intentionally be empty even while both Production articles remain in the private article inventory and at their Production canonical URLs.

Second-pass validation: 376 unit tests passed with the two existing live-model checks skipped; 68 authenticated desktop/mobile browser checks passed, including Escape/discard rejection, edit-entry/return focus, explicit mock saves, old live-revision preservation and exact-revision navigation into Publish. No model, research, approval or publishing action was invoked by the second-pass browser scenarios, even through fixtures; only explicit mock Save actions created in-memory revisions. Temporary QA authentication was removed. TypeScript, lint, production build and both independent artifact integrity checks passed. Physical-device/Safari verification remains outside this Chromium-emulation test environment.

## Focused Publish regression correction

The selected article now exposes persistent **View Article**, **Edit Article**, and **Review & Publish** actions. Review & Publish works inside the same panel from either Create or Publish; website approval is immediately below the publication status, labelled **Approve Website Revision**, while LinkedIn has its own review checkbox/approval action. An existing exact website approval is displayed without asking for another review. Production publication authorization remains a separate, destination-specific confirmation enforced by the existing server service.

Website publication/draft approval and LinkedIn draft state are separate owner-only read projections. A pending LinkedIn draft does not relabel a live website article. A verified Production URL produces **Published / View Live Article** even when the selected Preview destination has no publication. Read-only Preview configuration does not expose unusable publishing input fields.

Confirmed Preview Article defect: its focused-mode handler previously selected the already-active `article` tab, producing no visible change. It now opens a distinct, in-place rendered-preview state using the same article renderer, with a clear heading and Back to Article action. Editor opening waits for the saved record and moves focus after that record loads. Article/SEO/History remain concise read-only tabs; revision IDs stay in Advanced Details.

Discover keeps its table and uses Start New Research as the primary action. Saved tools are secondary; the guided sequence and next steps distinguish planning, keyword collection and SEO analysis. Eligibility manifests remain under Advanced Details. No research contract, spending control or agent changes.

Validation: 376 unit tests passed (two live-model checks skipped), TypeScript, lint and production build passed. 45 authenticated local browser checks passed at 1440px and 390px, including the full Select → View Article → Review & Publish → Close flow, the reproduced Preview-button regression, Edit/cancel, live-website/pending-LinkedIn separation and Preview isolation. Browser scenarios invoked no write/approval/publication/model/research operation even through their fixture transport. Actual positive owner-session verification of the deployed protected Preview remains a separate final check; no user impersonation or authorization changes are used to obtain it.

### Functional usability correction — Discover, Create and Publish

- Sidebar Discover and Explore Opportunities open the opportunity list without inheriting the previous article's selection; explicit opportunity deep links still open the finding.
- Opportunity review prioritizes audience, search opportunity, evidence, next action and decision. Scoring, identifiers and assignment details remain expandable.
- Create uses Generate Article / Write / Import Article / Continue Draft. Research selection lists approved choices and explains unavailable choices; it never executes an agent. Saved drafts open read-only.
- Research scope shows evidence sources, availability and an explicit Run research planning button (disabled when not authorized). Saved plans and keyword evidence stay secondary.
- Fixed the library CSS rule that suppressed styled action buttons. Existing View Article / Edit Article / Review & Publish and separate website/LinkedIn controls are retained.
- Automated interaction coverage exercises the requested nine steps at desktop/mobile widths, with authenticated local owner API reads and in-memory decision/publication states. It also opens both actual public articles in the browser. No business decisions or content writes occur.
- Protected Preview still requires the owner's signed-in walkthrough. Local fixture tests and deployment protection checks do not establish positive authenticated behavior in the deployed environment. Do not mark that check complete without confirmation.
