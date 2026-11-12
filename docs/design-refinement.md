# Visual design refinement

The approved reference at `public/reference/homepage-reference.png` remains the visual starting point. The refinement preserves its ivory canvas, graphite engineering surfaces, steel-blue accents, service positioning and split hero composition. It expands the site into a complete consultancy experience without adding external services.

## Shared design system

- Palette: Warm Ivory `#F5F2EA`, Graphite `#252B31`, Steel Blue `#597C9E`, Cool Gray `#E5E9ED`, Soft Charcoal `#535B64`.
- Typography: a local system sans stack with a deliberate display hierarchy, balanced headings, tighter heading tracking and comfortable reading line heights. No font service or font download is required.
- Layout: a 1248px content width, responsive gutters, 88px desktop section spacing and 51–64px spacing on smaller screens. Dense capability grids balance larger editorial headings.
- Contrast: ivory for positioning and explanation, graphite for architecture and the showcase, cool gray for the final consultation invitation.
- Cards: restrained borders, 11–12px corners, thin-line SVG icons, and short hover transitions. Important information remains visible without hover.
- Motion: small color, shadow and position changes only. Reduced-motion preferences disable transitions and smooth scrolling.
- Navigation: sticky header, same-tab links, no dropdown chevrons. Mobile navigation supports Escape and returns focus to its toggle.
- Mobile consultation: the persistent action appears only when a main consultation button is not in view, is omitted on Booking, and occupies a reserved bottom region. It is hidden on desktop.

## Content editing

- `src/content/site.ts`: existing brand, navigation, core homepage copy and SEO configuration.
- `src/content/experience.ts`: new homepage sections, diagram labels, showcase examples, About/Contact/Booking copy, footer and consultation invitation.
- `src/content/service-pages.ts`: complete AI Solutions and Salesforce landing-page copy.
- `src/content/insights.ts` and `src/content/articles/`: existing Insights copy and publishing system, unchanged in structure.
- `src/app/globals.css`: shared visual tokens, layouts and responsive behavior.
- `src/app/insights/insights.css`: section styles using the shared tokens.

## Missing assets

Only the composite reference was independently available in this repository. It is not rendered as page content, cropped into product screenshots, or used as a background.

To finish the authentic application showcase, supply:

1. An approved screenshot of the actual connected-business/application overview, preferably at least 1600px wide.
2. An approved screenshot of the actual agent workspace or agent experience, preferably at least 1600px wide.
The approved logo suite has since been supplied and recreated as clean vectors. See `docs/brand-identity.md`; no replacement logo is currently missing.

Application captures should be approved for public display and exclude credentials or private customer information. Preserve their original UI colors. The website currently presents labeled conceptual diagrams instead of simulated production UI.

### Add a real showcase screenshot

Place the approved image in `public/images/`, then update the relevant `experience.showcase.examples` entry:

```ts
image: {
  src: '/images/your-approved-capture.png',
  alt: 'An accurate description of the actual application screen.',
  width: 1600, // use the real pixel width
  height: 1000, // use the real pixel height
},
```

The renderer automatically replaces the architecture diagram with the image. It uses `next/image`, preserves the image's aspect ratio, and applies no color filters or tint overlays. Supply actual dimensions and accurate alt text.

## Review and validation

Run `npm run lint`, `node --test tests/*.test.mjs` and `npm run build`. Use `npm run dev` for local review.

Review `/`, `/ai-solutions`, `/salesforce`, the secondary pages and Insights at desktop, tablet and mobile widths. Check the sticky header, anchor offsets, menu keyboard behavior, service-card routes, page scrolling and mobile CTA behavior. Full-page captures of the mobile content expand the scroll viewport for documentation; separate viewport captures show the actual mobile header and consultation behavior.

No deployment, Git remote, domain, Vercel or external-service settings are part of this refinement.
