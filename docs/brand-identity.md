# AA brand identity

The approved reference is `public/reference/The Augmented Architect Logo Suite.png`. The website uses a clean vector recreation of its large interlocking AA geometry with navy, steel-blue and cyan ribbons. The reference sheet itself is never rendered as a logo.

## Assets

- `public/brand/aa-monogram.svg`: transparent navy/cyan monogram for ivory and light surfaces.
- `public/brand/aa-monogram-inverse.svg`: transparent light/cyan monogram for graphite surfaces.
- `public/brand/logo-header.svg`: standalone transparent monogram and wordmark lockup for light surfaces.
- `public/brand/logo-footer.svg`: standalone transparent monogram and wordmark lockup for dark surfaces.
- `public/brand/app-icon.svg`: rounded navy application icon with the light/cyan AA mark.
- `src/app/icon.svg`: the new SVG favicon, automatically linked by Next.js.
- `src/app/favicon.ico`: 16px, 32px and 48px PNG-backed favicon variants.
- `src/app/apple-icon.png`: 180px Apple touch icon.

The live header and footer share `Brand`, which renders the appropriate transparent monogram alongside a readable two-line HTML wordmark. The company name remains editable in `site.brandLines`; links retain the existing accessible homepage label. Footer uses the light variant. Neither the previous shield graphic nor the old favicon remains in the rendered website.

Geometry and export logic have one source: `scripts/generate-brand-assets.mjs`. Run `node scripts/generate-brand-assets.mjs` to regenerate the assets after an intentional asset change. It uses the existing Sharp dependency and introduces no external service or new package. The vector reconstruction is an approximation of the supplied raster reference, not a claim that original designer source files were supplied.

## Shared styling

Brand colors, action gradients, card borders/surfaces, shadows and focus treatments are centralized in `src/app/globals.css`. Cyan and blue-violet accents are limited to slim service-card highlights, icon surfaces and subtle frame treatments. Buttons keep accessible light text on dark blue backgrounds. Reduced-motion preferences continue to disable transitions.

`src/components/brand.module.css` owns logo layout and small-screen sizing. Shared page and service layouts are preserved; no page-specific copies of button or logo styles are introduced. Existing Insights structures, article metadata and editable copy remain unchanged.

The `Glowing AI Workflow Network.png` hero keeps its existing masks, positioning, headline and CTAs. The approved new eyebrow and supporting paragraph live in `site.hero`, with a quiet contextual Philosophy link. The hero has descriptive alt text and no visible artwork caption. Systems in Action retains a concise illustrative-architecture classification; redundant screenshot-pending badges are removed. Booking/contact availability notices and Insights empty states remain because they explain actual functionality.
