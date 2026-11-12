# Homepage hero artwork

This refinement is scoped to the homepage Hero component. The header, logo, other homepage sections, secondary routes, publishing system and SEO are unchanged.

## Asset and provenance

- Project asset: `public/images/hero-workstation.png` (1536 × 1024 PNG).
- Created with the built-in `image_gen` tool, using the imagegen skill. This is conceptual workstation artwork, not a screenshot of a live product.
- The approved composite reference informed the composition. No part of that screenshot is rendered as page content.
- All labels, copy, CTAs, alt text and captions are editable HTML/content fields. The artwork contains no text or logos.
- Asset settings, alt text and caption: `experience.hero.artwork` in `src/content/experience.ts`.
- Core headline, copy and CTA labels/destinations remain in `src/content/site.ts`.

## CSS architecture

`src/app/globals.css` remains the shared design-system stylesheet: palette variables, font families, heading rules, shared components, borders, shadows and responsive shared layouts. A reusable spacing scale and subtle-border token were added there without changing the existing shared declarations.

Homepage-only composition rules that previously lived across global breakpoints were removed and consolidated in `src/components/hero.module.css`. The module consumes global tokens and handles the artwork sizing, optical edge masks, caption placement and responsive composition. Shared `.hero-description` and `.hero-actions` rules remain global because service pages use them too. The shared architecture-diagram component and its styles are untouched.

No inline style objects, animated effects, new global component overrides, dependencies or external services were introduced.

The existing custom Tailwind loader in `next.config.ts` now excludes `.module.css` files so Next.js can compile scoped class exports natively. Its behavior for existing global stylesheets is unchanged; this is a local build compatibility adjustment, not a hosting-setting change.

## Generation prompt

> Use case: stylized-concept. Asset type: dedicated homepage hero illustration for an enterprise software architecture consultancy, NOT an application screenshot.
> Create premium art-directed photorealistic 3D workstation artwork. A beautiful graphite and brushed-metal ultrawide desktop monitor on a thin sculptural stand, with an elegant slim laptop partly in front on the lower left, sitting on an ivory architectural desktop that disappears into an atmospheric warm ivory studio background. Three-quarter view, restrained editorial product photography with sophisticated real materials and believable soft shadows. The monitor is the main object, occupying the center-right. The laptop is smaller, lower foreground, with convincing physical depth. The monitor display contains a sophisticated abstract blue-and-ivory connected data fabric: fine softly luminous curves and architectural light paths, tiny restrained nodes and layered translucent planes, expressive of intelligent connected enterprise systems. It must NOT be a conventional dashboard, box-and-arrow flowchart, or an actual product UI. No readable content on either display. A few very subtle pale-blue connection paths extend into the space between devices with calm luminous highlights, not excessive neon. Background is spacious, softly lit, warm ivory (#F5F2EA), with a faint steel-blue atmospheric wash behind the hardware. Graphite #252B31, steel blue #597C9E and cool gray #E5E9ED. Left and bottom edges of the entire scene must dissolve naturally into clean warm ivory, no enclosing box, no frame, no hard background rectangle. All devices fully contained inside the image, with approximately 12% negative space around edges so nothing important will crop on a responsive website. Frame wide landscape 3:2, hardware fills approximately 75% of frame, front desk level near lower fifth. Soft daylight from upper left, subtle pale-blue reflections and realistic material depth. This is bespoke sophisticated technology consultancy artwork, not generic AI stock art.
> Absolutely NO text, NO letters or numbers, NO logos including Salesforce, NO typography, NO branding, NO watermark, NO brain, NO robot, NO human, NO AI chip badge, NO floating UI panels, NO faux terminal/code, NO neon cyberpunk, NO giant glowing orbs, NO clutter or plants. All actual website copy and service labels will be separate editable HTML.

## Asset replacement

An approved alternate workstation illustration can replace the generated image by updating `experience.hero.artwork`. Keep the image text-free, preserve its real dimensions and aspect ratio, and leave website copy in HTML. The original logo and application screenshots requested for other sections are outside this hero-only task.
