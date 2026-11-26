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
