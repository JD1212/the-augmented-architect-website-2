# The Augmented Architect Website 2.0

Local, responsive Next.js 16 website built with TypeScript, Tailwind CSS 4 and the App Router. The approved reference is `public/reference/homepage-reference.png`.

## Architecture boundaries

The deployment platform is the existing Vercel project `the-augmented-architect-website-2` under JD Burkholder's projects. Website 2.0 remains independent of the existing public domain and other applications.

This repository remains independent of Augment, the security kernel, Salesforce packages, and other applications. Scout Phase 1 uses only its dedicated Supabase project (`cjldcaiybqguklzqtdjj`) and the official OpenAI Agents SDK. Do not connect other databases or runtimes. Preserve the approved visual design and homepage scope.

Presentation components, typed content, routes and metadata are separate. Scout's privileged integration lives in server-only modules behind `/api/scout`; its approved interface remains separate from model and database access. See [Scout Phase 1 setup and verification](docs/scout-phase1.md).

## Development

```sh
npm install
npm run dev
```

Open http://localhost:3000. Run `npm run lint` and `npm run build` for validation. Use `npm start` to serve a completed production build.

With a production preview running, use `node tests/runtime-comparison.browser.mjs http://localhost:3100` and `node tests/scout-homepage.browser.mjs http://localhost:3100` for the runtime dialogs and homepage/Scout flows. Both require Chromium; set `CHROME_BIN` if it is not autodetected.

## Edit the content

Website shell text, navigation labels, button labels, preview labels, accessibility labels, page copy and SEO titles/descriptions are in **`src/content/site.ts`**. Our Approach and About editorial copy are in the dedicated files under `src/content/` described below. Its `SiteContent` type checks the structure. Edit quoted strings and keep the property names intact.

- `hero`, `services`, `value`, `showcase`: homepage copy.
- `navigation`, `consultation`: navigation and consultation links.
- `pages`: the original route inventory. Service and secondary-page presentation copy now lives in the typed files described below.
- `seo`: page-specific metadata.
- `url`: the production origin used for canonical URLs, sitemap and robots: `https://the-augmented-architect-website-2.vercel.app`.

## Files and structure

- `src/components/`: modular header, brand, hero, services, business value, product showcase, footer, floating consultation button and SVG icons.
- `src/app/page.tsx`: homepage composition.
- `src/app/{ai-solutions,salesforce,about,contact,book}/page.tsx`: explicit, statically generated `/ai-solutions`, `/salesforce`, `/about`, `/contact` and `/book` pages. Other slugs return 404.
- `src/app/layout.tsx`: shared page shell and metadata defaults.
- `src/app/globals.css`: palette, typography, layout and responsive rules.
- `src/lib/metadata.ts`: metadata shared by each page.
- `src/app/sitemap.ts`, `src/app/robots.ts`: search engine routes.
- `src/app/icon.svg`, `src/app/favicon.ico`, `src/app/apple-icon.png`: approved AA identity in browser and touch icons.

The hero uses the approved `Glowing AI Workflow Network.png` artwork. The showcase uses labeled conceptual architecture diagrams. The header, footer and favicons use the new geometric interlocking AA identity. No screenshot is simulated as production UI. Replace the conceptual showcase visuals with independently supplied application captures when available. Booking, contact submission and live demos are not connected. Scout alone uses the dedicated database and OpenAI connection described below.

## Our Approach and About

Our Approach lives at `/our-approach`, with three permanent pages:
`/our-approach/philosophy`, `/our-approach/ai-architecture`, and
`/our-approach/salesforce`. About remains separate at `/about`.

- Edit the four pages, diagrams and concise Scout source summaries in
  **`src/content/editorial.ts`**. Preserve the typed fields and approved facts.
- The landing page reuses the three-card structure and navigation from
  `src/content/insights.ts`. The legacy filename is internal; the public name is
  Our Approach. Header/footer labels live in `src/content/site.ts`.
- About's existing hero and conceptual architecture diagram remain in
  `src/content/experience.ts`; its new company-focused body uses the editorial file.
- `src/components/editorial/` contains the shared Server Components and scoped CSS
  Module. Brand tokens and site typography remain in `src/app/globals.css`.
- `src/lib/scout/knowledge.ts` selects concise approved summaries from the same
  content source. It does not add full editorial pages to every agent request.
- `next.config.ts` permanently redirects `/insights` and all nested paths to
  `/our-approach`, retaining query parameters. Internal links, canonical metadata,
  and sitemap entries use the new paths.

The pages have no article feeds, publication dates, or bylines. The empty, typed
article registry and existing safe renderer remain available for compatibility;
no articles or publishing schedule were introduced. Its detail URLs also move
under `/our-approach/articles/`, with the same permanent legacy redirects.

Run `npm run lint`, `npx tsc --noEmit`, `node --test tests/*.test.mjs`,
`npm run build`, and `node tests/editorial.browser.mjs http://localhost:3100`
against a running production build. GitHub main automatically deploys to the
existing Vercel Production project after a verified release.

## Visual design and service pages

