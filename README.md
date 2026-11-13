# The Augmented Architect Website 2.0

Local, responsive Next.js 16 website built with TypeScript, Tailwind CSS 4 and the App Router. The approved reference is `public/reference/homepage-reference.png`.

## Architecture boundaries

The deployment platform is the existing Vercel project `the-augmented-architect-website-2` under JD Burkholder's projects. Website 2.0 remains independent of the existing public domain and other applications.

This repository remains an independent website shell. Do not install Supabase, merge it with the existing Augment application or security kernel, or add agent infrastructure as part of this build. Preserve the approved visual design and homepage scope.

Presentation components, typed content, routes and metadata are separate. Future integrations can be added through server-only modules and App Router route handlers when explicitly requested, without coupling the visual components to external services. No integration scaffolding is needed now.

## Development

```sh
npm install
npm run dev
```

Open http://localhost:3000. Run `npm run lint` and `npm run build` for validation. Use `npm start` to serve a completed production build.

With a production preview running, use `node tests/runtime-comparison.browser.mjs http://localhost:3100` and `node tests/scout-homepage.browser.mjs http://localhost:3100` for the runtime dialogs and homepage/Scout flows. Both require Chromium; set `CHROME_BIN` if it is not autodetected.

## Edit the content

Website shell text, navigation labels, button labels, preview labels, accessibility labels, page copy and SEO titles/descriptions are in **`src/content/site.ts`**. Insights copy and article content are in the dedicated files under `src/content/` described below. Its `SiteContent` type checks the structure. Edit quoted strings and keep the property names intact.

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

The hero uses the approved `Glowing AI Workflow Network.png` artwork. The showcase uses labeled conceptual architecture diagrams. The header, footer and favicons use the new geometric interlocking AA identity. No screenshot is simulated as production UI. Replace the conceptual showcase visuals with independently supplied application captures when available. Booking, contact submission and live demos are not connected. No database or external APIs are configured.

## Insights and article publishing

Insights lives at `/insights`, with category pages at `/insights/philosophy`, `/insights/ai-architecture` and `/insights/salesforce`. Edit introductions, category descriptions, the Philosophy page, empty states and navigation labels for this section in **`src/content/insights.ts`**. The main header link remains in `src/content/site.ts`.

The article registry starts empty. There are no placeholder articles, inferred publication dates or invented author profiles.

### Add an article

1. Create a TypeScript content file such as `src/content/articles/your-article.ts`. Use the `Article` type from `./types`:

   ```ts
   import type { Article } from './types';

   export const article: Article = {
     slug: 'your-article-slug',
     title: 'Your approved article title',
     category: 'philosophy',
     summary: 'Your approved article summary for listings.',
     seoDescription: 'Your approved search and social description.',
     status: 'draft',
     content: [
       { type: 'paragraph', text: 'Your approved article text.' },
     ],
   };
   ```

2. Import that object in `src/content/articles/index.ts` and add it to `articles`:

   ```ts
   import type { Article } from './types';
   import { article } from './your-article';

   export const articles: readonly Article[] = [article];
   ```

3. Choose the category: `philosophy`, `ai-architecture`, or `salesforce`. Slugs must be unique across drafts and published articles, lowercase, and hyphenated. Keep slugs stable once published.
4. Set `status: 'published'` only when the content is ready. Drafts have no public detail page, category card, related-article entry or sitemap entry.
5. Add `publishedDate: 'YYYY-MM-DD'` only when you have an explicitly supplied publication date. Omit the property otherwise. No date or date metadata is generated by default.
6. Run `npm run lint`, `node --test tests/insights.test.mjs` and `npm run build`. Content changes require a new build for production; no new React page component is needed.

Supported content blocks are `paragraph` and `heading` (each with `text`), `quote` (with `text`), and `list` (with `items` and optional `ordered: true`). Text is rendered as text, not raw HTML. Blocks use article-level headings consistently under the page title.

Registry order is the editorial listing order. Related articles use up to three other published articles in the same category. Unique article metadata, canonical URLs, Article Open Graph data, JSON-LD and sitemap entries are generated automatically. Structured data identifies the website as publisher without inventing an author. Set the existing `site.url` to the confirmed production origin before future publication.

The Next.js Cache Components configuration requires a build-time parameter even when the registry is empty. The article route uses a private `__empty__` validation sentinel that resolves to the not-found page; it is never listed or included in the sitemap.

### Insights implementation files

- `src/content/insights.ts`: editable section and category copy, including Philosophy.
- `src/content/articles/types.ts`, `src/content/articles/index.ts`: typed file-based publishing registry.
- `src/lib/articles.ts`: validation, published-article selection, related articles and date formatting.
- `src/lib/article-seo.ts`: article structured data.
- `src/lib/metadata.ts`: shared metadata utility, extended for articles while retaining existing shell metadata.
- `src/components/insights/`: reusable category navigation, category page, article cards, article lists and content renderer.
- `src/app/insights/`: landing page, category routes, dynamic article route, article not-found state and scoped section stylesheet.
- `tests/insights.test.mjs`: publishing and rendering checks using isolated test data, without adding articles to the site.