The shared design system now covers the homepage, full AI Solutions and Salesforce service pages, and the About/Contact/Booking pages. The public palette display and generic home links have been removed. The desktop floating consultation button is omitted; the mobile action avoids duplicating a visible main consultation CTA.

Edit the expanded homepage, diagrams, showcase, footer and secondary pages in `src/content/experience.ts`. The four homepage preview cards are configured in `experience.insights.cards`; Custom Applications currently links to the existing custom-development heading at `/ai-solutions#ai-development-heading`. This homepage card row is independent of the three permanent Our Approach pages. Edit service-page content in `src/content/service-pages.ts`. Core positioning and navigation remain in `src/content/site.ts`. All content remains local and typed.

See [the design and asset guide](docs/design-refinement.md) for the visual rules, missing assets, and instructions for adding authentic application screenshots without altering their UI colors.

## GitHub and Vercel deployment workflow

Local code → Git commit → Push to GitHub → Automatic Vercel deployment.

After each completed change, validate the intended scope, commit to `main`, push to `origin/main`, and verify that the existing Vercel project's automatic deployment reaches **Ready** for that exact commit. Smoke-test the live `.vercel.app` URL and report both the URL and commit SHA. Review and refine on Vercel rather than accumulating uncommitted changes, unless a later task explicitly requests a local-only review.

- Repository: `https://github.com/JD1212/the-augmented-architect-website-2`.
- Production branch: `main`.
- Existing Vercel project: `the-augmented-architect-website-2`, under JD Burkholder's projects.
- Production URL: `https://the-augmented-architect-website-2.vercel.app`.
- Framework preset: Next.js. Use the existing Git integration; do not create another project or deploy a separate CLI upload.

Before pushing, run `npm run lint`, `node --test tests/*.test.mjs`, and `npm run build`. Review the staged files: keep credential-bearing `.env*` files, private keys, `.next/`, `node_modules/`, and `.vercel/` out of Git. Only the credential-free `.env.example` template is allowed. Commit the intended changes, then push to `origin/main` without force-pushing.

Pushes to `main` are production releases. Feature-branch pushes can generate preview deployments through the same Git integration. After a push, confirm Vercel reaches Ready for the exact GitHub commit, inspect build logs, and smoke-test the deployed pages, hero image, navigation and mobile layout. There is no separate hosted test job configured; the automated tests must be run before pushing.

Cloudflare DNS, `theaugmentedarchitect.com`, the old Augmented Architect project, all other Supabase projects and the Augment kernel are outside this deployment workflow. Only the dedicated Scout database is used. No public-domain connection or transfer is part of this release.


## Brand identity

See [the brand identity guide](docs/brand-identity.md) for the transparent SVG monograms, header/footer lockups, favicons, and reproducible asset exports. The live wordmark remains editable HTML in the existing content configuration. Shared brand tokens live in `globals.css`, while logo layout is scoped to `brand.module.css`.

## Scout conversational assistant

Scout appears after a short delay and automatically opens on each homepage visit and refresh, using the existing entrance, portrait panel, and typed greeting. Scrolling and legacy handled-tab flags do not suppress opening. An intentional close is respected for that page visit; a new homepage entry or refresh is eligible again. Opening defers while another dialog/navigation is open, the tab is hidden, or a visitor is editing a field. Session storage does not gate the introduction. Conversation ownership, 24-hour inactivity expiry, persistence, and returning-visitor Continue/New Conversation behavior remain separate and unchanged. Edit interface copy and the four starter prompts in `src/content/assistant.ts`. Replies stream through `/api/scout` and persist in the dedicated database; no conversation is created until a visitor sends a message.

The reusable components live in `src/components/assistant/`: `AssistantLauncher`, `AssistantPanel`, `AssistantAvatar`, and `AssistantMessage`. `useAssistant.ts` retains entrance timing, reduced-motion preferences and greeting sequencing. `useAssistantIntroduction.ts` coordinates per-page introductions with the in-memory visit policy in `src/lib/assistant-introduction.ts`. `useScoutConversation.ts` manages the conversation transport and restoration, while `src/lib/scout/` contains the server-only agent, curated approved knowledge, session authorization, persistence, and shared rate limits. When conversational scheduling is enabled, Scout registers seven native OpenAI Agents SDK tools and explicitly loads the consultation-scheduling SKILL.md. The booking service enforces real availability, owner-bound UI confirmation, secure Gmail verification, cancellation/rescheduling, and idempotent recovery. The shared booking form remains an alternative. See [conversational scheduling](docs/scout-conversational-scheduling.md) for the architecture, skill loader, authorization boundaries, tests, and sanitized real execution trace. Configuration, security boundaries, migrations, deterministic tests and live-model checks are documented in [Scout Phase 1](docs/scout-phase1.md).

Assistant colors, border and shadow tokens live in `src/app/globals.css`. Its scoped layout, character animation and responsive behavior live in `assistant.module.css`. The native dialog includes focus wrapping, Escape dismissal and focus restoration, with immediate greeting/starter display when reduced motion is enabled. On mobile the assistant clears the existing consultation dock and yields to the navigation menu. Root layout mounts it once, preserving the website's pages and content.