The existing header and sitemap include the new section. The visual refinement adds homepage previews of the Philosophy and Insights content without changing the publishing architecture. No external services or dependencies were added.


## Visual design and service pages

The shared design system now covers the homepage, full AI Solutions and Salesforce service pages, and the About/Contact/Booking pages. The public palette display and generic home links have been removed. The desktop floating consultation button is omitted; the mobile action avoids duplicating a visible main consultation CTA.

Edit the expanded homepage, diagrams, showcase, footer and secondary pages in `src/content/experience.ts`. The four homepage preview cards are configured in `experience.insights.cards`; Custom Applications currently links to the existing custom-development heading at `/ai-solutions#ai-development-heading`. This homepage card row is independent of the three Insights publishing categories. Edit service-page content in `src/content/service-pages.ts`. Core positioning and navigation remain in `src/content/site.ts`. All content remains local and typed.

See [the design and asset guide](docs/design-refinement.md) for the visual rules, missing assets, and instructions for adding authentic application screenshots without altering their UI colors.

## GitHub and Vercel deployment workflow

Local code → Git commit → Push to GitHub → Automatic Vercel deployment.

After each completed change, validate the intended scope, commit to `main`, push to `origin/main`, and verify that the existing Vercel project's automatic deployment reaches **Ready** for that exact commit. Smoke-test the live `.vercel.app` URL and report both the URL and commit SHA. Review and refine on Vercel rather than accumulating uncommitted changes, unless a later task explicitly requests a local-only review.

- Repository: `https://github.com/JD1212/the-augmented-architect-website-2`.
- Production branch: `main`.
- Existing Vercel project: `the-augmented-architect-website-2`, under JD Burkholder's projects.
- Production URL: `https://the-augmented-architect-website-2.vercel.app`.
- Framework preset: Next.js. Use the existing Git integration; do not create another project or deploy a separate CLI upload.

Before pushing, run `npm run lint`, `node --test tests/*.test.mjs`, and `npm run build`. Review the staged files: keep `.env*`, private keys, `.next/`, `node_modules/`, and `.vercel/` out of Git. Commit the intended changes, then push to `origin/main` without force-pushing.

Pushes to `main` are production releases. Feature-branch pushes can generate preview deployments through the same Git integration. After a push, confirm Vercel reaches Ready for the exact GitHub commit, inspect build logs, and smoke-test the deployed pages, hero image, navigation and mobile layout. There is no separate hosted test job configured; the automated tests must be run before pushing.

Cloudflare DNS, `theaugmentedarchitect.com`, the old Augmented Architect project, Supabase and the Augment kernel are outside this deployment workflow. No public-domain connection or transfer is part of this release.


## Brand identity

See [the brand identity guide](docs/brand-identity.md) for the transparent SVG monograms, header/footer lockups, favicons, and reproducible asset exports. The live wordmark remains editable HTML in the existing content configuration. Shared brand tokens live in `globals.css`, while logo layout is scoped to `brand.module.css`.

## Scout assistant frontend

Scout appears after a short delay and automatically introduces itself on the first quiet homepage visit in a browser tab, using the existing entrance, portrait panel, and typed greeting. Browsing AI Solutions or another page does not consume that homepage opportunity. Clicking, typing, scrolling, switching away, or opening another dialog suppresses the current homepage visit’s automatic introduction without recording a completed introduction. Once Scout actually opens automatically, or a visitor opens or dismisses it manually, the tab flag `aa.scout.introduction.v1` prevents further auto-opening. Existing handled-tab flags remain respected. Closing leaves the original launcher available for reopening the full panel. If session storage is unavailable, Scout opens manually. Edit its name, greeting, supporting message, availability notice and starter destinations in `src/content/assistant.ts`. Its four starters navigate to existing service/contact pages. Free-form input is a local draft: submitting displays a clear coming-soon notice and sends nothing. Drafts are discarded when the panel closes.

The reusable components live in `src/components/assistant/`: `AssistantLauncher`, `AssistantPanel`, `AssistantAvatar`, and `AssistantMessage`. `useAssistant.ts` separates entrance timing, reduced-motion preferences, greeting sequencing and local draft state from presentation. `useAssistantIntroduction.ts` coordinates the once-per-tab introduction with the fail-closed session policy in `src/lib/assistant-introduction.ts`. The typed `AssistantMessageData` model and welcome-message array provide a rendering boundary for future conversation history; no service adapter, endpoint, provider SDK or storage is installed. A future integration should replace the local draft availability action with a separately reviewed transport, and update the availability copy only when messaging actually works.

Assistant colors, border and shadow tokens live in `src/app/globals.css`. Its scoped layout, character animation and responsive behavior live in `assistant.module.css`. The native dialog includes focus wrapping, Escape dismissal and focus restoration, with immediate greeting/starter display when reduced motion is enabled. On mobile the assistant clears the existing consultation dock and yields to the navigation menu. Root layout mounts it once, preserving the website's pages and content.
